import { Response, NextFunction } from "express";
import { authMiddleware } from "./auth";

export const protect = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await authMiddleware(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing token" });
    }
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};
