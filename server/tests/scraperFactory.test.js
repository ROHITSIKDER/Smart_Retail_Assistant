import { describe, it, expect } from 'vitest';
import { ScraperFactory } from '../services/scrapers/scraperFactory.js';
import { AmazonScraper } from '../services/scrapers/amazonScraper.js';
import { FlipkartScraper } from '../services/scrapers/flipkartScraper.js';
import { GenericScraper } from '../services/scrapers/genericScraper.js';
import { WalmartScraper } from '../services/scrapers/walmartScraper.js';
import { TargetScraper } from '../services/scrapers/targetScraper.js';
import { EbayScraper } from '../services/scrapers/ebayScraper.js';
import { MyntraScraper } from '../services/scrapers/myntraScraper.js';

describe('ScraperFactory', () => {
  it('routes Amazon URLs to AmazonScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.amazon.in/dp/B08N5WRWNW');
    expect(scraper).toBeInstanceOf(AmazonScraper);
  });

  it('routes Flipkart URLs to FlipkartScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.flipkart.com/product/p/itm123');
    expect(scraper).toBeInstanceOf(FlipkartScraper);
  });

  it('routes Walmart URLs to WalmartScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.walmart.com/ip/example/123');
    expect(scraper).toBeInstanceOf(WalmartScraper);
  });

  it('routes Target URLs to TargetScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.target.com/p/example/-/A-123');
    expect(scraper).toBeInstanceOf(TargetScraper);
  });

  it('routes eBay URLs to EbayScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.ebay.com/itm/example/123');
    expect(scraper).toBeInstanceOf(EbayScraper);
  });

  it('routes Myntra URLs to MyntraScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.myntra.com/shoes/example/123/buy');
    expect(scraper).toBeInstanceOf(MyntraScraper);
  });

  it('routes unknown URLs to GenericScraper', () => {
    const scraper = ScraperFactory.getScraper('https://www.example-store.com/products/chair');
    expect(scraper).toBeInstanceOf(GenericScraper);
  });
});
