"use strict";
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const ioredis = require('ioredis');
const { createConsumer, TOPICS } = require('../../../backend/config/kafka');
const { connectDB, Resume, Job, MatchResult } = require('../../../backend/config/db');
const { createLatexStylePDF } = require('./pdf');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

const redis = new ioredis(process.env.REDIS_URL || "redis://localhost:6379");
const UPLOADS_DIR = path.join(__dirname, "../../../backend/uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function improveResumeJSON(parsedText, feedback) {
  const systemPrompt = `You are an elite resume optimizer. 
Return a HIGHLY OPTIMIZED version in a strict JSON format.

USER'S LATEX TEMPLATE:
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{multicol}
\\usepackage{graphicx}
\\setlength{\\multicolsep}{-3.0pt}
\\setlength{\\columnsep}{-1pt}
... (use all macros provided by user) ...

The JSON must follow this structure exactly:
{
  "name": "Extracted Candidate Name",
  "email": "extracted@email.com",
  "phone": "extracted-phone",
  "location": "extracted-location",
  "education": [
    { "school": "", "dates": "", "degree": "", "location": "", "details": "" }
  ],
  "experience": [
    { "company": "", "dates": "", "title": "", "location": "", "bullets": ["", ""] }
  ],
  "projects": [
    { "name": "", "tech": "", "dates": "", "bullets": ["", ""] }
  ],
  "skills": {
    "Languages": [],
    "Tools": []
  },
  "achievements": [],
  "latex_code": "THE FULL COMPILED LATEX CODE"
}

RULES:
1. IDENTITY: Extract the actual name and info from the resume.
2. STRICT DENSITY: Every single Experience, Project, and Achievement entry MUST have EXACTLY 2 high-impact bullet points. Do NOT add more, and do NOT provide less.
3. SURGICAL UPGRADE: Rewrite existing text to include quantified metrics and missing skills.
4. SYNTAX LOCK: Use only the provided LaTeX macros.
5. Return ONLY the JSON object.`;

  const userPrompt = `
RESUME TEXT:
${parsedText.slice(0, 4000)}

FEEDBACK:
${feedback}

Generate the improved JSON now:`;

  const response = await axios.post(
    `${(process.env.NEBIUS_BASE_URL || "").replace(/\/+$/, "")}/chat/completions`,
    {
      model: process.env.NEBIUS_LLM_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 180000,
    }
  );

  let data = JSON.parse(response.data.choices[0].message.content);
    
  // --- RIGOROUS DATA & LAYOUT AUDIT ---
  const checkEntry = (item) => {
    if (!item) return false;
    const b = item.bullets || item.highlights || item.details || item.description || item.points || item.summary || [];
    // Strict Check: MUST have exactly 2 bullets
    return (Array.isArray(b) && b.length === 2);
  };
  
  const hasExp = data.experience && data.experience.length > 0 && data.experience.every(checkEntry);
  const hasProj = data.projects && data.projects.length > 0 && data.projects.every(checkEntry);

  if (!hasExp || !hasProj) {
      console.warn(`⚠️ Audit Failed: [Exp: ${hasExp}, Proj: ${hasProj}]. Forcing 2-Bullet Enrichment...`);
      try {
          const retryResponse = await axios.post(
              `${(process.env.NEBIUS_BASE_URL || "").replace(/\/+$/, "")}/chat/completions`,
              {
                  model: process.env.NEBIUS_LLM_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
                  messages: [
                      { role: "system", content: "You are a master resume writer. Rewrite the following JSON so that EVERY single experience, project, and achievement has EXACTLY 2 professional bullet points. Return the full JSON." },
                      { role: "user", content: JSON.stringify(data) },
                  ],
                  response_format: { type: "json_object" },
                  temperature: 0.2,
              },
              {
                  headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`, "Content-Type": "application/json" },
                  timeout: 180000
              }
          );
          data = JSON.parse(retryResponse.data.choices[0].message.content);
      } catch (e) {
          console.error("Retry enrichment failed.", e.message);
      }
  }

  return data;
}

async function handleEnhancement(payload) {
  const { resumeId } = payload;
  console.log(`[Enhancer] Processing LaTeX-style enhancement for resume ${resumeId}`);

  try {
    const resume = await Resume.findById(resumeId).populate('userId');
    if (!resume) return;

    if (resume.improvedResumeUrl && !payload.force) {
        console.log(`[Enhancer] Skipping already enhanced resume ${resumeId}`);
        return;
    }

    let feedback = resume.feedback;
    if (!feedback) {
        console.log(`[Enhancer] Waiting for feedback for ${resumeId}...`);
        await new Promise(r => setTimeout(r, 10000));
        const updated = await Resume.findById(resumeId);
        feedback = updated.feedback;
    }

    if (!feedback) {
        console.log(`[Enhancer] No feedback for ${resumeId}. Aborting.`);
        return;
    }

    const data = await improveResumeJSON(resume.parsedText, feedback);
    
    // Save the LaTeX file for the user
    const baseName = resume.fileName.replace(/\.[^/.]+$/, "");
    const texFileName = `improved-${Date.now()}-${baseName}.tex`;
    fs.writeFileSync(path.join(UPLOADS_DIR, texFileName), data.latex_code);

    // Save the PDF
    const pdfFileName = `improved-${Date.now()}-${baseName}.pdf`;
    const outputPath = path.join(UPLOADS_DIR, pdfFileName);

    await createLatexStylePDF(data, outputPath);

    await Resume.updateOne(
        { _id: resumeId },
        { 
            improvedResumeUrl: `/uploads/${pdfFileName}`,
            improvedResumeName: pdfFileName
        }
    );

    console.log(`[Enhancer] ✅ LaTeX-style PDF and .tex file generated for ${resumeId}`);
  } catch (err) {
    console.error(`[Enhancer] ❌ Enhancement failed:`, err);
  }
}

module.exports = { improveResumeJSON, handleEnhancement };

async function main() {
  await connectDB();
  console.log("[Enhancer Service] Ready for LaTeX-style generation");
  
  await createConsumer(
    `${process.env.KAFKA_GROUP_ID_PREFIX}enhancer`,
    TOPICS.MATCH_COMPLETED,
    (payload) => handleEnhancement(payload)
  );
}

main().catch(console.error);
