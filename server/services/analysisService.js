import crypto from 'crypto';
import Analysis from '../models/Analysis.js';
import { getIsMongoConnected } from '../config/db.js';
import { ScraperFactory } from './scrapers/scraperFactory.js';
import { DataQualityState } from './scrapers/baseScraper.js';
import { ErrorCategory } from '../utils/responseValidator.js';
import { AIFactory } from './ai/aiFactory.js';

// In-memory cache fallback if MongoDB is disconnected
const inMemoryCache = new Map();
// In-flight requests map to handle concurrent duplicate requests (mutex lock)
const inFlightRequests = new Map();

export class AnalysisService {
  static hashUrl(url) {
    try {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.delete('ref');
      parsedUrl.searchParams.delete('utm_source');
      parsedUrl.searchParams.delete('utm_medium');
      parsedUrl.searchParams.delete('utm_campaign');
      parsedUrl.searchParams.delete('tag');
      const cleanUrl = parsedUrl.toString();
      return crypto.createHash('sha256').update(cleanUrl).digest('hex');
    } catch {
      return crypto.createHash('sha256').update(url).digest('hex');
    }
  }

  static async analyzeProductUrl(url, forceRefresh = false, options = {}) {
    const { signal = null, deadline = null } = options;
    const urlHash = this.hashUrl(url);

    // 1. Check MongoDB Cache (or in-memory cache) unless forceRefresh is set
    if (!forceRefresh) {
      if (getIsMongoConnected()) {
        try {
          const cached = await Analysis.findOne({ urlHash });
          if (cached) {
            console.log(`[Cache Hit] Returning cached analysis for URL hash: ${urlHash.slice(0, 8)}`);
            return {
              source: 'cache',
              data: cached
            };
          }
        } catch (err) {
          console.warn(`[Cache Warning] DB lookup error: ${err.message}`);
        }
      }

      if (inMemoryCache.has(urlHash)) {
        console.log(`[Memory Cache Hit] Returning memory cached analysis for URL hash: ${urlHash.slice(0, 8)}`);
        return {
          source: 'memory-cache',
          data: inMemoryCache.get(urlHash)
        };
      }
    }

    // 2. Prevent concurrent duplicate analyses for the same URL (Race Condition Lock)
    if (inFlightRequests.has(urlHash)) {
      console.log(`[In-Flight Mutex] Waiting for parallel request for URL hash: ${urlHash.slice(0, 8)}`);
      return await inFlightRequests.get(urlHash);
    }

    // 3. Initiate analysis job with lock
    const analysisPromise = (async () => {
      if (signal?.aborted) {
        throw signal.reason || new Error('Request aborted before execution');
      }

      // Scrape Product & Reviews
      console.log(`[Scraper] Starting data extraction for: ${url}`);
      const scraper = ScraperFactory.getScraper(url);
      let scrapedData;
      try {
        scrapedData = await scraper.scrape({ signal, deadline });
      } catch (error) {
        const isBlocked = [
          ErrorCategory.BOT_BLOCKED,
          ErrorCategory.CAPTCHA,
          ErrorCategory.ACCESS_DENIED,
          ErrorCategory.RATE_LIMITED,
          ErrorCategory.LOGIN_REQUIRED
        ].includes(error.category);

        error.dataQualityState = isBlocked
          ? DataQualityState.SOURCE_BLOCKED
          : DataQualityState.SCRAPE_FAILED;

        console.warn(
          `[Scraper] Failed: URL="${url}" | Scraping status="${error.dataQualityState}" | Category="${error.category || 'UNKNOWN'}" | Reason="${error.message}"`
        );
        throw error;
      }

      if (signal?.aborted) {
        throw signal.reason || new Error('Request aborted after scraping');
      }

      console.log(
        `[Scraper] Completed: URL="${url}" | Source="${scrapedData.platform}" | Reviews found=${scrapedData.reviews.length} | Scraping status="${scrapedData.dataQualityState}"`
      );

      // Synthesize with AI Engine
      console.log(`[AI Engine] Synthesizing review insights for: "${scrapedData.title}" (Quality: ${scrapedData.dataQualityState})`);
      const aiProvider = AIFactory.getAIProvider();
      const remainingForAI = deadline ? Math.max(1000, deadline - Date.now() - 1000) : 6000;
      const aiTimeout = Math.min(6000, remainingForAI);

      const aiReport = await aiProvider.generateReport(
        {
          title: scrapedData.title,
          brand: scrapedData.brand,
          price: scrapedData.price,
          rating: scrapedData.rating,
          dataQualityState: scrapedData.dataQualityState
        },
        scrapedData.reviews,
        {
          timeout: aiTimeout,
          signal
        }
      );

      // Construct Final Document
      const resultDoc = {
        url,
        urlHash,
        platform: scrapedData.platform,
        dataQualityState: scrapedData.dataQualityState,
        productInfo: {
          productId: scrapedData.productId || '',
          title: scrapedData.title,
          brand: scrapedData.brand,
          price: scrapedData.price,
          rating: scrapedData.rating,
          reviewCount: scrapedData.reviewCount,
          imageUrl: scrapedData.imageUrl,
        },
        report: aiReport,
        reviewsAnalyzedCount: scrapedData.reviews.length,
        rawReviewsSample: scrapedData.reviews.slice(0, 5)
      };

      console.log(
        `[Pipeline Decision] URL="${url}" | Source="${resultDoc.platform}" | Quality="${resultDoc.dataQualityState}" | Verdict="${resultDoc.report.verdict}" | Confidence=${resultDoc.report.confidenceScore}%`
      );

      // Save to Cache if DB connected, else memory cache
      if (getIsMongoConnected()) {
        try {
          const updatedRecord = await Analysis.findOneAndUpdate(
            { urlHash },
            { $set: resultDoc },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          return {
            source: 'live',
            data: updatedRecord
          };
        } catch (err) {
          console.warn(`[Cache Warning] Could not persist to DB (${err.message}). Saved to memory cache.`);
        }
      }

      // Evict oldest entry if memory cache exceeds 100 items
      if (inMemoryCache.size >= 100) {
        const oldestKey = inMemoryCache.keys().next().value;
        if (oldestKey) inMemoryCache.delete(oldestKey);
      }

      inMemoryCache.set(urlHash, { ...resultDoc, createdAt: new Date() });
      return {
        source: 'live',
        data: resultDoc
      };
    })();

    inFlightRequests.set(urlHash, analysisPromise);

    try {
      return await analysisPromise;
    } finally {
      inFlightRequests.delete(urlHash);
    }
  }

  static async getRecentHistory(limit = 10) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 10, 50));

    if (getIsMongoConnected()) {
      try {
        const history = await Analysis.find()
          .sort({ createdAt: -1 })
          .limit(safeLimit)
          .select('url platform dataQualityState productInfo report.verdict report.summary createdAt');
        return history;
      } catch (err) {
        console.warn(`[History Warning] DB lookup error: ${err.message}`);
      }
    }

    // Return memory cache values (newest first) if DB unavailable
    const items = Array.from(inMemoryCache.values()).reverse().slice(0, safeLimit);
    return items;
  }
}

