import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProxyManager } from '../services/scrapers/proxyManager.js';

describe('ProxyManager', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ProxyManager.resetForTests();
    process.env = { ...originalEnv };
    delete process.env.PROXY_POOL;
    delete process.env.PROXY_SERVER_URL;
    delete process.env.PROXY_ROTATION;
    delete process.env.PROXY_MAX_RETRIES;
  });

  afterEach(() => {
    process.env = originalEnv;
    ProxyManager.resetForTests();
  });

  it('returns null proxy config when pool is empty', () => {
    expect(ProxyManager.getNextProxy()).toBeNull();
    expect(ProxyManager.getProxyConfig()).toBeNull();
  });

  it('parses PROXY_POOL entries', () => {
    process.env.PROXY_POOL = 'http://proxy1:8080,http://user:pass@proxy2:9090';
    ProxyManager.resetForTests();

    const first = ProxyManager.getNextProxy();
    const second = ProxyManager.getNextProxy();

    expect(first.url).toBe('http://proxy1:8080');
    expect(second.url).toBe('http://proxy2:9090');
    expect(second.auth).toEqual({ username: 'user', password: 'pass' });
  });

  it('supports legacy PROXY_SERVER_URL as single-entry pool', () => {
    process.env.PROXY_SERVER_URL = 'http://legacy-proxy:3128';
    ProxyManager.resetForTests();

    const proxy = ProxyManager.getNextProxy();
    expect(proxy.url).toBe('http://legacy-proxy:3128');
  });

  it('rotates proxies in round-robin order by default', () => {
    process.env.PROXY_POOL = 'http://a:1,http://b:2,http://c:3';
    ProxyManager.resetForTests();

    const sequence = Array.from({ length: 4 }, () => ProxyManager.getNextProxy().url);
    expect(sequence).toEqual(['http://a:1', 'http://b:2', 'http://c:3', 'http://a:1']);
  });

  it('supports random rotation strategy', () => {
    process.env.PROXY_POOL = 'http://a:1,http://b:2';
    process.env.PROXY_ROTATION = 'random';
    ProxyManager.resetForTests();

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(ProxyManager.getNextProxy().url).toBe('http://b:2');
    Math.random.mockRestore();
  });

  it('temporarily excludes failed proxies from rotation', () => {
    process.env.PROXY_POOL = 'http://a:1,http://b:2';
    ProxyManager.resetForTests();

    ProxyManager.markProxyFailed('http://a:1');
    const next = ProxyManager.getNextProxy();
    expect(next.url).toBe('http://b:2');
  });

  it('returns Playwright proxy config with auth when available', () => {
    process.env.PROXY_POOL = 'http://user:secret@proxy3:8888';
    ProxyManager.resetForTests();

    const playwrightProxy = ProxyManager.getPlaywrightProxy();
    expect(playwrightProxy.config.server).toBe('http://proxy3:8888');
    expect(playwrightProxy.config.username).toBe('user');
    expect(playwrightProxy.config.password).toBe('secret');
  });

  it('defaults max retries to 3', () => {
    expect(ProxyManager.getMaxRetries()).toBe(3);
  });

  it('reads PROXY_MAX_RETRIES from env', () => {
    process.env.PROXY_MAX_RETRIES = '5';
    expect(ProxyManager.getMaxRetries()).toBe(5);
  });
});
