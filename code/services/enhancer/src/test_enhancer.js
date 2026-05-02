const { connectDB, Resume } = require('../../../backend/config/db');
const { createLatexStylePDF } = require('./pdf');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

async function improveResumeJSON(parsedText, feedback) {
  console.log("Calling Nebius AI for improvement...");
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
\\definecolor{darkcolor}{HTML}{0F4539}
\\definecolor{SlateGrey}{HTML}{2E2E2E}
\\definecolor{LightGrey}{HTML}{666666}
\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.19in}
\\addtolength{\\topmargin}{-.7in}
\\addtolength{\\textheight}{1.4in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{
  \\vspace{-6pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-6pt}]
\\newcommand{\\resumeItem}[1]{
  \\item\\small{{#1 \\vspace{-3pt}}}
}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{\\large#1} & \\textbf{\\small #2} \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-6pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & \\textbf{\\small #2}\\\\
    \\end{tabular*}\\vspace{-6pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=*]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-4pt}}
\\newcommand\\sbullet[1][.45]{\\mathbin{\\vcenter{\\hbox{\\scalebox{#1}{$\\bullet$}}}}}

JSON structure:
{
  "name": "Candidate Name",
  "email": "email@example.com",
  "phone": "+123456789",
  "location": "City, Country",
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
    "Frontend": [],
    "Backend": [],
    "Tools": []
  },
  "achievements": [],
  "latex_code": "THE FULL LATEX CODE FILLED WITH DATA"
}

RULES:
1. MASTER TEMPLATE: Use the EXACT LaTeX structure provided. Treat it as a frame and only insert improved content into the macros.
2. MACRO LOCK: You must use \resumeSubheading, \resumeItem, and \resumeProjectHeading exactly as they appear in the template.
3. SECTION ORDER: Always follow the order: Heading -> EDUCATION -> EXPERIENCE -> PROJECTS -> TECHNICAL SKILLS -> ACHIEVEMENTS.
4. MINIMIZE CHANGES: Only apply specific improvements from the FEEDBACK. Keep the rest of the original wording.
5. Return ONLY the JSON object.`;

  const response = await axios.post(
    `${(process.env.NEBIUS_BASE_URL || "").replace(/\/+$/, "")}/chat/completions`,
    {
      model: process.env.NEBIUS_LLM_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `RESUME: ${parsedText.slice(0, 2000)}\n\nFEEDBACK: ${feedback}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    },
    {
      headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}` }
    }
  );

  return JSON.parse(response.data.choices[0].message.content);
}

async function runTest(resumeId) {
  console.log(`Starting test for Resume ID: ${resumeId}`);
  await connectDB();
  
  const resume = await Resume.findById(resumeId);
  if (!resume || !resume.feedback || !resume.parsedText) {
    console.error("Resume not found or missing feedback/parsedText");
    process.exit(1);
  }

  try {
    const data = await improveResumeJSON(resume.parsedText, resume.feedback);
    console.log("AI improvement completed.");
    
    const outputPath = path.join(__dirname, "../../../backend/uploads/TEST_IMPROVED_LATEX.pdf");
    const texPath = path.join(__dirname, "../../../backend/uploads/TEST_IMPROVED_LATEX.tex");
    
    fs.writeFileSync(texPath, data.latex_code);
    console.log(`LaTeX source saved to: ${texPath}`);
    
    await createLatexStylePDF(data, outputPath);
    console.log(`PDF successfully generated at: ${outputPath}`);
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    process.exit(0);
  }
}

const targetId = process.argv[2] || "69deaae3d5473fa013a06a01";
runTest(targetId);
