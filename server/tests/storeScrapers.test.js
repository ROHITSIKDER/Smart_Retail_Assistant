import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { AmazonScraper } from '../services/scrapers/amazonScraper.js';
import { FlipkartScraper } from '../services/scrapers/flipkartScraper.js';
import { WalmartScraper } from '../services/scrapers/walmartScraper.js';
import { TargetScraper } from '../services/scrapers/targetScraper.js';
import { EbayScraper } from '../services/scrapers/ebayScraper.js';
import { MyntraScraper } from '../services/scrapers/myntraScraper.js';
import { GenericScraper } from '../services/scrapers/genericScraper.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('Store scrapers with sanitized HTML fixtures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AmazonScraper parses valid fixture HTML, extracts ASIN, product info, and reviews', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'amazon_product_valid.html'), 'utf-8');
    const scraper = new AmazonScraper('https://www.amazon.com/dp/B08N5WRWNW');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('amazon');
    expect(result.productId).toBe('B08N5WRWNW');
    expect(result.title).toContain('Sony WH-1000XM5');
    expect(result.price).toBe('$399.99');
    expect(result.rating).toBe(4.6);
    expect(result.reviews).toHaveLength(3);
    expect(result.diagnostics.productStatus).toBe('SUCCESS');
    expect(result.diagnostics.reviewStatus).toBe('REVIEWS_AVAILABLE');
    expect(result.dataQualityState).toBe('REVIEWS_AVAILABLE');
  });

  it('AmazonScraper uses JSON-LD fallback when primary selectors are absent', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'amazon_jsonld_product.html'), 'utf-8');
    const scraper = new AmazonScraper('https://www.amazon.com/dp/B0CX23V2ZH');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('amazon');
    expect(result.productId).toBe('B0CX23V2ZH');
    expect(result.title).toContain('MacBook Air');
    expect(result.brand).toBe('Apple');
    expect(result.price).toBe('USD 1299.00');
    expect(result.rating).toBe(4.8);
    expect(result.reviews).toHaveLength(3);
  });

  it('FlipkartScraper parses valid fixture HTML, extracts PID, product info, and reviews', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'flipkart_product_valid.html'), 'utf-8');
    const scraper = new FlipkartScraper('https://www.flipkart.com/asus-vivobook/p/itm12345678abcdef');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('flipkart');
    expect(result.productId).toBe('itm12345678abcdef');
    expect(result.title).toContain('ASUS Vivobook');
    expect(result.price).toBe('₹ 49,990');
    expect(result.rating).toBe(4.3);
    expect(result.reviews).toHaveLength(3);
  });

  it('WalmartScraper parses @graph JSON-LD fixture and extracts Item ID', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'walmart_product_graph_jsonld.html'), 'utf-8');
    const scraper = new WalmartScraper('https://www.walmart.com/ip/Ninja-Blender/87654321');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('walmart');
    expect(result.productId).toBe('87654321');
    expect(result.title).toBe('Ninja Professional Countertop Blender');
    expect(result.brand).toBe('Ninja');
    expect(result.price).toBe('USD 79.99');
    expect(result.rating).toBe(4.7);
    expect(result.reviews).toHaveLength(3);
  });

  it('TargetScraper parses valid fixture HTML and extracts TCIN', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'target_product_valid.html'), 'utf-8');
    const scraper = new TargetScraper('https://www.target.com/p/bose-speaker/-/A-82639102');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('target');
    expect(result.productId).toBe('82639102');
    expect(result.title).toBe('Bose SoundLink Flex Bluetooth Speaker');
    expect(result.price).toBe('$149.00');
    expect(result.rating).toBe(4.8);
    expect(result.reviews).toHaveLength(3);
  });

  it('EbayScraper parses valid fixture HTML and extracts Item ID', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'ebay_product_valid.html'), 'utf-8');
    const scraper = new EbayScraper('https://www.ebay.com/itm/Sony-Camera/334567890123');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('ebay');
    expect(result.productId).toBe('334567890123');
    expect(result.title).toContain('Sony Alpha a6400');
    expect(result.price).toBe('US $898.00');
    expect(result.rating).toBe(4.9);
    expect(result.reviews).toHaveLength(3);
  });

  it('MyntraScraper parses valid fixture HTML and extracts Style ID', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'myntra_product_valid.html'), 'utf-8');
    const scraper = new MyntraScraper('https://www.myntra.com/shoes/nike/12345678/buy');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('myntra');
    expect(result.productId).toBe('12345678');
    expect(result.title).toBe('Nike Air Max 270 Men Sneakers');
    expect(result.price).toBe('₹ 11,495');
    expect(result.rating).toBe(4.4);
    expect(result.reviews).toHaveLength(3);
  });

  it('GenericScraper parses @graph JSON-LD fixture and extracts product data', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'generic_graph_jsonld.html'), 'utf-8');
    const scraper = new GenericScraper('https://www.example.com/products/office-chair');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('generic');
    expect(result.productId).toBe('office-chair');
    expect(result.title).toBe('Ergonomic High-Back Executive Office Chair');
    expect(result.brand).toBe('ErgoFlex');
    expect(result.price).toBe('USD 249.00');
    expect(result.rating).toBe(4.7);
    expect(result.reviews).toHaveLength(3);
  });

  it('GenericScraper separates product extraction from review extraction and returns LIMITED_REVIEWS for single review', async () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'insufficient_reviews.html'), 'utf-8');
    const scraper = new GenericScraper('https://www.example.com/products/lamp');
    vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

    const result = await scraper.scrape();
    expect(result.platform).toBe('generic');
    expect(result.title).toBe('Minimalist LED Desk Lamp');
    expect(result.price).toBe('$35.00');
    expect(result.reviews).toHaveLength(1);
    expect(result.dataQualityState).toBe('LIMITED_REVIEWS');
  });
});
