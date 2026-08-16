import { describe, it, expect, vi } from 'vitest';
import { safeLookup, isPrivateIp } from '../utils/safeFetch.js';
import dns from 'dns';

describe('Safe Outbound Fetch & SSRF Protection Tests', () => {
  describe('safeLookup address checking', () => {
    it('should block resolution to loopback IPv4', () => {
      const mockDnsLookup = vi.spyOn(dns, 'lookup').mockImplementation((host, opts, cb) => {
        cb(null, [{ address: '127.0.0.1', family: 4 }]);
      });

      safeLookup('evil-internal.com', {}, (err) => {
        expect(err).toBeDefined();
        expect(err.message).toContain('SSRF Blocked');
        expect(err.code).toBe('ERR_SSRF_BLOCKED');
      });

      mockDnsLookup.mockRestore();
    });

    it('should block resolution to AWS/cloud metadata IP (169.254.169.254)', () => {
      const mockDnsLookup = vi.spyOn(dns, 'lookup').mockImplementation((host, opts, cb) => {
        cb(null, [{ address: '169.254.169.254', family: 4 }]);
      });

      safeLookup('metadata.instance.internal', {}, (err) => {
        expect(err).toBeDefined();
        expect(err.message).toContain('SSRF Blocked');
      });

      mockDnsLookup.mockRestore();
    });

    it('should block resolution to IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)', () => {
      const mockDnsLookup = vi.spyOn(dns, 'lookup').mockImplementation((host, opts, cb) => {
        cb(null, [{ address: '::ffff:127.0.0.1', family: 6 }]);
      });

      safeLookup('ipv6-evil.com', {}, (err) => {
        expect(err).toBeDefined();
        expect(err.message).toContain('SSRF Blocked');
      });

      mockDnsLookup.mockRestore();
    });

    it('should allow resolution to valid public IP', () => {
      const mockDnsLookup = vi.spyOn(dns, 'lookup').mockImplementation((host, opts, cb) => {
        cb(null, [{ address: '93.184.216.34', family: 4 }]);
      });

      safeLookup('example.com', {}, (err, address, family) => {
        expect(err).toBeNull();
        expect(address).toBe('93.184.216.34');
        expect(family).toBe(4);
      });

      mockDnsLookup.mockRestore();
    });
  });
});
