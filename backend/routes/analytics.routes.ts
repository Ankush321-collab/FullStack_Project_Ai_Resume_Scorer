import { Router } from "express";
import { getAnalyticsOverview } from "../controllers/analytics.controller";
import { protect } from "../middleware/protect";

const router = Router();

router.use(protect);

router.get("/overview", getAnalyticsOverview);

export default router;
