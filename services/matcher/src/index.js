"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _dotenv = require('dotenv'); var _dotenv2 = _interopRequireDefault(_dotenv);
var _http = require('http'); var _http2 = _interopRequireDefault(_http);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _ioredis = require('ioredis'); var _ioredis2 = _interopRequireDefault(_ioredis);
var _kafka = require('../../../backend/config/kafka');
var _db = require('../../../backend/config/db');


_dotenv2.default.config({ path: _path2.default.join(__dirname, "../../../backend/.env") });

const redis = new (0, _ioredis2.default)(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 20000);
const CLICKHOUSE_TIMEOUT_MS = Number(process.env.CLICKHOUSE_TIMEOUT_MS || 3000);
const CLICKHOUSE_ENABLED = process.env.CLICKHOUSE_ENABLED !== "false";
const NEBIUS_BASE_URL = (process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/+$/, "");
const DEFAULT_EMBED_MODEL = "Qwen/Qwen3-Embedding-8B";

function isNotFoundError(err) {
  return _axios2.default.isAxiosError(err) && _optionalChain([err, 'access', _ => _.response, 'optionalAccess', _2 => _2.status]) === 404;
}

function startHealthServer(serviceName) {
  const port = Number(process.env.PORT || 0);
  if (!port) return;

  const server = _http2.default.createServer((req, res) => {
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

function normalizeSkill(s) {
  return s.trim().toLowerCase();
}

function extractSkillsFromText(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const skill of SKILL_KEYWORDS) {
    if (lower.includes(skill)) found.add(skill);
  }
  return Array.from(found);
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calibratedMatchPercentage(
  semanticSimilarity,
  overlapRatio,
  confidence
) {
  // Convert cosine from [-1, 1] to [0, 100] to avoid overly low raw scores.
  const semanticPct = ((clamp(semanticSimilarity, -1, 1) + 1) / 2) * 100;
  const overlapPct = clamp(overlapRatio, 0, 1) * 100;
  const confidencePct = clamp(confidence, 0, 1) * 100;

  // Weighted blend: Skills are high priority (50%), Semantics (40%), Confidence (10%)
  const weighted = (semanticPct * 0.40) + (overlapPct * 0.50) + (confidencePct * 0.10);

  // Apply a non-linear boost for high semantic similarity
  let finalScore = weighted;
  if (semanticPct > 85) finalScore += 5;
  if (overlapPct > 90) finalScore += 3;

  const matchPercentage = clamp(Math.round(finalScore * 10) / 10, 0, 100);

  // Generate basis text
  let basis = "";
  if (overlapPct > 80) {
    basis = "Strong technical alignment with core job requirements.";
  } else if (semanticPct > 80) {
    basis = "Excellent semantic match; experience aligns well with the role context.";
  } else if (overlapPct < 40) {
    basis = "Significant skill gaps detected relative to the job description.";
  } else {
    basis = "Moderate alignment; some key technical requirements are missing.";
  }

  return { matchPercentage, basis };
}

async function generateEmbedding(text) {
  const cacheKey = `embed:${Buffer.from(text.slice(0, 200)).toString("base64")}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) ;

  const primaryModel = process.env.NEBIUS_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const payloadText = text.slice(0, 8000);

  let vector;
  try {
    const response = await _axios2.default.post(
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
    const fallbackResponse = await _axios2.default.post(
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

async function writeToClickHouse(payload) {
  if (!CLICKHOUSE_ENABLED || !process.env.CLICKHOUSE_HOST) return;

  try {
    const body = `${payload.resumeId}\t${payload.jobId}\t${payload.userId}\t${payload.score}\t${payload.matchPercentage}\t${payload.confidence}\t${new Date().toISOString().replace("T", " ").split(".")[0]}\n`;
    
    const headers = { "Content-Type": "text/plain" };
    
    if (process.env.CLICKHOUSE_USER && process.env.CLICKHOUSE_PASSWORD) {
      const auth = Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    await _axios2.default.post(
      `${process.env.CLICKHOUSE_HOST}/?query=INSERT+INTO+resume_analytics.resume_scores+(id,resume_id,job_id,user_id,score,match_pct,confidence,created_at)+FORMAT+TabSeparated`,
      `${Date.now()}\t${body}`,
      { headers, timeout: CLICKHOUSE_TIMEOUT_MS }
    );
  } catch (err) {
    console.warn("[Matcher] ClickHouse write failed (non-fatal):", (err ).message);
  }
}

async function matchResumes(payload) {
  if (!payload || !Array.isArray((payload ).skills)) {
    return;
  }

  const { resumeId, userId, skills: resumeSkills, jobId: targetJobId } = payload;
  console.log(`[Matcher] Running match for resume ${resumeId}`);

  try {
    const resume = await _db.Resume.findById(resumeId);
    if (!resume) {
      console.warn(`[Matcher] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }
    if (!resume.parsedText) throw new Error("No parsedText for resume");

    const maxJobs = Number(process.env.MATCHER_MAX_JOBS || "0");
    let jobs;
    if (targetJobId) {
      jobs = await _db.Job.find({ _id: targetJobId }).populate('skills');
    } else {
      let query = _db.Job.find({}).populate('skills');
      if (Number.isFinite(maxJobs) && maxJobs > 0) {
        query = query.limit(maxJobs);
      }
      jobs = await query;
    }

    if (jobs.length === 0) {
      console.log(`[Matcher] No jobs found, skipping match for ${resumeId}`);
      await _db.Resume.updateOne({ _id: resumeId }, { status: "COMPLETED" });
      return;
    }

    const resumeVector = (resume.resumeVector && resume.resumeVector.length > 0)
      ? resume.resumeVector
      : await generateEmbedding(resume.parsedText);

    for (const job of jobs) {
      let jobVector = job.jobVector;
      if (!jobVector || jobVector.length === 0) {
        jobVector = await generateEmbedding(job.description);
        await _db.Job.updateOne({ _id: job._id }, { jobVector });
      }

      const similarity = cosineSimilarity(resumeVector, jobVector);

      const jobSkillNames = job.skills.length > 0
        ? (job.skills ).map((s) => s.name)
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

      const { matchPercentage, basis } = calibratedMatchPercentage(similarity, overlapRatio, confidence);
      const score = matchPercentage;

      const cacheKey = `match:${resumeId}:${job._id}`;
      const matchData = { score, matchPercentage, skillGap, confidence, basis };
      await redis.setex(cacheKey, 3600, JSON.stringify(matchData));

      await _db.MatchResult.findOneAndUpdate(
        { resumeId, jobId: job._id },
        { score, matchPercentage, skillGap, confidence, basis },
        { upsert: true, new: true }
      );

      const event = {
        resumeId, jobId: job._id.toString(), userId, score, matchPercentage, skillGap, confidence,
      };
      void writeToClickHouse(event);
      await _kafka.publishEvent.call(void 0, _kafka.TOPICS.MATCH_COMPLETED, event );
    }

    await _db.Resume.updateOne({ _id: resumeId }, { status: "COMPLETED" });
    console.log(`[Matcher] ✅ Matched resume ${resumeId} against ${jobs.length} jobs`);
  } catch (err) {
    console.error(`[Matcher] ❌ Error:`, err);
    await _db.Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Matcher Service] Starting...");
  await _db.connectDB.call(void 0, );
  startHealthServer("Matcher Service");
  await _kafka.createConsumer.call(void 0, 
    `${process.env.KAFKA_GROUP_ID_PREFIX}matcher`,
    _kafka.TOPICS.SKILL_EXTRACTED,
    (payload) => matchResumes(payload )
  );
  console.log("[Matcher Service] ✅ Listening for skill_extracted events");
}

main().catch(console.error);
