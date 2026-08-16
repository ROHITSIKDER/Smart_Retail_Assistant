import { GenericScraper } from './genericScraper.js';
import { getPlatformEntry } from '../../utils/platformDetector.js';

export class ScraperFactory {
  static getScraper(url) {
    const entry = getPlatformEntry(url);
    if (entry) {
      return new entry.ScraperClass(url);
    }
    return new GenericScraper(url);
  }
}
