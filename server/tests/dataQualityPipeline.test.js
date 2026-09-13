import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import { BaseScraper, DataQualityState } from '../services/scrapers/baseScraper.js';
import { AmazonScraper } from '../services/scrapers/amazonScraper.js';
import { FlipkartScraper } from '../services/scrapers/flipkartScraper.js';
import { WalmartScraper } from '../services/scrapers/walmartScraper.js';
import { GenericScraper } from '../services/scrapers/genericScraper.js';
import { ScraperFactory } from '../services/scrapers/scraperFactory.js';
import { MockAI } from '../services/ai/mockAI.js';
import { AnalysisService } from '../services/analysisService.js';
import { ErrorCategory } from '../utils/responseValidator.js';
import { ExtractionError } from '../utils/extractionError.js';

describe('Data Quality States & Pipeline Reliability Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Review Count Handling & Quality States in Scrapers', () => {
    it('1. Handles 0 reviews without throwing, preserves product metadata, and assigns NO_REVIEWS_FOUND', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Smart Electric Kettle - HomeAppliance</title>
            <meta property="og:title" content="Smart Electric Kettle 1.7L" />
            <meta property="og:image" content="https://example.com/kettle.jpg" />
          </head>
          <body>
            <h1>Smart Electric Kettle 1.7L</h1>
            <span class="product-price">$49.99</span>
          </body>
        </html>
      `;
      const scraper = new GenericScraper('https://example.com/products/kettle');
      vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

      const result = await scraper.scrape();
      expect(result.platform).toBe('generic');
      expect(result.title).toBe('Smart Electric Kettle 1.7L');
      expect(result.price).toBe('$49.99');
      expect(result.imageUrl).toBe('https://example.com/kettle.jpg');
      expect(result.reviews).toEqual([]);
      expect(result.reviewCount).toBe(0);
      expect(result.dataQualityState).toBe(DataQualityState.NO_REVIEWS_FOUND);
      expect(result.diagnostics.reviewStatus).toBe(DataQualityState.NO_REVIEWS_FOUND);
      expect(result.diagnostics.productStatus).toBe('SUCCESS');
    });

    it('2. Handles 1 review without throwing, returns product metadata, and assigns LIMITED_REVIEWS', async () => {
      const html = `
        <div id="productTitle">Noise Cancelling Earbuds</div>
        <div class="a-price"><span class="a-offscreen">$79.99</span></div>
        <div id="landingImage" src="https://example.com/earbuds.jpg"></div>
        <div data-hook="review-body">
          <span>Decent sound quality for the price, battery lasts about 5 hours.</span>
        </div>
      `;
      const scraper = new AmazonScraper('https://www.amazon.com/dp/B08XYZ1234');
      vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

      const result = await scraper.scrape();
      expect(result.platform).toBe('amazon');
      expect(result.title).toBe('Noise Cancelling Earbuds');
      expect(result.price).toBe('$79.99');
      expect(result.reviews).toHaveLength(1);
      expect(result.reviewCount).toBe(1);
      expect(result.dataQualityState).toBe(DataQualityState.LIMITED_REVIEWS);
      expect(result.diagnostics.reviewStatus).toBe(DataQualityState.LIMITED_REVIEWS);
    });

    it('3. Handles 2 reviews without throwing, returns product metadata, and assigns LIMITED_REVIEWS', async () => {
      const html = `
        <span class="B_NuT2">Mechanical Gaming Keyboard RGB</span>
        <div class="_30jeq3">₹ 3,499</div>
        <img class="_396cs4 _2amPTt" src="https://example.com/keyboard.jpg" />
        <div class="t-ZTfl">Key switches feel very tactile and responsive for gaming.</div>
        <div class="ZmyHeo">RGB lighting is customizable, but software is slightly clunky.</div>
      `;
      const scraper = new FlipkartScraper('https://www.flipkart.com/keyboard/p/itm12345');
      vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

      const result = await scraper.scrape();
      expect(result.platform).toBe('flipkart');
      expect(result.title).toBe('Mechanical Gaming Keyboard RGB');
      expect(result.price).toBe('₹ 3,499');
      expect(result.reviews).toHaveLength(2);
      expect(result.reviewCount).toBe(2);
      expect(result.dataQualityState).toBe(DataQualityState.LIMITED_REVIEWS);
      expect(result.diagnostics.reviewStatus).toBe(DataQualityState.LIMITED_REVIEWS);
    });

    it('4. Handles 3+ reviews, returns product metadata, and assigns REVIEWS_AVAILABLE', async () => {
      const html = `
        <h1 itemprop="name">Stainless Steel Microwave Oven</h1>
        <span itemprop="price">$129.00</span>
        <img itemprop="image" src="https://example.com/microwave.jpg" />
        <div itemprop="reviewBody">Heats food evenly and quickly. Looks great in the kitchen.</div>
        <div itemprop="reviewBody">Controls are intuitive and easy to clean the interior.</div>
        <div itemprop="reviewBody">Beep alert is a bit loud, but overall fantastic value.</div>
      `;
      const scraper = new WalmartScraper('https://www.walmart.com/ip/microwave/987654');
      vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

      const result = await scraper.scrape();
      expect(result.platform).toBe('walmart');
      expect(result.title).toBe('Stainless Steel Microwave Oven');
      expect(result.reviews).toHaveLength(3);
      expect(result.reviewCount).toBe(3);
      expect(result.dataQualityState).toBe(DataQualityState.REVIEWS_AVAILABLE);
      expect(result.diagnostics.reviewStatus).toBe(DataQualityState.REVIEWS_AVAILABLE);
    });
  });

  describe('Technical Error Handling (Blocked Source, Scraping Exception, Missing Metadata)', () => {
    it('5. Reports blocked source technical failures correctly with SOURCE_BLOCKED categorization', async () => {
      const scraper = new AmazonScraper('https://www.amazon.com/dp/B08N5WRWNW');
      vi.spyOn(scraper, 'fetchWithAxios').mockResolvedValue({
        $: cheerio.load('<title>Robot Check</title><body>Type the characters you see below</body>'),
        status: 200,
        dataLength: 100
      });
      vi.spyOn(scraper, 'fetchValidatedHtml').mockRejectedValue(
        new ExtractionError('Robot Check triggered', {
          category: ErrorCategory.BOT_BLOCKED,
          statusCode: 502,
          platform: 'amazon'
        })
      );

      await expect(scraper.scrape()).rejects.toMatchObject({
        category: ErrorCategory.BOT_BLOCKED
      });
    });

    it('6. Reports scraping exception (network failure) correctly with statusCode 502', async () => {
      const scraper = new GenericScraper('https://example.com/product/crash');
      vi.spyOn(scraper, 'fetchWithAxios').mockRejectedValue(new Error('ETIMEDOUT: Connection timed out'));

      await expect(scraper.scrape()).rejects.toMatchObject({
        name: 'ExtractionError',
        category: ErrorCategory.NETWORK_ERROR,
        statusCode: 502
      });
    });

    it('7. Rejects missing product metadata with LAYOUT_CHANGED / INVALID_PRODUCT_PAGE and productStatus FAILED', async () => {
      const html = '<html><body><div>No title or recognizable product data here</div></body></html>';
      const scraper = new AmazonScraper('https://www.amazon.com/dp/B08EMPTY');
      vi.spyOn(scraper, 'fetchValidatedHtml').mockResolvedValue(cheerio.load(html));

      await expect(scraper.scrape()).rejects.toMatchObject({
        category: ErrorCategory.LAYOUT_CHANGED,
        statusCode: 422
      });
      expect(scraper.diagnostics.productStatus).toBe('FAILED');
    });
  });

  describe('Data Quality Rule Enforcement (No Synthetic or Fabricated Reviews)', () => {
    it('8. MockAI never fabricates reviews or claims consensus when review count is 0', async () => {
      const mockAI = new MockAI();
      const productInfo = {
        title: 'Minimalist Desk Lamp',
        brand: 'HomeBrand',
        price: '$25.00',
        rating: 0
      };

      const report = await mockAI.generateReport(productInfo, []);
      expect(report.verdict).toBe('CONSIDER WITH CAUTION');
      expect(report.confidenceScore).toBe(30);
      expect(report.summary).toContain('no verified customer reviews');
      expect(report.summary).not.toContain('overwhelmingly positive feedback from buyers');
      expect(report.keyThemes).toContain('Unreviewed Product');
      expect(report.cons.some((c) => c.point.includes('Zero customer reviews'))).toBe(true);
    });

    it('9. MockAI synthesizes only authentic text without extrapolating consensus when 1 review is present', async () => {
      const mockAI = new MockAI();
      const productInfo = {
        title: 'Portable Blender',
        brand: 'BlendPro',
        price: '$39.00',
        rating: 4.5
      };
      const singleReview = ['Motor works well for smoothies, but charging takes 3 hours.'];

      const report = await mockAI.generateReport(productInfo, singleReview);
      expect(report.confidenceScore).toBe(45);
      expect(report.summary).toContain('limited to 1 review(s)');
      expect(report.pros[0].point).toContain('Motor works well for smoothies');
      expect(report.cons.some((c) => c.point.includes('Extremely limited review sample size'))).toBe(true);
    });

    it('10. AnalysisService integrates full flow for 0 reviews without premature failure', async () => {
      const mockScraped = {
        platform: 'generic',
        productId: 'item-001',
        title: 'Unreviewed Ergonomic Mouse',
        brand: 'TechGrip',
        price: '$19.99',
        rating: 0,
        reviewCount: 0,
        imageUrl: 'https://example.com/mouse.jpg',
        reviews: [],
        dataQualityState: DataQualityState.NO_REVIEWS_FOUND,
        diagnostics: { productStatus: 'SUCCESS', reviewStatus: DataQualityState.NO_REVIEWS_FOUND }
      };

      vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
        scrape: vi.fn().mockResolvedValue(mockScraped)
      });

      const result = await AnalysisService.analyzeProductUrl('https://example.com/item-001', true);
      expect(result.source).toBe('live');
      expect(result.data.dataQualityState).toBe(DataQualityState.NO_REVIEWS_FOUND);
      expect(result.data.reviewsAnalyzedCount).toBe(0);
      expect(result.data.rawReviewsSample).toEqual([]);
      expect(result.data.productInfo.title).toBe('Unreviewed Ergonomic Mouse');
      expect(result.data.report.confidenceScore).toBe(30);
      expect(result.data.report.verdict).toBe('CONSIDER WITH CAUTION');
    });

    it('11. AnalysisService categorizes blocked source as SOURCE_BLOCKED', async () => {
      vi.spyOn(ScraperFactory, 'getScraper').mockReturnValue({
        scrape: vi.fn().mockRejectedValue(
          new ExtractionError('Access Denied by Cloudflare', {
            category: ErrorCategory.BOT_BLOCKED,
            statusCode: 502,
            platform: 'amazon'
          })
        )
      });

      await expect(
        AnalysisService.analyzeProductUrl('https://www.amazon.com/dp/B08BLOCKED', true)
      ).rejects.toMatchObject({
        category: ErrorCategory.BOT_BLOCKED,
        dataQualityState: DataQualityState.SOURCE_BLOCKED
      });
    });
  });
});
