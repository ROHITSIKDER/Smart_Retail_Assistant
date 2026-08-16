import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import { BaseScraper } from '../services/scrapers/baseScraper.js';
import { HeadlessScraper } from '../services/scrapers/headlessScraper.js';
import { ErrorCategory } from '../utils/responseValidator.js';
import { ExtractionError } from '../utils/extractionError.js';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

class TestScraper extends BaseScraper {
  async scrape() {
    return {};
  }
}

const PRODUCT_JSON_LD = `
<html>
  <head>
    <script type="application/ld+json">
      {
        "@type": "Product",
        "name": "Test Wireless Headphones",
        "brand": { "@type": "Brand", "name": "AudioPro" },
        "offers": { "priceCurrency": "USD", "price": "79.99" },
        "aggregateRating": { "ratingValue": "4.5" },
        "image": "https://example.com/headphones.jpg",
        "review": [
          { "reviewBody": "Excellent sound quality and comfortable fit for long sessions." },
          { "reviewBody": "Battery life is great but the case feels a bit cheap." },
          { "reviewBody": "Good value for money with reliable Bluetooth connectivity." }
        ]
      }
    </script>
  </head>
  <body></body>
</html>
`;

describe('BaseScraper.extractJsonLd', () => {
  it('extracts product details from single JSON-LD script tags', () => {
    const scraper = new TestScraper('https://example.com/product');
    const $ = cheerio.load(PRODUCT_JSON_LD);
    const details = scraper.extractJsonLd($);

    expect(details.title).toBe('Test Wireless Headphones');
    expect(details.brand).toBe('AudioPro');
    expect(details.price).toBe('USD 79.99');
    expect(details.rating).toBe(4.5);
    expect(details.imageUrl).toBe('https://example.com/headphones.jpg');
    expect(details.reviews).toHaveLength(3);
  });

  it('extracts product details from @graph JSON-LD structures', () => {
    const scraper = new TestScraper('https://example.com/chair');
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'generic_graph_jsonld.html'), 'utf-8');
    const $ = cheerio.load(html);
    const details = scraper.extractJsonLd($);

    expect(details.title).toBe('Ergonomic High-Back Executive Office Chair');
    expect(details.brand).toBe('ErgoFlex');
    expect(details.price).toBe('USD 249.00');
    expect(details.rating).toBe(4.7);
    expect(details.reviews).toHaveLength(3);
  });

  it('handles malformed JSON-LD script tags gracefully without throwing', () => {
    const scraper = new TestScraper('https://example.com/product');
    const $ = cheerio.load(`
      <html>
        <head>
          <script type="application/ld+json">{ broken json content: invalid }</script>
          <meta property="og:title" content="Fallback Title" />
        </head>
        <body></body>
      </html>
    `);
    const details = scraper.extractJsonLd($);

    expect(details.title).toBe('Fallback Title');
    expect(details.reviews).toEqual([]);
  });

  it('falls back to OpenGraph title when JSON-LD is missing', () => {
    const scraper = new TestScraper('https://example.com/product');
    const $ = cheerio.load(`
      <html>
        <head>
          <meta property="og:title" content="OG Product Title" />
          <meta property="og:image" content="https://example.com/og.jpg" />
        </head>
      </html>
    `);
    const details = scraper.extractJsonLd($);

    expect(details.title).toBe('OG Product Title');
    expect(details.imageUrl).toBe('https://example.com/og.jpg');
  });
});

describe('BaseScraper.fetchValidatedHtml & Fallback Strategy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers Headless Browser Fallback when Direct HTTP returns bot-blocked response with HTTP 200', async () => {
    const scraper = new TestScraper('https://www.example.com/product/123');
    const blockedHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'flipkart_blocked_200.html'), 'utf-8');
    const validHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'flipkart_product_valid.html'), 'utf-8');

    // Direct HTTP returns blocked HTML
    vi.spyOn(scraper, 'fetchWithAxios').mockResolvedValue({
      $: cheerio.load(blockedHtml),
      status: 200,
      dataLength: blockedHtml.length
    });

    // Browser fallback returns rendered valid HTML
    const browserSpy = vi.spyOn(HeadlessScraper, 'fetchRenderedHtml').mockResolvedValue(cheerio.load(validHtml));

    const result$ = await scraper.fetchValidatedHtml({ platform: 'flipkart' });
    expect(browserSpy).toHaveBeenCalled();
    expect(result$('span.B_NuT2').text()).toContain('ASUS Vivobook');
    expect(scraper.diagnostics.fallbackAttempted).toBe(true);
    expect(scraper.diagnostics.fallbackResult).toBe('SUCCESS');
  });

  it('handles empty or malformed HTML by triggering browser fallback or structured failure', async () => {
    const scraper = new TestScraper('https://www.example.com/empty');
    vi.spyOn(scraper, 'fetchWithAxios').mockResolvedValue({
      $: cheerio.load(''),
      status: 200,
      dataLength: 0
    });

    const browserSpy = vi.spyOn(HeadlessScraper, 'fetchRenderedHtml').mockResolvedValue(null);

    await expect(scraper.fetchValidatedHtml({ platform: 'generic', maxRetries: 1 })).rejects.toMatchObject({
      name: 'ExtractionError'
    });
  });

  it('throws structured ExtractionError when both direct HTTP and browser fallback are blocked', async () => {
    const scraper = new TestScraper('https://www.amazon.com/dp/B08N5WRWNW');
    const captchaHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'amazon_robot_check_200.html'), 'utf-8');

    vi.spyOn(scraper, 'fetchWithAxios').mockResolvedValue({
      $: cheerio.load(captchaHtml),
      status: 200,
      dataLength: captchaHtml.length
    });

    await expect(scraper.fetchValidatedHtml({ platform: 'amazon', maxRetries: 1 })).rejects.toMatchObject({
      name: 'ExtractionError',
      category: ErrorCategory.CAPTCHA,
      statusCode: 502
    });
  });

  it('redacts diagnostics and does not leak credentials or full HTML', () => {
    const scraper = new TestScraper('https://www.example.com/product');
    scraper.diagnostics.blockClassification = ErrorCategory.BOT_BLOCKED;
    const diag = scraper.getRedactedDiagnostics();

    expect(diag).toHaveProperty('url');
    expect(diag).toHaveProperty('strategy');
    expect(diag).toHaveProperty('blockClassification', ErrorCategory.BOT_BLOCKED);
    expect(diag).not.toHaveProperty('auth');
    expect(diag).not.toHaveProperty('password');
    expect(diag).not.toHaveProperty('cookies');
  });
});
