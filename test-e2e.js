const PDFDocument = require('pdfkit');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const PDF_PATH = path.join(__dirname, 'dummy.pdf');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createDummyPdf() {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(PDF_PATH));
    doc.fontSize(16).text('Resume: AI Engineer Candidate', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Summary: I am a seasoned AI Engineer with 5 years of experience in designing and training machine learning systems.');
    doc.moveDown();
    doc.text('Skills: Python, Java, R, AWS, Azure, Machine Learning, Deep Learning, PyTorch, TensorFlow, SQL');
    doc.moveDown();
    doc.text('Experience:');
    doc.text('- Built predictive models using Scikit-Learn.');
    doc.text('- Implemented neural networks using PyTorch and TensorFlow.');
    doc.text('- Deployed deep learning models to AWS SageMaker.');
    doc.end();

    doc.on('end', () => {
      resolve();
    });
  });
}

async function run() {
  console.log("Generating dummy PDF...");
  await createDummyPdf();
  // Wait a bit to ensure file is written completely to disk
  await sleep(1000);

  console.log("Starting E2E test...");
  
  // 1. Login
  let res = await fetch("http://localhost:4000/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test_ai@example.com", password: "password123" })
  });
  if(res.status !== 200) {
      res = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test_ai@example.com", password: "password123", name: "AI Test User" })
      });
  }
  const authData = await res.json();
  const token = authData.token;
  if (!token) throw new Error("Failed to get token");
  console.log("✅ Logged in successfully.");

  // 2. Create Job
  const jobDescription = `An AI Engineer designs, develops, and deploys artificial intelligence systems. Required Skills: Python, Java, Machine Learning.`;
  res = await fetch("http://localhost:4000/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ title: "AI Engineer", company: "Tech Corp", description: jobDescription })
  });
  const jobData = await res.json();
  const jobId = jobData.id;
  console.log(`✅ Created Job: ${jobId}`);

  // 3. Place PDF in backend/uploads directory manually
  console.log("Placing PDF...");
  const uploadDir = path.join(__dirname, 'backend', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.copyFileSync(PDF_PATH, path.join(uploadDir, 'dummy.pdf'));
  
  const fileUrl = '/uploads/dummy.pdf';
  const fileName = 'dummy.pdf';
  console.log(`✅ File placed. URL: ${fileUrl}`);

  // 4. Create Resume Record
  res = await fetch("http://localhost:4000/api/resumes/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ fileUrl, fileName })
  });
  const resumeData = await res.json();
  const resumeId = resumeData.id;
  console.log(`✅ Resume Record Created: ${resumeId}`);

  // 5. Trigger Analysis (Kick off Kafka Pipeline)
  console.log("Triggering analysis pipeline...");
  res = await fetch("http://localhost:4000/api/resumes/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ resumeId, jobId })
  });
  const analyzeRes = await res.json();
  console.log("✅ Analysis started:", analyzeRes.message);

  // 6. Polling for results
  console.log(`Polling for match completion (Resume: ${resumeId}, Job: ${jobId})...`);
  let retries = 0;
  while(retries < 20) {
    await sleep(2000); // Check every 2s
    let checkRes = await fetch(`http://localhost:4000/api/resumes/${resumeId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    let resumeStatus = await checkRes.json();
    
    // Check if match result was created 
    // And also skills populated
    if (resumeStatus.status === "FAILED") {
        console.error("❌ Pipeline failed processing resume!");
        break;
    }
    
    if (resumeStatus.matchResults && resumeStatus.matchResults.length > 0) {
      console.log("🎉 Analysis PIPELINE COMPLETED SUCCESSFULLY!");
      console.log("Extracted Skills from Resume:", resumeStatus.skills);
      console.log("Match Percentage:", resumeStatus.matchResults[0].matchPercentage + "%");
      console.log("Feedback:\n" + resumeStatus.matchResults[0].feedback);
      break;
    } else {
      process.stdout.write(".");
    }
    retries++;
  }
}

run().catch(console.error);
