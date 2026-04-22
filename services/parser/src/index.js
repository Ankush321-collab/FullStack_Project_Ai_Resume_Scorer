"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _dotenv = require('dotenv'); var _dotenv2 = _interopRequireDefault(_dotenv);
var _http = require('http'); var _http2 = _interopRequireDefault(_http);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _kafka = require('../../../backend/config/kafka');
var _db = require('../../../backend/config/db');

var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _pdfparse = require('pdf-parse'); var _pdfparse2 = _interopRequireDefault(_pdfparse);

_dotenv2.default.config({ path: _path2.default.join(__dirname, "../../../backend/.env") });

const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 15000);

function startHealthServer(serviceName) {
  const port = Number(process.env.PORT || 0);
  if (!port) return;

  const server = _http2.default.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: serviceName }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[${serviceName}] Health server listening on port ${port}`);
  });
}

async function parseResume(payload) {
  const { resumeId, userId, fileUrl, fileName, jobId } = payload;
  console.log(`[Parser] Processing resume ${resumeId}`);

  try {
    const existing = await _db.Resume.findById(resumeId);
    if (!existing) {
      console.warn(`[Parser] Resume ${resumeId} not found. Skipping stale event.`);
      return;
    }

    await _db.Resume.updateOne({ _id: resumeId }, { status: "PARSING" });

    let parsedText = "";

    if (typeof fileUrl === "string" && fileUrl.startsWith("http")) {
      try {
        // Download the file and parse
        const response = await _axios2.default.get(fileUrl, {
          responseType: "arraybuffer",
          timeout: HTTP_TIMEOUT_MS,
        });
        const buffer = Buffer.from(response.data);
        const data = await _pdfparse2.default.call(void 0, buffer);
        parsedText = data.text;
      } catch (downloadErr) {
        throw new Error(`Remote PDF fetch/parse failed: ${(downloadErr ).message}`);
      }
    } else if (typeof fileUrl === "string" && fileUrl.startsWith("/uploads/")) {
      try {
        const fs = require("fs");
        const localPath = _path2.default.join(__dirname, "../../../backend", fileUrl);
        const buffer = fs.readFileSync(localPath);
        const data = await _pdfparse2.default.call(void 0, buffer);
        parsedText = data.text;
      } catch (localErr) {
        throw new Error(`Local PDF read failed: ${(localErr ).message}`);
      }
    } else {
      throw new Error("Unsupported file URL format. Expected an http(s) URL or /uploads/ local path");
    }

    if (!parsedText || !parsedText.trim()) {
      throw new Error("Parsed text is empty");
    }

    await _db.Resume.updateOne(
      { _id: resumeId },
      { parsedText, status: "PARSED" }
    );

    const event = { resumeId, userId, parsedText, jobId };
    await _kafka.publishEvent.call(void 0, _kafka.TOPICS.RESUME_PARSED, event );
    console.log(`[Parser] ✅ Resume ${resumeId} parsed successfully`);
  } catch (err) {
    console.error(`[Parser] ❌ Error parsing ${resumeId}:`, err);
    await _db.Resume.updateOne({ _id: resumeId }, { status: "FAILED" })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("[Parser Service] Starting...");
  await _db.connectDB.call(void 0, );
  startHealthServer("Parser Service");
  await _kafka.createConsumer.call(void 0, 
    `${process.env.KAFKA_GROUP_ID_PREFIX}parser`,
    _kafka.TOPICS.RESUME_UPLOADED,
    (payload) => parseResume(payload )
  );
  console.log("[Parser Service] ✅ Listening for resume_uploaded events");
}

main().catch(console.error);
