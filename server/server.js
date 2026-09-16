import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import analysisRoutes from './routes/analysisRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const defaultDevOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

const corsOrigin = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
  : (isDevOrTest ? defaultDevOrigins : false);

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1', analysisRoutes);

// Error Handler
app.use(errorHandler);

// Export app for testing
export { app };

// Connect DB & Start Server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`================================================`);
      console.log(`🚀 SRA Backend Service running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/v1/health`);
      console.log(`================================================`);
    });
    // Protect HTTP server socket lifecycle
    server.requestTimeout = 30000;
    server.headersTimeout = 31000;
  };

  startServer();
}
