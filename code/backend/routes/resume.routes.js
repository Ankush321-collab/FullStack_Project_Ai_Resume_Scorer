"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _express = require('express');
var _multer = require('multer'); var _multer2 = _interopRequireDefault(_multer);




var _resumecontroller = require('../controllers/resume.controller');
var _protect = require('../middleware/protect');

const router = _express.Router.call(void 0, );

// Multer config
const storage = _multer2.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = _multer2.default.call(void 0, { storage });

router.use(_protect.protect);

router.get("/", _resumecontroller.listResumes);
router.get("/:id", _resumecontroller.getResume);
router.post("/upload", _resumecontroller.uploadResume);
router.post("/file", upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname 
  });
});
router.post("/analyze", _resumecontroller.analyzeResume);
router.get("/:id/improve", _resumecontroller.improveResume);
router.delete("/history", _resumecontroller.clearResumeHistory);
router.patch("/:id", _resumecontroller.updateResume);
router.delete("/:id", _resumecontroller.deleteResume);

exports. default = router;
