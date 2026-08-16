import { describe, it, expect, vi } from 'vitest';
import { validateUrl, isPrivateIp } from '../middleware/validateUrl.js';

describe('SSRF Protection & URL Validation Middleware', () => {
  describe('isPrivateIp', () => {
    it('should identify IPv4 private and loopback IP addresses', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.0.0.255')).toBe(true);
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.1.100')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('255.255.255.255')).toBe(true);
    });

    it('should identify IPv6 private, loopback, and IPv4-mapped addresses', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd00::1')).toBe(true);
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateIp('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateIp('100.64.0.1')).toBe(true);
    });

    it('should allow public IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('142.250.190.46')).toBe(false);
      expect(isPrivateIp('172.32.0.1')).toBe(false);
      expect(isPrivateIp('11.0.0.1')).toBe(false);
    });
  });

  describe('validateUrl middleware', () => {
    const createMockReqRes = (body) => {
      const req = { body };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();
      return { req, res, next };
    };

    it('should reject missing or empty URL', async () => {
      const { req, res, next } = createMockReqRes({});
      await validateUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Product URL is required'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-HTTP/HTTPS protocols', async () => {
      const { req, res, next } = createMockReqRes({ url: 'ftp://example.com/file' });
      await validateUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.stringContaining('Invalid URL protocol')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject localhost and internal hostnames', async () => {
      const { req, res, next } = createMockReqRes({ url: 'http://localhost:5000/api' });
      await validateUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.stringContaining('SSRF Protection')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass valid public web URLs', async () => {
      const { req, res, next } = createMockReqRes({ url: 'https://www.amazon.com/dp/B08N5WRWNW' });
      await validateUrl(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.url).toBe('https://www.amazon.com/dp/B08N5WRWNW');
    });
  });
});
