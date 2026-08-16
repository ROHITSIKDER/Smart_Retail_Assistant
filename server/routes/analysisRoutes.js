import express from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeProduct } from '../controllers/analysisController.js';
import { getHistory } from '../controllers/historyController.js';
import { validateUrl } from '../middleware/validateUrl.js';

const router = express.Router();

// Rate limiter: maximum 10 analysis requests per 15 minutes per IP
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  message: {
    success: false,
    error: 'Too many product analysis requests from this IP. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/analyze', analyzeLimiter, validateUrl, analyzeProduct);
router.get('/history', getHistory);

export default router;

