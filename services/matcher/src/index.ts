import dotenv from "dotenv";
import http from "http";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer, publishEvent, TOPICS } from "../../../backend/config/kafka";
import { Resume, Job, MatchResult, connectDB } from "../../../backend/config/db";
import type { SkillExtractedEvent, MatchCompletedEvent, NebiusEmbeddingResponse } from "../../../backend/types";

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 20000);
const CLICKHOUSE_TIMEOUT_MS = Number(process.env.CLICKHOUSE_TIMEOUT_MS || 3000);
const CLICKHOUSE_ENABLED = process.env.CLICKHOUSE_ENABLED !== "false";
const NEBIUS_BASE_URL = (process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/+$/, "");
const DEFAULT_EMBED_MODEL = "Qwen/Qwen3-Embedding-8B";

function isNotFoundError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

function startHealthServer(serviceName: string): void {
  const port = Number(process.env.PORT || 0);
  if (!port) return;

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: serviceName }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[${serviceName}] Health server listening on port ${port}`);
  });
}

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#", "ruby", "php",
  "swift", "kotlin", "scala", "r", "matlab",
  "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
  "redux", "graphql", "apollo",
  "node.js", "express", "fastapi", "django", "flask", "spring boot", "nestjs",
  "rest api", "grpc", "websocket",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "clickhouse",
  "cassandra", "dynamodb", "sqlite",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
  "ci/cd", "github actions", "jenkins",
  "machine learning", "deep learning", "nlp", "pytorch", "tensorflow", "scikit-learn",
  "llm", "transformers", "langchain",
  "kafka", "rabbitmq", "microservices", "system design", "agile", "scrum",
  "git", "linux", "bash", "sql", "nosql",
];

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_KEYWORDS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return Array.from(found);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calibratedMatchPercentage(
  semanticSimilarity: number,
  overlapRatio: number,
  confidence: number
): number {
  // Convert cosine from [-1, 1] to [0, 100] to avoid overly low raw scores.
  const semanticPct = ((clamp(semanticSimilarity, -1, 1) + 1) / 2) * 100;
  const overlapPct = clamp(overlapRatio, 0, 1) * 100;
  const confidencePct = clamp(confidence, 0, 1) * 100;

  // Weighted blend favors semantics but rewards concrete skill overlap.
  const weighted = semanticPct * 0.55 + overlapPct * 0.35 + confidencePct * 0.1;

  // Light calibration boost for realistic market-facing percentages.
  const calibrated = weighted + 8;
  return clamp(Math.round(calibrated * 100) / 100, 0, 100);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${Buffer.from(text.slice(0, 200)).toString("base64")}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as number[];

  const primaryModel = process.env.NEBIUS_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const payloadText = text.slice(0, 8000);

  let vector: number[];
  try {
    const response = await axios.post<NebiusEmbeddingResponse>(
      `${NEBIUS_BASE_URL}/embeddings`,
      {
        model: primaryModel,
        input: payloadText,
      },
      {
        headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MS,
      }
    );
    vector = response.data.data[0].embedding;
  } catch (err) {
    if (!isNotFoundError(err) || primaryModel === DEFAULT_EMBED_MODEL) {
      throw err;
    }

    console.warn(`[Matcher] Model ${primaryModel} not found. Retrying with ${DEFAULT_EMBED_MODEL}`);
    const fallbackResponse = await axios.post<NebiusEmbeddingResponse>(
      `${NEBIUS_BASE_URL}/embeddings`,
      {
        model: DEFAULT_EMBED_MODEL,
        input: payloadText,
      },
      {
        headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`, "Content-Type": "application/json" },
        timeout: HTTP_TIMEOUT_MS,
      }
    );
    vector = fallbackResponse.data.data[0].embedding;
  }

  await redis.setex(cacheKey, 86400, JSON.stringify(vector));
  return vector;
}

