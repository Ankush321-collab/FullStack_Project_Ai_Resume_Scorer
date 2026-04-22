"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _dotenv = require('dotenv'); var _dotenv2 = _interopRequireDefault(_dotenv);
var _http = require('http'); var _http2 = _interopRequireDefault(_http);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _ioredis = require('ioredis'); var _ioredis2 = _interopRequireDefault(_ioredis);
var _kafka = require('../../../backend/config/kafka');
var _db = require('../../../backend/config/db');



_dotenv2.default.config({ path: _path2.default.join(__dirname, "../../../backend/.env") });

const redis = new (0, _ioredis2.default)(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 30000);

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

function buildFallbackFeedback(skillGap) {
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
  parsedText,
  jobDescription,
  skillGap
) {
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

  const response = await _axios2.default.post(
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

async function processFeedback(payload) {
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
      _db.Resume.findById(resumeId),
      _db.Job.findById(jobId),
    ]);

    if (!resume) {
      console.warn(`[Feedback] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }

    if (_optionalChain([resume, 'optionalAccess', _ => _.feedback]) && resume.feedback.trim()) {
      await redis.setex(resumeCacheKey, 43200, resume.feedback);
      await redis.setex(cacheKey, 43200, resume.feedback);
      console.log(`[Feedback] Existing feedback already present for ${resumeId}, skipping regeneration`);
      return;
    }

    if (!_optionalChain([resume, 'optionalAccess', _2 => _2.parsedText]) || !_optionalChain([job, 'optionalAccess', _3 => _3.description])) {
      throw new Error("Missing resume text or job description");
    }

    let feedback = "";
    try {
      feedback = await generateFeedback(resume.parsedText, job.description, skillGap);
    } catch (llmErr) {
      console.warn(`[Feedback] LLM generation failed, using fallback for ${resumeId}:`, (llmErr ).message);
      feedback = buildFallbackFeedback(skillGap);
    }

    await _db.Resume.updateOne(
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
  await _db.connectDB.call(void 0, );
  startHealthServer("Feedback Service");
  await _kafka.createConsumer.call(void 0, 
    `${process.env.KAFKA_GROUP_ID_PREFIX}feedback`,
    _kafka.TOPICS.MATCH_COMPLETED,
    (payload) => processFeedback(payload )
  );
  console.log("[Feedback Service] ✅ Listening for match_completed events");
}

main().catch(console.error);
