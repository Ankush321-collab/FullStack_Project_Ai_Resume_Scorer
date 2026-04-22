import { Router } from "express";
import multer from "multer";
import path from "path";
import { 
  listResumes, getResume, uploadResume, 
  analyzeResume, deleteResume, updateResume, clearResumeHistory
} from "../controllers/resume.controller";
import { protect } from "../middleware/protect";

const router = Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.use(protect);

router.get("/", listResumes);
router.get("/:id", getResume);
router.post("/upload", uploadResume);
router.post("/file", upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    fileUrl: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname 
  });
});
router.post("/analyze", analyzeResume);
router.delete("/history", clearResumeHistory);
router.patch("/:id", updateResume);
router.delete("/:id", deleteResume);

export default router;
