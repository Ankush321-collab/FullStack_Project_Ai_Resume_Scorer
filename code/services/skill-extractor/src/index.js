"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _dotenv = require('dotenv'); var _dotenv2 = _interopRequireDefault(_dotenv);
var _http = require('http'); var _http2 = _interopRequireDefault(_http);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _compromise = require('compromise'); var _compromise2 = _interopRequireDefault(_compromise);
var _kafka = require('../../../backend/config/kafka');
var _db = require('../../../backend/config/db');


_dotenv2.default.config({ path: _path2.default.join(__dirname, "../../../backend/.env") });

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

function extractSkills(text) {
  const lowerText = text.toLowerCase();
  const found = new Set();

  for (const skill of SKILL_KEYWORDS) {
    if (lowerText.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  }

  // NER via compromise
  const doc = _compromise2.default.call(void 0, text);
  const nouns = doc.nouns().out("array") ;
  for (const noun of nouns) {
    const lower = noun.toLowerCase().trim();
    if (SKILL_KEYWORDS.includes(lower) && lower.length > 1) {
      found.add(lower);
    }
  }

  return Array.from(found);
}

async function extractAndStoreSkills(payload) {
  const candidate = payload ;
  if (!Array.isArray(candidate.resumeVector) || Array.isArray(candidate.skills)) {
    return;
  }

  const { resumeId, userId, jobId } = payload;
  console.log(`[SkillExtractor] Extracting skills for resume ${resumeId}`);

  try {
    const resume = await _db.Resume.findById(resumeId);
    if (!resume) {
      console.warn(`[SkillExtractor] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }
    if (!resume.parsedText) throw new Error("No parsed text found");

    const skillNames = extractSkills(resume.parsedText);
    const skillIds = [];

    for (const name of skillNames) {
      const skill = await _db.Skill.findOneAndUpdate(
        { name },
        { name },
        { upsert: true, new: true }
      );
      skillIds.push(skill._id);
    }

    await _db.Resume.updateOne(
      { _id: resumeId },
      { skills: skillIds, status: "SKILL_EXTRACTED" }
    );

    const event = { resumeId, userId, skills: skillNames, jobId };
    await _kafka.publishEvent.call(void 0, _kafka.TOPICS.SKILL_EXTRACTED, event );
    console.log(`[SkillExtractor] ✅ Found ${skillNames.length} skills for ${resumeId}`);
  } catch (err) {
    console.error(`[SkillExtractor] ❌ Error:`, err);
    await _db.Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[SkillExtractor Service] Starting...");
  await _db.connectDB.call(void 0, );
  startHealthServer("SkillExtractor Service");
  await _kafka.createConsumer.call(void 0, 
    `${process.env.KAFKA_GROUP_ID_PREFIX}skill-extractor`,
    _kafka.TOPICS.EMBEDDINGS_GENERATED,
    (payload) => extractAndStoreSkills(payload )
  );
  console.log("[SkillExtractor Service] ✅ Listening for embeddings_generated events");
}

main().catch(console.error);
