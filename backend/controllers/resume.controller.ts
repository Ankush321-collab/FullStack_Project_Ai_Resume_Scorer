import { Request, Response } from "express";
import { Resume, MatchResult } from "../models/index";
import { publishEvent, TOPICS } from "../config/kafka/index";
import { cacheGet } from "../config/redis";
import mongoose from "mongoose";

export const listResumes = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const resumes = await Resume.find({ userId: req.user.id })
      .populate('skills')
      .sort({ createdAt: -1 });
    
    const results = [];
    for (const r of resumes) {
      const matchResults = await MatchResult.find({ resumeId: r._id });
      const resumeFeedback = typeof r.feedback === "string" ? r.feedback : "";
      results.push({
        ...r.toObject(),
        id: r._id.toString(),
        skills: (r.skills as any[]).map((s) => s.name),
        matchResults: matchResults.map((m) => ({
          ...m.toObject(),
          id: m._id.toString(),
          feedback: resumeFeedback,
        })),
        createdAt: r.createdAt.toISOString(),
      });
    }
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getResume = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid resume id" });
    }

    const resume = await Resume.findById(id).populate('skills');
    const ownerId = String(resume?.userId ?? "").toLowerCase();
    const requesterId = String(req.user.id ?? "").toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Resume not found" });
    }
    
    const matchResults = await MatchResult.find({ resumeId: resume._id });
    const resumeFeedback = typeof resume.feedback === "string" ? resume.feedback : "";
    
    res.json({
      ...resume.toObject(),
      id: resume._id.toString(),
      skills: (resume.skills as any[]).map((s) => s.name),
      matchResults: matchResults.map((m) => ({
        ...m.toObject(),
        id: m._id.toString(),
        feedback: resumeFeedback,
      })),
      createdAt: (resume.createdAt || new Date()).toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadResume = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { fileUrl, fileName } = req.body;
    if (!fileUrl || !fileName) {
      return res.status(400).json({ error: "fileUrl and fileName are required" });
    }

    const resume = await Resume.create({
      userId: req.user.id,
      fileUrl,
      fileName,
      status: "UPLOADED",
    });

    res.status(201).json({
      ...resume.toObject(),
      id: resume._id.toString(),
      skills: [],
      matchResults: [],
      createdAt: (resume.createdAt || new Date()).toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const analyzeResume = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId, jobId } = req.body;
    if (!resumeId || !jobId) {
      return res.status(400).json({ error: "resumeId and jobId are required" });
    }
    if (!mongoose.Types.ObjectId.isValid(resumeId) || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "Invalid resumeId or jobId" });
    }

    const resume = await Resume.findById(resumeId);
    const ownerId = String(resume?.userId ?? "").toLowerCase();
    const requesterId = String(req.user.id ?? "").toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const cacheKey = `match:${resumeId}:${jobId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ resumeId, jobId, status: "COMPLETED", message: "Retrieved from cache" });
    }

    await publishEvent(TOPICS.RESUME_UPLOADED, {
      resumeId,
      userId: req.user.id,
      fileUrl: resume.fileUrl,
      fileName: resume.fileName,
      jobId,
    });

    res.json({ resumeId, jobId, status: "PROCESSING", message: "Analysis started" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteResume = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid resume id" });
    }

    const resume = await Resume.findById(id);
    const ownerId = String(resume?.userId ?? "").toLowerCase();
    const requesterId = String(req.user.id ?? "").toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Not found" });
    }
    await Resume.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
