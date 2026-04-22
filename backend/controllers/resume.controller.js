"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
var _index = require('../models/index');
var _index3 = require('../config/kafka/index');
var _redis = require('../config/redis');
var _mongoose = require('mongoose'); var _mongoose2 = _interopRequireDefault(_mongoose);
const _axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createLatexStylePDF } = require('../../services/enhancer/src/pdf');

 const listResumes = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const resumes = await _index.Resume.find({ userId: req.user.id })
      .populate('skills')
      .sort({ createdAt: -1 });
    
    const results = [];
    for (const r of resumes) {
      const matchResults = await _index.MatchResult.find({ resumeId: r._id });
      const resumeFeedback = typeof r.feedback === "string" ? r.feedback : "";
      results.push({
        ...r.toObject(),
        id: r._id.toString(),
        skills: (r.skills ).map((s) => s.name),
        matchResults: matchResults.map((m) => ({
          ...m.toObject(),
          id: m._id.toString(),
          feedback: resumeFeedback,
        })),
        improvedResumeUrl: r.improvedResumeUrl,
        improvedResumeName: r.improvedResumeName,
        createdAt: r.createdAt.toISOString(),
      });
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.listResumes = listResumes;

 const getResume = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!_mongoose2.default.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid resume id" });
    }

    const resume = await _index.Resume.findById(id).populate('skills');
    const ownerId = String(_nullishCoalesce(_optionalChain([resume, 'optionalAccess', _ => _.userId]), () => ( ""))).toLowerCase();
    const requesterId = String(_nullishCoalesce(req.user.id, () => ( ""))).toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Resume not found" });
    }
    
    const matchResults = await _index.MatchResult.find({ resumeId: resume._id });
    const resumeFeedback = typeof resume.feedback === "string" ? resume.feedback : "";
    
    res.json({
      ...resume.toObject(),
      id: resume._id.toString(),
      skills: (resume.skills ).map((s) => s.name),
      matchResults: matchResults.map((m) => ({
        ...m.toObject(),
        id: m._id.toString(),
        feedback: resumeFeedback,
      })),
      improvedResumeUrl: resume.improvedResumeUrl,
      improvedResumeName: resume.improvedResumeName,
      createdAt: (resume.createdAt || new Date()).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.getResume = getResume;

 const uploadResume = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { fileUrl, fileName } = req.body;
    if (!fileUrl || !fileName) {
      return res.status(400).json({ error: "fileUrl and fileName are required" });
    }

    const resume = await _index.Resume.create({
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.uploadResume = uploadResume;

 const analyzeResume = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { resumeId, jobId } = req.body;
    if (!resumeId || !jobId) {
      return res.status(400).json({ error: "resumeId and jobId are required" });
    }
    if (!_mongoose2.default.Types.ObjectId.isValid(resumeId) || !_mongoose2.default.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "Invalid resumeId or jobId" });
    }

    const resume = await _index.Resume.findById(resumeId);
    const ownerId = String(_nullishCoalesce(_optionalChain([resume, 'optionalAccess', _2 => _2.userId]), () => ( ""))).toLowerCase();
    const requesterId = String(_nullishCoalesce(req.user.id, () => ( ""))).toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const cacheKey = `match:${resumeId}:${jobId}`;
    const cached = await _redis.cacheGet.call(void 0, cacheKey);
    if (cached) {
      return res.json({ resumeId, jobId, status: "COMPLETED", message: "Retrieved from cache" });
    }

    await _index3.publishEvent.call(void 0, _index3.TOPICS.RESUME_UPLOADED, {
      resumeId,
      userId: req.user.id,
      fileUrl: resume.fileUrl,
      fileName: resume.fileName,
      jobId,
    });

    res.json({ resumeId, jobId, status: "PROCESSING", message: "Analysis started" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.analyzeResume = analyzeResume;

 const deleteResume = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!_mongoose2.default.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid resume id" });
    }

    const resume = await _index.Resume.findById(id);
    const ownerId = String(_nullishCoalesce(_optionalChain([resume, 'optionalAccess', _3 => _3.userId]), () => ( ""))).toLowerCase();
    const requesterId = String(_nullishCoalesce(req.user.id, () => ( ""))).toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Not found" });
    }
    await _index.MatchResult.deleteMany({ resumeId: id });
    await _index.Resume.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.deleteResume = deleteResume;

 const clearResumeHistory = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const resumes = await _index.Resume.find({ userId: req.user.id }).select("_id");
    const resumeIds = resumes.map((r) => r._id);

    if (resumeIds.length > 0) {
      await _index.MatchResult.deleteMany({ resumeId: { $in: resumeIds } });
    }

    const deletedResumes = await _index.Resume.deleteMany({ userId: req.user.id });

    res.json({
      success: true,
      deletedCount: deletedResumes.deletedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.clearResumeHistory = clearResumeHistory;

 const updateResume = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!_mongoose2.default.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid resume id" });
    }

    const resume = await _index.Resume.findById(id);
    const ownerId = String(_nullishCoalesce(_optionalChain([resume, 'optionalAccess', _4 => _4.userId]), () => ( ""))).toLowerCase();
    const requesterId = String(_nullishCoalesce(req.user.id, () => ( ""))).toLowerCase();
    if (!resume || ownerId !== requesterId) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const { fileName } = req.body;
    if (typeof fileName !== "string" || !fileName.trim()) {
      return res.status(400).json({ error: "fileName is required" });
    }

    resume.fileName = fileName.trim();
    await resume.save();

    const updated = await _index.Resume.findById(id).populate("skills");
    if (!updated) return res.status(404).json({ error: "Resume not found" });

    const matchResults = await _index.MatchResult.find({ resumeId: updated._id });
    const resumeFeedback = typeof updated.feedback === "string" ? updated.feedback : "";

    res.json({
      ...updated.toObject(),
      id: updated._id.toString(),
      skills: (updated.skills ).map((s) => s.name),
      matchResults: matchResults.map((m) => ({
        ...m.toObject(),
        id: m._id.toString(),
        feedback: resumeFeedback,
      })),
      createdAt: (updated.createdAt || new Date()).toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.updateResume = updateResume;



const improveResume = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    
    const resume = await _index.Resume.findById(id);
    if (!resume || String(resume.userId) !== String(req.user.id)) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // If already generated, return it
    if (resume.improvedResumeUrl) {
      return res.json({
        success: true,
        improvedFileUrl: resume.improvedResumeUrl,
        improvedFileName: resume.improvedResumeName,
      });
    }

    // Fallback: Generate it now if feedback exists
    if (!resume.feedback || !resume.parsedText) {
      return res.status(400).json({ error: "Resume must be analyzed first." });
    }

    console.log(`[Controller] Generating on-the-fly enhancement for resume ${id}...`);
    
    // Call LLM
    const systemPrompt = `You are an elite resume optimizer. 
1. IDENTITY: Extract the actual name and info from the resume.
2. STRICT DENSITY: EVERY single Experience, Project, and Achievement entry MUST have EXACTLY 2 detailed bullet points.
3. SURGICAL UPGRADE: Rewrite existing text to include quantified metrics and missing skills.
4. Return a strict JSON format matching the master LaTeX template.`;

    const baseUrl = (process.env.NEBIUS_BASE_URL || "").replace(/\/+$/, "");
    const llmResponse = await _axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: process.env.NEBIUS_LLM_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `RESUME: ${resume.parsedText.slice(0, 4000)}\n\nFEEDBACK: ${resume.feedback}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      },
      {
        headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}` },
        timeout: 180000
      }
    );

    const data = JSON.parse(llmResponse.data.choices[0].message.content);
    
    const fileName = `improved-${Date.now()}-${resume.fileName.replace(/\.[^/.]+$/, "")}.pdf`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const outputPath = path.join(uploadsDir, fileName);

    await createLatexStylePDF(data, outputPath);

    // Save to DB
    resume.improvedResumeUrl = `/uploads/${fileName}`;
    resume.improvedResumeName = fileName;
    await resume.save();

    res.json({
      success: true,
      improvedFileUrl: resume.improvedResumeUrl,
      improvedFileName: resume.improvedResumeName,
    });

  } catch (error) {
    console.error("[ImproveResume Controller] Error:", error);
    res.status(500).json({ error: error.message });
  }
}; exports.improveResume = improveResume;



