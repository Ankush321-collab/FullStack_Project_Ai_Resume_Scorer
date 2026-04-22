import { Request, Response } from "express";
import { Job, Skill, MatchResult, Resume } from "../models/index";
import mongoose from "mongoose";

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

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_KEYWORDS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) found.add(skill);
  }
  return Array.from(found);
}

export const listJobs = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const jobs = await Job.find({}).populate('skills').sort({ createdAt: -1 });
    res.json(jobs.map((j) => ({
      ...j.toObject(),
      id: j._id.toString(),
      skills: (j.skills as any[]).map((s) => s.name),
      createdAt: j.createdAt.toISOString(),
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createJob = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { title, company, description } = req.body;

    const extractedSkills = extractSkillsFromText(description);
    const skillIds = [];
    
    for (const name of extractedSkills) {
      const skill = await Skill.findOneAndUpdate(
        { name }, 
        { name }, 
        { upsert: true, new: true }
      );
      skillIds.push(skill._id);
    }

    const job = await Job.create({ 
      title, 
      company, 
      description,
      skills: skillIds 
    });

    const hydratedJob = await Job.findById(job._id).populate('skills');
    if (!hydratedJob) throw new Error("Failed to create job");

    res.status(201).json({
      ...hydratedJob.toObject(),
      id: hydratedJob._id.toString(),
      skills: (hydratedJob.skills as any[]).map((s) => s.name),
      createdAt: hydratedJob.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getResumeScore = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId } = req.params;
    const [result, resume] = await Promise.all([
      MatchResult.findOne({ resumeId }).sort({ createdAt: -1 }),
      Resume.findById(resumeId).select("feedback"),
    ]);
    if (!result) return res.status(404).json({ error: "No match result found yet" });
    const feedback = typeof resume?.feedback === "string" ? resume.feedback : "";
    res.json({ 
      ...result.toObject(), 
      id: result._id.toString(),
      createdAt: result.createdAt.toISOString(),
      feedback,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSkillGap = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId, jobId } = req.params;
    const matchResult = await MatchResult.findOne({ resumeId, jobId });
    if (!matchResult) return res.status(404).json({ error: "Analysis not complete yet" });

    const resume = await Resume.findById(resumeId).populate('skills');
    const job = await Job.findById(jobId).populate('skills');
    
    if (!resume || !job) return res.status(404).json({ error: "Resume or Job not found" });

    const present = (resume.skills as any[]).map((s) => s.name);
    const jobSkillNames = (job.skills as any[]).map((s) => s.name);
    const missing = jobSkillNames.filter((s) => !present.includes(s));

    res.json({
      present,
      missing,
      matchPercentage: matchResult.matchPercentage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const matchJob = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId, jobId } = req.params;
    const [result, resume] = await Promise.all([
      MatchResult.findOne({ resumeId, jobId }),
      Resume.findById(resumeId).select("feedback"),
    ]);
    if (!result) return res.status(404).json({ error: "Analysis not complete yet" });
    const feedback = typeof resume?.feedback === "string" ? resume.feedback : "";
    res.json({ 
      ...result.toObject(), 
      id: result._id.toString(),
      createdAt: result.createdAt.toISOString(),
      feedback,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateJob = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const job = await Job.findById(id);
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
        const skill = await Skill.findOneAndUpdate(
          { name },
          { name },
          { upsert: true, new: true }
        );
        skillIds.push(skill._id);
      }
      job.skills = skillIds as any;
    }

    await job.save();

    const hydratedJob = await Job.findById(job._id).populate("skills");
    if (!hydratedJob) return res.status(404).json({ error: "Job not found" });

    res.json({
      ...hydratedJob.toObject(),
      id: hydratedJob._id.toString(),
      skills: (hydratedJob.skills as any[]).map((s) => s.name),
      createdAt: hydratedJob.createdAt.toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
