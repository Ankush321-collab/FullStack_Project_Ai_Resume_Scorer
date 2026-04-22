"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
var _index = require('../models/index');

 const getAnalyticsOverview = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const [totalResumes, matchResults] = await Promise.all([
      _index.Resume.countDocuments({ userId: req.user.id }),
      _index.MatchResult.find({})
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

    const skillMap = {};
    for (const m of filteredResults) {
      for (const skill of m.skillGap) {
        skillMap[skill] = (_nullishCoalesce(skillMap[skill], () => ( 0))) + 1;
      }
    }
    const topMissingSkills = Object.entries(skillMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    res.json({ totalResumes, avgScore, topMissingSkills });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; exports.getAnalyticsOverview = getAnalyticsOverview;
