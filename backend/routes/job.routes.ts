import { Router } from "express";
import { listJobs, createJob, getResumeScore, getSkillGap, matchJob, updateJob } from "../controllers/job.controller";
import { protect } from "../middleware/protect";

const router = Router();

router.use(protect);

router.get("/", listJobs);
router.post("/", createJob);
router.patch("/:id", updateJob);
router.get("/score/:resumeId", getResumeScore);
router.get("/skill-gap/:resumeId/:jobId", getSkillGap);
router.get("/match/:resumeId/:jobId", matchJob);

export default router;