async function writeToClickHouse(payload: MatchCompletedEvent): Promise<void> {
  if (!CLICKHOUSE_ENABLED || !process.env.CLICKHOUSE_HOST) return;

  try {
    const body = `${payload.resumeId}\t${payload.jobId}\t${payload.userId}\t${payload.score}\t${payload.matchPercentage}\t${payload.confidence}\t${new Date().toISOString().replace("T", " ").split(".")[0]}\n`;
    
    const headers: Record<string, string> = { "Content-Type": "text/plain" };
    
    if (process.env.CLICKHOUSE_USER && process.env.CLICKHOUSE_PASSWORD) {
      const auth = Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    await axios.post(
      `${process.env.CLICKHOUSE_HOST}/?query=INSERT+INTO+resume_analytics.resume_scores+(id,resume_id,job_id,user_id,score,match_pct,confidence,created_at)+FORMAT+TabSeparated`,
      `${Date.now()}\t${body}`,
      { headers, timeout: CLICKHOUSE_TIMEOUT_MS }
    );
  } catch (err) {
    console.warn("[Matcher] ClickHouse write failed (non-fatal):", (err as Error).message);
  }
}

async function matchResumes(payload: SkillExtractedEvent): Promise<void> {
  if (!payload || !Array.isArray((payload as { skills?: unknown }).skills)) {
    return;
  }

  const { resumeId, userId, skills: resumeSkills, jobId: targetJobId } = payload;
  console.log(`[Matcher] Running match for resume ${resumeId}`);

  try {
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      console.warn(`[Matcher] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }
    if (!resume.parsedText) throw new Error("No parsedText for resume");

    const maxJobs = Number(process.env.MATCHER_MAX_JOBS || "0");
    let jobs;
    if (targetJobId) {
      jobs = await Job.find({ _id: targetJobId }).populate('skills');
    } else {
      let query = Job.find({}).populate('skills');
      if (Number.isFinite(maxJobs) && maxJobs > 0) {
        query = query.limit(maxJobs);
      }
      jobs = await query;
    }

    if (jobs.length === 0) {
      console.log(`[Matcher] No jobs found, skipping match for ${resumeId}`);
      await Resume.updateOne({ _id: resumeId }, { status: "COMPLETED" });
      return;
    }

    const resumeVector = (resume.resumeVector && resume.resumeVector.length > 0)
      ? resume.resumeVector
      : await generateEmbedding(resume.parsedText);

    for (const job of jobs) {
      let jobVector = job.jobVector;
      if (!jobVector || jobVector.length === 0) {
        jobVector = await generateEmbedding(job.description);
        await Job.updateOne({ _id: job._id }, { jobVector });
      }

      const similarity = cosineSimilarity(resumeVector, jobVector);

      const jobSkillNames = job.skills.length > 0
        ? (job.skills as any[]).map((s) => s.name)
        : extractSkillsFromText(job.description);

      const resumeSkillSet = new Set(resumeSkills.map(normalizeSkill));
      const skillGap = jobSkillNames
        .map(normalizeSkill)
        .filter((s, idx, arr) => arr.indexOf(s) === idx)
        .filter((s) => !resumeSkillSet.has(s));

      const uniqueJobSkills = jobSkillNames
        .map(normalizeSkill)
        .filter((s, idx, arr) => arr.indexOf(s) === idx);

      const matchedSkillsCount = uniqueJobSkills.filter((s) => resumeSkillSet.has(s)).length;
      const overlapRatio = uniqueJobSkills.length > 0
        ? matchedSkillsCount / uniqueJobSkills.length
        : clamp(similarity, 0, 1);

      const confidence = jobSkillNames.length > 0
        ? 1 - skillGap.length / jobSkillNames.length
        : similarity;

      const matchPercentage = calibratedMatchPercentage(similarity, overlapRatio, confidence);
      const score = matchPercentage;

      const cacheKey = `match:${resumeId}:${job._id}`;
      const matchData = { score, matchPercentage, skillGap, confidence };
      await redis.setex(cacheKey, 3600, JSON.stringify(matchData));

      await MatchResult.findOneAndUpdate(
        { resumeId, jobId: job._id },
        { score, matchPercentage, skillGap, confidence },
        { upsert: true, new: true }
      );

      const event: MatchCompletedEvent = {
        resumeId, jobId: job._id.toString(), userId, score, matchPercentage, skillGap, confidence,
      };
      void writeToClickHouse(event);
      await publishEvent(TOPICS.MATCH_COMPLETED, event as unknown as Record<string, unknown>);
    }

    await Resume.updateOne({ _id: resumeId }, { status: "COMPLETED" });
    console.log(`[Matcher] ✅ Matched resume ${resumeId} against ${jobs.length} jobs`);
  } catch (err) {
    console.error(`[Matcher] ❌ Error:`, err);
    await Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Matcher Service] Starting...");
  await connectDB();
  startHealthServer("Matcher Service");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}matcher`,
    TOPICS.SKILL_EXTRACTED,
    (payload) => matchResumes(payload as unknown as SkillExtractedEvent)
  );
  console.log("[Matcher Service] ✅ Listening for skill_extracted events");
}

main().catch(console.error);
