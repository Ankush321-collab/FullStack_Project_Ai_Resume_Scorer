import dotenv from "dotenv";
import http from "http";
import path from "path";
import axios from "axios";
import Redis from "ioredis";
import { createConsumer, publishEvent, TOPICS } from "../../../backend/config/kafka";
import { Resume, connectDB } from "../../../backend/config/db";
import type {
  ResumeParsedEvent,
  EmbeddingsGeneratedEvent,
  NebiusEmbeddingResponse,
} from "../../../backend/types";

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 20000);
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
    const fallbackResponse = await axios.post<NebiusEmbeddingResponse>(
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

async function embedResume(payload: ResumeParsedEvent): Promise<void> {
  if (!payload || typeof (payload as { parsedText?: unknown }).parsedText !== "string") {
    return;
  }

  const { resumeId, userId, parsedText, jobId } = payload;
  console.log(`[Embedder] Generating embedding for resume ${resumeId}`);

  try {
    const existing = await Resume.findById(resumeId);
    if (!existing) {
      console.warn(`[Embedder] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }

    await Resume.updateOne({ _id: resumeId }, { status: "EMBEDDING" });

    const resumeVector = await generateEmbedding(parsedText);

    await Resume.updateOne(
      { _id: resumeId },
      { resumeVector, status: "EMBEDDED" }
    );

    const event: EmbeddingsGeneratedEvent = { resumeId, userId, resumeVector, jobId };
    await publishEvent(TOPICS.EMBEDDINGS_GENERATED, event as unknown as Record<string, unknown>);
    console.log(`[Embedder] ✅ Embedding for resume ${resumeId} stored`);
  } catch (err) {
    console.error(`[Embedder] ❌ Error embedding ${resumeId}:`, err);
    await Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Embedder Service] Starting...");
  await connectDB();
  startHealthServer("Embedder Service");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}embedder`,
    TOPICS.RESUME_PARSED,
    (payload) => embedResume(payload as unknown as ResumeParsedEvent)
  );
  console.log("[Embedder Service] ✅ Listening for resume_parsed events");
}

main().catch(console.error);
