import { Request, Response } from "express";
import { Resume, MatchResult } from "../models/index";

export const getAnalyticsOverview = async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const [totalResumes, matchResults] = await Promise.all([
      Resume.countDocuments({ userId: req.user.id }),
      MatchResult.find({})
        .populate({
          path: 'resumeId',
          match: { userId: req.user.id }
        })
        .select('score skillGap resumeId')
    ]);

    const filteredResults = matchResults.filter(m => m.resumeId !== null);

    const avgScore =
      filteredResults.length > 0
        ? filteredResults.reduce((sum, m) => sum + m.score, 0) / filteredResults.length
        : 0;

    const skillMap: Record<string, number> = {};
    for (const m of filteredResults) {
      for (const skill of m.skillGap) {
        skillMap[skill] = (skillMap[skill] ?? 0) + 1;
      }
    }
    const topMissingSkills = Object.entries(skillMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    res.json({ totalResumes, avgScore, topMissingSkills });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
