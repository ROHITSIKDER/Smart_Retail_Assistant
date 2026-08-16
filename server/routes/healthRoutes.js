import express from 'express';
import { getIsMongoConnected } from '../config/db.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Smart Retail Assistant API',
    database: getIsMongoConnected() ? 'connected' : 'disconnected (in-memory fallback)',
    timestamp: new Date().toISOString()
  });
});

export default router;
