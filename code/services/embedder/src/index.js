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
        headers: {
          Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_MS,
      }
    );
    vector = response.data.data[0].embedding;
  } catch (err) {
    if (!isNotFoundError(err) || primaryModel === DEFAULT_EMBED_MODEL) {
      throw err;
    }

    console.warn(`[Embedder] Model ${primaryModel} not found. Retrying with ${DEFAULT_EMBED_MODEL}`);
    const fallbackResponse = await _axios2.default.post(
      `${NEBIUS_BASE_URL}/embeddings`,
      {
        model: DEFAULT_EMBED_MODEL,
        input: payloadText,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: HTTP_TIMEOUT_MS,
      }
    );
    vector = fallbackResponse.data.data[0].embedding;
  }

  await redis.setex(cacheKey, 86400, JSON.stringify(vector)); // Cache 24h
  return vector;
}

async function embedResume(payload) {
  if (!payload || typeof (payload ).parsedText !== "string") {
    return;
  }

  const { resumeId, userId, parsedText, jobId } = payload;
  console.log(`[Embedder] Generating embedding for resume ${resumeId}`);

  try {
    const existing = await _db.Resume.findById(resumeId);
    if (!existing) {
      console.warn(`[Embedder] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }

    await _db.Resume.updateOne({ _id: resumeId }, { status: "EMBEDDING" });

    const resumeVector = await generateEmbedding(parsedText);

    await _db.Resume.updateOne(
      { _id: resumeId },
      { resumeVector, status: "EMBEDDED" }
    );

    const event = { resumeId, userId, resumeVector, jobId };
    await _kafka.publishEvent.call(void 0, _kafka.TOPICS.EMBEDDINGS_GENERATED, event );
    console.log(`[Embedder] ✅ Embedding for resume ${resumeId} stored`);
  } catch (err) {
    console.error(`[Embedder] ❌ Error embedding ${resumeId}:`, err);
    await _db.Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Embedder Service] Starting...");
  await _db.connectDB.call(void 0, );
  startHealthServer("Embedder Service");
  await _kafka.createConsumer.call(void 0, 
    `${process.env.KAFKA_GROUP_ID_PREFIX}embedder`,
    _kafka.TOPICS.RESUME_PARSED,
    (payload) => embedResume(payload )
  );
  console.log("[Embedder Service] ✅ Listening for resume_parsed events");
}

main().catch(console.error);
