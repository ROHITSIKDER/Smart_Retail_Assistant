import { AnalysisService } from '../services/analysisService.js';

export const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const history = await AnalysisService.getRecentHistory(limit);

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};
