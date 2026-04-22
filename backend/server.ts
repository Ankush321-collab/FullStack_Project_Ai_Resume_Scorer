import dotenv from "dotenv";
import { join } from "path";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";

// Routes
import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";
import jobRoutes from "./routes/job.routes";
import analyticsRoutes from "./routes/analytics.routes";

dotenv.config({ path: join(__dirname, ".env") });

async function main() {
  await connectDB();
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.CORS_ORIGINS 
        ? process.env.CORS_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
        : ["http://localhost:5173", "http://localhost:3000"], // Added 5173 for Vite
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use("/uploads", express.static(join(__dirname, "uploads")));

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get('/', (_req, res) => {
    res.send('MERN API Backend is running with MVC pattern.');
  });

  const PORT = process.env.API_PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 API Backend running at http://localhost:${PORT}`);
    console.log(`📡 REST Endpoints: /api/auth, /api/resumes, /api/jobs, /api/analytics`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
