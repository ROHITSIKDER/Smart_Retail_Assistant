import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { ResponseValidator, ErrorCategory } from '../utils/responseValidator.js';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('ResponseValidator', () => {
  it('detects Amazon Robot Check CAPTCHA on HTTP 200', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'amazon_robot_check_200.html'), 'utf-8');
    const $ = cheerio.load(html);
    const result = ResponseValidator.validate($, {
      status: 200,
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
      platform: 'amazon',
      isBrowser: false
    });

    expect(result.isValid).toBe(false);
    expect(result.category).toBe(ErrorCategory.CAPTCHA);
    expect(result.isBlock).toBe(true);
    expect(result.canBrowserHelp).toBe(false);
  });

  it('detects Cloudflare / anti-bot challenge on HTTP 200', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'flipkart_blocked_200.html'), 'utf-8');
    const $ = cheerio.load(html);
    const result = ResponseValidator.validate($, {
      status: 200,
      url: 'https://www.flipkart.com/product/p/itm123',
      platform: 'flipkart',
      isBrowser: false
    });

    expect(result.isValid).toBe(false);
    expect([ErrorCategory.BOT_BLOCKED, ErrorCategory.CAPTCHA]).toContain(result.category);
    expect(result.isBlock).toBe(true);
  });

  it('detects JavaScript-only shell on HTTP 200 and indicates browser can help', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'walmart_js_shell_200.html'), 'utf-8');
    const $ = cheerio.load(html);
    const result = ResponseValidator.validate($, {
      status: 200,
      url: 'https://www.walmart.com/ip/example/123',
      platform: 'walmart',
      isBrowser: false
    });

    expect(result.isValid).toBe(false);
    expect(result.category).toBe(ErrorCategory.JAVASCRIPT_REQUIRED);
    expect(result.canBrowserHelp).toBe(true);
  });

  it('validates genuine Amazon product page on HTTP 200', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'amazon_product_valid.html'), 'utf-8');
    const $ = cheerio.load(html);
    const result = ResponseValidator.validate($, {
      status: 200,
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
      platform: 'amazon',
      isBrowser: false
    });

    expect(result.isValid).toBe(true);
    expect(result.category).toBeNull();
    expect(result.diagnostics.productSignalsFound).toBe(true);
  });

  it('validates genuine Flipkart product page on HTTP 200', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'flipkart_product_valid.html'), 'utf-8');
    const $ = cheerio.load(html);
    const result = ResponseValidator.validate($, {
      status: 200,
      url: 'https://www.flipkart.com/product/p/itm123',
      platform: 'flipkart',
      isBrowser: false
    });

    expect(result.isValid).toBe(true);
    expect(result.category).toBeNull();
  });

  it('identifies HTTP 404 Product Not Found', () => {
    const $ = cheerio.load('<html><head><title>404 Page Not Found</title></head><body><h1>Not Found</h1></body></html>');
    const result = ResponseValidator.validate($, {
      status: 404,
      url: 'https://www.example.com/product/missing',
      platform: 'generic'
    });

    expect(result.isValid).toBe(false);
    expect(result.category).toBe(ErrorCategory.PRODUCT_NOT_FOUND);
    expect(result.canBrowserHelp).toBe(false);
  });

  it('identifies HTTP 429 Rate Limited', () => {
    const $ = cheerio.load('<html><head><title>Too Many Requests</title></head><body>Slow down</body></html>');
    const result = ResponseValidator.validate($, {
      status: 429,
      url: 'https://www.example.com/product/123',
      platform: 'generic'
    });

    expect(result.isValid).toBe(false);
    expect(result.category).toBe(ErrorCategory.RATE_LIMITED);
    expect(result.isBlock).toBe(true);
  });

  it('identifies HTTP 403 Access Denied', () => {
    const $ = cheerio.load('<html><head><title>Access Denied</title></head><body>403 Forbidden</body></html>');
    const result = ResponseValidator.validate($, {
      status: 403,
      url: 'https://www.example.com/product/123',
      platform: 'generic'
    });

    expect(result.isValid).toBe(false);
    expect(result.category).toBe(ErrorCategory.ACCESS_DENIED);
    expect(result.isBlock).toBe(true);
  });
});
