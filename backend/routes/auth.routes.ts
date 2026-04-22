import { Router } from "express";
import { signIn, signUp, me } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Wrap the authMiddleware to work with Express router
const protect = async (req: any, res: any, next: any) => {
  try {
    const user = await authMiddleware(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

router.post("/signup", signUp);
router.post("/signin", signIn);
router.get("/me", protect, me);

export default router;
