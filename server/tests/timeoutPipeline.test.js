import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as cheerio from 'cheerio';
import { app } from '../server.js';
import { AnalysisService } from '../services/analysisService.js';
import { ScraperFactory } from '../services/scrapers/scraperFactory.js';
import { BaseScraper, DataQualityState } from '../services/scrapers/baseScraper.js';
import { GeminiAI } from '../services/ai/geminiAI.js';
import { ErrorCategory } from '../utils/responseValidator.js';
import { ExtractionError } from '../utils/extractionError.js';

describe('SMART RETAIL ASSISTANT — TASK 2: Timeout Pipeline & Cancellation Tests', () => {
  const originalEnvTimeout = process.env.ANALYSIS_REQUEST_TIMEOUT_MS;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANALYSIS_REQUEST_TIMEOUT_MS;
  });

  afterEach(() => {
    if (originalEnvTimeout) {
      process.env.ANALYSIS_REQUEST_TIMEOUT_MS = originalEnvTimeout;
    } else {
      delete process.env.ANALYSIS_REQUEST_TIMEOUT_MS;
    }
  });

  // 1. Successful Scrape within Budget
  it('1. Successfully executes scrape and AI analysis within budget', async () => {
    const mockScraped = {
      platform: 'generic',
      productId: 'item-valid-100',
      title: 'Ergonomic Standing Desk',
      brand: 'FlexiWork',
      price: '$299.00',
      rating: 4.8,
      reviewCount: 5,
      imageUrl: 'https://example.com/desk.jpg',
      reviews: [
        'Fantastic build quality and very smooth height adjustment motor.',
        'Plenty of room for dual monitor setup, instructions were clear.',
        'Sturdy steel legs and no wobbling even at maximum height extension.'
      ],
      dataQualityState: DataQualityState.REVIEWS_AVAILABLE,
      diagnostics: { productStatus: 'SUCCESS', reviewStatus: DataQualityState.REVIEWS_AVAILABLE }
    };

    vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
      scrape: vi.fn().mockResolvedValue(mockScraped)
    });

    const res = await request(app)
      .post('/api/v1/analyze')
      .send({ url: 'https://example.com/products/standing-desk', forceRefresh: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.source).toBe('live');
    expect(res.body.data.productInfo.title).toBe('Ergonomic Standing Desk');
    expect(res.body.data.report.verdict).toBeDefined();
    expect(res.body.data.dataQualityState).toBe(DataQualityState.REVIEWS_AVAILABLE);
  });

  // 2. Backend Request Timeout (HTTP 504)
  it('2. Enforces backend request timeout and returns HTTP 504 Gateway Timeout when pipeline stalls', async () => {
    // Configure tight 60ms timeout for test
    process.env.ANALYSIS_REQUEST_TIMEOUT_MS = '60';

    vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
      scrape: vi.fn().mockImplementation(({ signal }) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({
              platform: 'generic',
              title: 'Should Have Timed Out',
              reviews: []
            });
          }, 300); // Exceeds 60ms deadline

          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(signal.reason || new Error('Aborted'));
            });
          }
        });
      })
    });

    const res = await request(app)
      .post('/api/v1/analyze')
      .send({ url: 'https://example.com/products/slow-item', forceRefresh: true });

    expect(res.status).toBe(504);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TIMEOUT');
    expect(res.body.category).toBe('TIMEOUT');
    expect(res.body.error).toContain('maximum time limit');
  });

  // 3. Frontend Timeout & Abort Cancellation
  it('3. Handles cancellation cleanly and frees inFlightRequests lock', async () => {
    const abortController = new AbortController();

    let wasAborted = false;
    vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
      scrape: vi.fn().mockImplementation(({ signal }) => {
        return new Promise((resolve, reject) => {
          if (signal?.aborted) {
            wasAborted = true;
            return reject(new Error('Cancelled immediately'));
          }
          signal?.addEventListener('abort', () => {
            wasAborted = true;
            reject(new Error('Operation aborted by client'));
          });
        });
      })
    });

    // Start request with signal
    const promise = AnalysisService.analyzeProductUrl('https://example.com/products/cancel-target', true, {
      signal: abortController.signal,
      deadline: Date.now() + 10000
    });

    // Abort after 20ms
    setTimeout(() => {
      abortController.abort(new Error('Client aborted analysis'));
    }, 20);

    await expect(promise).rejects.toThrow();
    expect(wasAborted).toBe(true);

    // Verify lock is freed: next request does not wait on dead promise
    const nextScraped = {
      platform: 'generic',
      productId: 'fresh-item',
      title: 'Fresh Fast Item',
      reviews: [],
      dataQualityState: DataQualityState.NO_REVIEWS_FOUND,
      diagnostics: { productStatus: 'SUCCESS' }
    };
    vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
      scrape: vi.fn().mockResolvedValue(nextScraped)
    });

    const secondResult = await AnalysisService.analyzeProductUrl('https://example.com/products/cancel-target', true);
    expect(secondResult.data.productInfo.title).toBe('Fresh Fast Item');
  });

  // 4. Scraper Retry Exhaustion & Deadline Bailing
  it('4. Classifies HTTP timeouts as TIMEOUT and bails out of retries when deadline budget is depleted', async () => {
    const scraper = new BaseScraper('https://example.com/products/timeout-page');

    // Simulate Axios connection timeout
    const timeoutError = new Error('timeout of 6000ms exceeded');
    timeoutError.code = 'ECONNABORTED';

    vi.spyOn(scraper, 'fetchWithAxios').mockRejectedValue(timeoutError);

    // Call with already-expired or minimal deadline (1ms) to test retry bailing
    const pastDeadline = Date.now() - 100;

    await expect(
      scraper.fetchValidatedHtml({
        platform: 'generic',
        deadline: pastDeadline,
        maxRetries: 2
      })
    ).rejects.toMatchObject({
      name: 'ExtractionError',
      category: ErrorCategory.TIMEOUT,
      statusCode: 504
    });
  });

  it('4b. Exhausts all allowed retries on persistent network failures and throws structured error', async () => {
    const scraper = new BaseScraper('https://example.com/products/network-fail');

    const networkError = new Error('ECONNRESET: Connection reset by peer');
    vi.spyOn(scraper, 'fetchWithAxios').mockRejectedValue(networkError);

    await expect(
      scraper.fetchValidatedHtml({
        platform: 'generic',
        deadline: Date.now() + 60000, // plenty of time
        maxRetries: 2,
        httpTimeout: 100
      })
    ).rejects.toMatchObject({
      name: 'ExtractionError',
      category: ErrorCategory.NETWORK_ERROR,
      statusCode: 502
    });

    expect(scraper.diagnostics.attempts).toBe(2);
  });

  // 5. AI Timeout Fallback
  it('5. Falls back gracefully to MockAI when Gemini API times out without crashing the pipeline', async () => {
    const gemini = new GeminiAI('mock_test_api_key_123');

    // Mock models.generateContent to hang longer than the 50ms timeout
    gemini.ai = {
      models: {
        generateContent: vi.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                text: JSON.stringify({
                  summary: 'Delayed summary',
                  verdict: 'BUY',
                  verdictReason: 'Great specs',
                  pros: [],
                  cons: [],
                  confidenceScore: 80,
                  keyThemes: []
                })
              });
            }, 300); // 300ms > 50ms timeout
          });
        })
      }
    };

    const productInfo = {
      title: 'Smart Coffee Maker',
      brand: 'BrewMaster',
      price: '$89.00',
      rating: 4.5
    };
    const reviews = ['Great coffee maker, brews quickly and stays hot for hours.'];

    const report = await gemini.generateReport(productInfo, reviews, {
      timeout: 50 // 50ms tight timeout
    });

    expect(report).toBeDefined();
    expect(report.isMock).toBe(true);
    expect(report.provider).toBe('mock');
    expect(report.fallbackReason).toBe('AI_TIMEOUT');
    expect(report.verdict).toBeDefined();
  });

  // 6. Blocked Source Classification
  it('6. Categorizes retailer anti-bot interstitial as SOURCE_BLOCKED with status 502', async () => {
    vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
      scrape: vi.fn().mockRejectedValue(
        new ExtractionError('Cloudflare Turnstile Challenge Detected', {
          category: ErrorCategory.CAPTCHA,
          statusCode: 502,
          platform: 'amazon'
        })
      )
    });

    const res = await request(app)
      .post('/api/v1/analyze')
      .send({ url: 'https://www.amazon.com/dp/B08CAPTCHA', forceRefresh: true });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.category).toBe(ErrorCategory.CAPTCHA);
    expect(res.body.dataQualityState).toBe(DataQualityState.SOURCE_BLOCKED);
    expect(res.body.error).toContain('Cloudflare Turnstile');
  });
});
