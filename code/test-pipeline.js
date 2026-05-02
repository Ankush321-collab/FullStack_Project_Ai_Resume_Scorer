const fs = require('fs');

async function run() {
  console.log("Starting test...");
  
  // 1. Sign up
  let res = await fetch("http://localhost:4000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test_ai@example.com", password: "password123", name: "AI Test User" })
  });
  
  if (res.status === 400) {
    // try login
    res = await fetch("http://localhost:4000/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test_ai@example.com", password: "password123" })
    });
  }
  
  const authData = await res.json();
  const token = authData.token;
  if (!token) throw new Error("Failed to get token");
  console.log("Logged in with token");

  // 2. Create Job
  const jobDescription = `An AI Engineer designs, develops, and deploys artificial intelligence systems, utilizing machine learning, deep learning, and data science to automate processes and solve complex business problems. Key responsibilities include building algorithms, training models using frameworks like TensorFlow or PyTorch, and integrating AI into software. They require expertise in programming (Python, Java) and data analysis to enhance system performance and efficiency. 

Typical AI Job Responsibilities
Model Development: Design, build, and train machine learning and deep learning models.
System Integration: Integrate AI solutions into existing software and infrastructure.
Data Analysis: Analyze data and user feedback to identify bottlenecks and optimize performance.
Strategy & Consulting: Advise stakeholders on AI capabilities and technology strategy.
Maintenance: Monitor response times, load balancing, and resource usage to maintain system efficiency. 

Required Skills and Qualifications
Education: Bachelor’s or Master’s degree in Computer Science, Data Science, or a related field.
Programming Languages: Strong proficiency in Python, Java, C++, or R.
AI/ML Frameworks: Experience with TensorFlow, PyTorch, Keras, or Scikit-learn.
Data Expertise: Proficiency in SQL, data modeling, and handling large datasets.
Platforms: Experience with cloud platforms such as AWS (SageMaker), Azure ML, or Google Cloud.`;

  res = await fetch("http://localhost:4000/api/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "AI Engineer",
      company: "Tech Corp",
      description: jobDescription
    })
  });
  const jobData = await res.json();
  console.log("Created Job:", jobData.id, jobData.title);
  console.log("Extracted Skills from JD:", jobData.skills);
}

run().catch(console.error);
