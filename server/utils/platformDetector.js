import { AmazonScraper } from '../services/scrapers/amazonScraper.js';
import { FlipkartScraper } from '../services/scrapers/flipkartScraper.js';
import { GenericScraper } from '../services/scrapers/genericScraper.js';
import { WalmartScraper } from '../services/scrapers/walmartScraper.js';
import { TargetScraper } from '../services/scrapers/targetScraper.js';
import { EbayScraper } from '../services/scrapers/ebayScraper.js';
import { MyntraScraper } from '../services/scrapers/myntraScraper.js';

export const PLATFORM_REGISTRY = [
  { match: /amazon\./i, id: 'amazon', label: 'Amazon', ScraperClass: AmazonScraper, headlessFirst: false },
  { match: /flipkart\./i, id: 'flipkart', label: 'Flipkart', ScraperClass: FlipkartScraper, headlessFirst: false },
  { match: /walmart\./i, id: 'walmart', label: 'Walmart', ScraperClass: WalmartScraper, headlessFirst: true },
  { match: /target\./i, id: 'target', label: 'Target', ScraperClass: TargetScraper, headlessFirst: true },
  { match: /ebay\./i, id: 'ebay', label: 'eBay', ScraperClass: EbayScraper, headlessFirst: true },
  { match: /myntra\./i, id: 'myntra', label: 'Myntra', ScraperClass: MyntraScraper, headlessFirst: true }
];

export const PLATFORM_IDS = [...PLATFORM_REGISTRY.map((entry) => entry.id), 'generic'];

export function detectPlatform(url) {
  if (!url || typeof url !== 'string') {
    return { id: 'generic', label: 'Generic E-Commerce', headlessFirst: false };
  }

  const entry = PLATFORM_REGISTRY.find((platform) => platform.match.test(url));
  if (entry) {
    return { id: entry.id, label: entry.label, headlessFirst: entry.headlessFirst };
  }

  return { id: 'generic', label: 'Generic E-Commerce', headlessFirst: false };
}

export function getPlatformEntry(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  return PLATFORM_REGISTRY.find((platform) => platform.match.test(url)) || null;
}
