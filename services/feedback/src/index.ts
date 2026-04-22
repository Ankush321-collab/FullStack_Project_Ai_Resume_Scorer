import dotenv from "dotenv";
import http from "http";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer } from "../../../backend/config/kafka";
import { Resume, Job, connectDB } from "../../../backend/config/db";
import { TOPICS } from "../../../backend/config/kafka";
import type { MatchCompletedEvent, NebiusChatResponse } from "../../../backend/types";

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 30000);

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

function buildFallbackFeedback(skillGap: string[]): string {
  const topGaps = skillGap.slice(0, 8);
  const gapLine = topGaps.length > 0 ? topGaps.join(", ") : "No major skill gaps detected.";

  return [
    "Quick Resume Feedback",
    "",
    "1) Improve bullet impact:",
    "- Start bullets with strong action verbs and add measurable outcomes (%, $, time saved).",
    "- Keep each bullet focused on one achievement with clear context and result.",
    "",
    "2) Keywords to target:",
    `- ${gapLine}`,
    "",
    "3) Structure tips:",
    "- Keep summary + core skills near top.",
    "- Group projects/experience by relevance to the target role.",
    "- Keep formatting ATS-safe (simple headings, no complex tables).",
  ].join("\n");
}

async function generateFeedback(
  parsedText: string,
  jobDescription: string,
  skillGap: string[]
): Promise<string> {
  const systemPrompt = `You are an expert resume coach and ATS optimization specialist. 
Analyze the resume and job description, then provide:
1. 3-5 specific resume bullet improvements
2. Missing keywords to add for ATS
3. Structural tips
Keep responses concise and actionable.`;

  const userPrompt = `
RESUME TEXT:
${parsedText.slice(0, 3000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 1500)}

SKILL GAPS DETECTED:
${skillGap.join(", ")}

Provide targeted, personalized feedback to improve this resume for the job.`;

  const response = await axios.post<NebiusChatResponse>(
    `${process.env.NEBIUS_BASE_URL}/chat/completions`,
    {
      model: process.env.NEBIUS_LLM_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 550,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: HTTP_TIMEOUT_MS,
    }
  );

  return response.data.choices[0].message.content;
}

async function processFeedback(payload: MatchCompletedEvent): Promise<void> {
  const { resumeId, jobId, skillGap } = payload;
  console.log(`[Feedback] Generating AI feedback for resume ${resumeId}`);

  // Check cache first. We keep both per-resume and per-resume-job keys for compatibility.
  const resumeCacheKey = `feedback:${resumeId}`;
  const cacheKey = `feedback:${resumeId}:${jobId}`;
  const cached = (await redis.get(resumeCacheKey)) || (await redis.get(cacheKey));
  if (cached && cached.trim()) {
    console.log(`[Feedback] Using cached feedback for ${resumeId}`);
    return;
  }

  const lockKey = `feedback:lock:${resumeId}`;
  const lockAcquired = await redis.set(lockKey, "1", "EX", 120, "NX");
  if (!lockAcquired) {
    console.log(`[Feedback] Another worker is generating feedback for ${resumeId}, skipping duplicate run`);
    return;
  }

  try {
    const [resume, job] = await Promise.all([
      Resume.findById(resumeId),
      Job.findById(jobId),
    ]);

    if (!resume) {
      console.warn(`[Feedback] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }

    if (resume?.feedback && resume.feedback.trim()) {
      await redis.setex(resumeCacheKey, 43200, resume.feedback);
      await redis.setex(cacheKey, 43200, resume.feedback);
      console.log(`[Feedback] Existing feedback already present for ${resumeId}, skipping regeneration`);
      return;
    }

    if (!resume?.parsedText || !job?.description) {
      throw new Error("Missing resume text or job description");
    }

    let feedback = "";
    try {
      feedback = await generateFeedback(resume.parsedText, job.description, skillGap);
    } catch (llmErr) {
      console.warn(`[Feedback] LLM generation failed, using fallback for ${resumeId}:`, (llmErr as Error).message);
      feedback = buildFallbackFeedback(skillGap);
    }

    await Resume.updateOne(
      { _id: resumeId },
      { feedback }
    );

    // Cache for 12 hours
    await redis.setex(resumeCacheKey, 43200, feedback);
    await redis.setex(cacheKey, 43200, feedback);
    console.log(`[Feedback] ✅ AI feedback generated and saved for resume ${resumeId}`);
  } catch (err) {
    console.error(`[Feedback] ❌ Error generating feedback:`, err);
  } finally {
    await redis.del(lockKey);
  }
}

async function main() {
  console.log("[Feedback Service] Starting...");
  await connectDB();
  startHealthServer("Feedback Service");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}feedback`,
    TOPICS.MATCH_COMPLETED,
    (payload) => processFeedback(payload as unknown as MatchCompletedEvent)
  );
  console.log("[Feedback Service] ✅ Listening for match_completed events");
}

main().catch(console.error);
