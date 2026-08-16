import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('Express API Endpoints Integration Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return health status 200', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('service', 'Smart Retail Assistant API');
      expect(res.body).toHaveProperty('database');
    });
  });

  describe('POST /api/v1/analyze', () => {
    it('should return 400 Bad Request when URL is missing', async () => {
      const res = await request(app)
        .post('/api/v1/analyze')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Product URL is required');
    });

    it('should return 400 Bad Request when SSRF IP target is supplied', async () => {
      const res = await request(app)
        .post('/api/v1/analyze')
        .send({ url: 'http://127.0.0.1:5000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('SSRF Protection');
    });
  });

  describe('GET /api/v1/history', () => {
    it('should return history list with status 200 and respect sanitized limits', async () => {
      const res = await request(app).get('/api/v1/history?limit=2');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });
});
