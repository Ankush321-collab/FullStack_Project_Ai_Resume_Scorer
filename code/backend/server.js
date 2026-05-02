"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _dotenv = require('dotenv'); var _dotenv2 = _interopRequireDefault(_dotenv);
var _path = require('path');
var _express = require('express'); var _express2 = _interopRequireDefault(_express);
var _cors = require('cors'); var _cors2 = _interopRequireDefault(_cors);
var _db = require('./config/db');

// Routes
var _authroutes = require('./routes/auth.routes'); var _authroutes2 = _interopRequireDefault(_authroutes);
var _resumeroutes = require('./routes/resume.routes'); var _resumeroutes2 = _interopRequireDefault(_resumeroutes);
var _jobroutes = require('./routes/job.routes'); var _jobroutes2 = _interopRequireDefault(_jobroutes);
var _analyticsroutes = require('./routes/analytics.routes'); var _analyticsroutes2 = _interopRequireDefault(_analyticsroutes);

_dotenv2.default.config({ path: _path.join.call(void 0, __dirname, ".env") });

async function main() {
  await _db.connectDB.call(void 0, );
  const app = _express2.default.call(void 0, );

  app.set("trust proxy", 1);

  app.use(
    _cors2.default.call(void 0, {
      origin: process.env.CORS_ORIGINS 
        ? process.env.CORS_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
        : ["http://localhost:5173", "http://localhost:3000"], // Added 5173 for Vite
      credentials: true,
    }),
  );

  app.use(_express2.default.json({ limit: "10mb" }));
  app.use("/uploads", _express2.default.static(_path.join.call(void 0, __dirname, "uploads")));

  // API Routes
  app.use("/api/auth", _authroutes2.default);
  app.use("/api/resumes", _resumeroutes2.default);
  app.use("/api/jobs", _jobroutes2.default);
  app.use("/api/analytics", _analyticsroutes2.default);

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
