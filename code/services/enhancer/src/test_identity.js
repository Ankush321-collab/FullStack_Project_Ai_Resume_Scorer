const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, "../../../backend/.env") });

const { improveResumeJSON } = require('./index');
const { createLatexStylePDF } = require('./pdf');

async function testDynamicIdentity() {
  const fakeResumeText = `
  JOHN DOE
  john.doe@cloud.com
  EXPERIENCE
  Google - Engineer
  `;

  const feedback = "Focus on cloud scale.";

  console.log("Testing Audit Engine with Thin Identity: JOHN DOE");

  const data = await improveResumeJSON(fakeResumeText, feedback, "TEST_ID");
  
  console.log("Audit Passed/Enriched. Extracted Name:", data.name);

  const outputPath = path.join(__dirname, "../../../backend/uploads/TEST_AUDIT.pdf");
  const texPath = path.join(__dirname, "../../../backend/uploads/TEST_AUDIT.tex");
  
  fs.writeFileSync(texPath, data.latex_code);
  await createLatexStylePDF(data, outputPath);

  console.log("✅ Rich PDF and LaTeX generated after Audit check at backend/uploads/TEST_AUDIT.*");
}

testDynamicIdentity().catch(console.error);
