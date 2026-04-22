import dotenv from "dotenv";
import http from "http";
import path from "path";
import nlp from "compromise";
import { createConsumer, publishEvent, TOPICS } from "../../../backend/config/kafka";
import { Resume, Skill, connectDB } from "../../../backend/config/db";
import type { EmbeddingsGeneratedEvent, SkillExtractedEvent } from "../../../backend/types";

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

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

// Comprehensive tech skill keyword dictionary
const SKILL_KEYWORDS = [
  // Languages
  "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#", "ruby", "php",
  "swift", "kotlin", "scala", "r", "matlab",
  // Frontend
  "react", "next.js", "vue", "angular", "svelte", "html", "css", "tailwind",
  "redux", "graphql", "apollo",
  // Backend
  "node.js", "express", "fastapi", "django", "flask", "spring boot", "nestjs",
  "rest api", "grpc", "websocket",
  // Databases
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "clickhouse",
  "cassandra", "dynamodb", "sqlite",
  // Cloud & DevOps
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
  "ci/cd", "github actions", "jenkins",
  // AI/ML
  "machine learning", "deep learning", "nlp", "pytorch", "tensorflow", "scikit-learn",
  "llm", "transformers", "langchain",
  // Other
  "kafka", "rabbitmq", "microservices", "system design", "agile", "scrum",
  "git", "linux", "bash", "sql", "nosql",
];

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found = new Set<string>();

  for (const skill of SKILL_KEYWORDS) {
    if (lowerText.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  }

  // NER via compromise
  const doc = nlp(text);
  const nouns = doc.nouns().out("array") as string[];
  for (const noun of nouns) {
    const lower = noun.toLowerCase().trim();
    if (SKILL_KEYWORDS.includes(lower) && lower.length > 1) {
      found.add(lower);
    }
  }

  return Array.from(found);
}

async function extractAndStoreSkills(payload: EmbeddingsGeneratedEvent): Promise<void> {
  const candidate = payload as unknown as { resumeVector?: unknown; skills?: unknown };
  if (!Array.isArray(candidate.resumeVector) || Array.isArray(candidate.skills)) {
    return;
  }

  const { resumeId, userId, jobId } = payload;
  console.log(`[SkillExtractor] Extracting skills for resume ${resumeId}`);

  try {
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      console.warn(`[SkillExtractor] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }
    if (!resume.parsedText) throw new Error("No parsed text found");

    const skillNames = extractSkills(resume.parsedText);
    const skillIds = [];

    for (const name of skillNames) {
      const skill = await Skill.findOneAndUpdate(
        { name },
        { name },
        { upsert: true, new: true }
      );
      skillIds.push(skill._id);
    }

    await Resume.updateOne(
      { _id: resumeId },
      { skills: skillIds, status: "SKILL_EXTRACTED" }
    );

    const event: SkillExtractedEvent = { resumeId, userId, skills: skillNames, jobId };
    await publishEvent(TOPICS.SKILL_EXTRACTED, event as unknown as Record<string, unknown>);
    console.log(`[SkillExtractor] ✅ Found ${skillNames.length} skills for ${resumeId}`);
  } catch (err) {
    console.error(`[SkillExtractor] ❌ Error:`, err);
    await Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[SkillExtractor Service] Starting...");
  await connectDB();
  startHealthServer("SkillExtractor Service");
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}skill-extractor`,
    TOPICS.EMBEDDINGS_GENERATED,
    (payload) => extractAndStoreSkills(payload as unknown as EmbeddingsGeneratedEvent)
  );
  console.log("[SkillExtractor Service] ✅ Listening for embeddings_generated events");
}

main().catch(console.error);
