"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _index = require('../models/index');
var _mongoose = require('mongoose'); var _mongoose2 = _interopRequireDefault(_mongoose);

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

function extractSkillsFromText(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const skill of SKILL_KEYWORDS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) found.add(skill);
  }
  return Array.from(found);
}

 const listJobs = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const jobs = await _index.Job.find({}).populate('skills').sort({ createdAt: -1 });
    res.json(jobs.map((j) => ({
      ...j.toObject(),
      id: j._id.toString(),
      skills: (j.skills ).map((s) => s.name),
      createdAt: j.createdAt.toISOString(),
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.listJobs = listJobs;

 const createJob = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { title, company, description } = req.body;

    const extractedSkills = extractSkillsFromText(description);
    const skillIds = [];
    
    for (const name of extractedSkills) {
      const skill = await _index.Skill.findOneAndUpdate(
        { name }, 
        { name }, 
        { upsert: true, new: true }
      );
      skillIds.push(skill._id);
    }

    const job = await _index.Job.create({ 
      title, 
      company, 
      description,
      skills: skillIds 
    });

    const hydratedJob = await _index.Job.findById(job._id).populate('skills');
    if (!hydratedJob) throw new Error("Failed to create job");

    res.status(201).json({
      ...hydratedJob.toObject(),
      id: hydratedJob._id.toString(),
      skills: (hydratedJob.skills ).map((s) => s.name),
      createdAt: hydratedJob.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.createJob = createJob;

 const getResumeScore = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId } = req.params;
    const [result, resume] = await Promise.all([
      _index.MatchResult.findOne({ resumeId }).sort({ createdAt: -1 }),
      _index.Resume.findById(resumeId).select("feedback"),
    ]);
    if (!result) return res.status(404).json({ error: "No match result found yet" });
    const feedback = typeof _optionalChain([resume, 'optionalAccess', _ => _.feedback]) === "string" ? resume.feedback : "";
    res.json({ 
      ...result.toObject(), 
      id: result._id.toString(),
      createdAt: result.createdAt.toISOString(),
      feedback,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.getResumeScore = getResumeScore;

 const getSkillGap = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId, jobId } = req.params;
    const matchResult = await _index.MatchResult.findOne({ resumeId, jobId });
    if (!matchResult) return res.status(404).json({ error: "Analysis not complete yet" });

    const resume = await _index.Resume.findById(resumeId).populate('skills');
    const job = await _index.Job.findById(jobId).populate('skills');
    
    if (!resume || !job) return res.status(404).json({ error: "Resume or Job not found" });

    const present = (resume.skills ).map((s) => s.name);
    const jobSkillNames = (job.skills ).map((s) => s.name);
    const missing = jobSkillNames.filter((s) => !present.includes(s));

    res.json({
      present,
      missing,
      matchPercentage: matchResult.matchPercentage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.getSkillGap = getSkillGap;

 const matchJob = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId, jobId } = req.params;
    const [result, resume] = await Promise.all([
      _index.MatchResult.findOne({ resumeId, jobId }),
      _index.Resume.findById(resumeId).select("feedback"),
    ]);
    if (!result) return res.status(404).json({ error: "Analysis not complete yet" });
    const feedback = typeof _optionalChain([resume, 'optionalAccess', _2 => _2.feedback]) === "string" ? resume.feedback : "";
    res.json({ 
      ...result.toObject(), 
      id: result._id.toString(),
      createdAt: result.createdAt.toISOString(),
      feedback,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.matchJob = matchJob;

 const updateJob = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!_mongoose2.default.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const job = await _index.Job.findById(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const { title, company, description } = req.body;
    if (typeof title === "string" && title.trim()) {
      job.title = title.trim();
    }
    if (typeof company === "string") {
      job.company = company.trim();
    }

    if (typeof description === "string" && description.trim()) {
      const normalizedDescription = description.trim();
      job.description = normalizedDescription;

      const extractedSkills = extractSkillsFromText(normalizedDescription);
      const skillIds = [];

      for (const name of extractedSkills) {
        const skill = await _index.Skill.findOneAndUpdate(
          { name },
          { name },
          { upsert: true, new: true }
        );
        skillIds.push(skill._id);
      }
      job.skills = skillIds ;
    }

    await job.save();

    const hydratedJob = await _index.Job.findById(job._id).populate("skills");
    if (!hydratedJob) return res.status(404).json({ error: "Job not found" });

    res.json({
      ...hydratedJob.toObject(),
      id: hydratedJob._id.toString(),
      skills: (hydratedJob.skills ).map((s) => s.name),
      createdAt: hydratedJob.createdAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.updateJob = updateJob;
