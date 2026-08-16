import { AnalysisService } from '../services/analysisService.js';

export const analyzeProduct = async (req, res, next) => {
  try {
    const { url } = req.body;
    const forceRefresh = req.body?.forceRefresh === true || req.query?.forceRefresh === 'true';
    const result = await AnalysisService.analyzeProductUrl(url, forceRefresh);

    return res.status(200).json({
      success: true,
      source: result.source,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};
