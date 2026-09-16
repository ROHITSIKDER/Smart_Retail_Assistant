import { AnalysisService } from '../services/analysisService.js';
import { ExtractionError } from '../utils/extractionError.js';
import { ErrorCategory } from '../utils/responseValidator.js';

export const analyzeProduct = async (req, res, next) => {
  const timeoutMs = parseInt(process.env.ANALYSIS_REQUEST_TIMEOUT_MS, 10) || 26000;
  const abortController = new AbortController();
  const deadline = Date.now() + timeoutMs;

  const timer = setTimeout(() => {
    abortController.abort(
      new ExtractionError(`Analysis pipeline exceeded maximum time limit of ${Math.round(timeoutMs / 1000)} seconds.`, {
        category: ErrorCategory.TIMEOUT,
        statusCode: 504,
        platform: 'unknown'
      })
    );
  }, timeoutMs);

  const onClose = () => {
    if (!res.writableEnded) {
      abortController.abort(
        new ExtractionError('Client closed connection.', {
          category: ErrorCategory.TIMEOUT,
          statusCode: 499
        })
      );
    }
  };
  req.on('close', onClose);

  try {
    const { url } = req.body;
    const forceRefresh = req.body?.forceRefresh === true || req.query?.forceRefresh === 'true';
    const result = await AnalysisService.analyzeProductUrl(url, forceRefresh, {
      signal: abortController.signal,
      deadline
    });

    return res.status(200).json({
      success: true,
      source: result.source,
      data: result.data
    });
  } catch (error) {
    if (abortController.signal.aborted && abortController.signal.reason) {
      return next(abortController.signal.reason);
    }
    next(error);
  } finally {
    clearTimeout(timer);
    req.off('close', onClose);
  }
};
