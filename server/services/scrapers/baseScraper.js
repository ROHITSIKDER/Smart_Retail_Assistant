import * as cheerio from 'cheerio';
import { ProxyManager } from './proxyManager.js';
import { HeadlessScraper } from './headlessScraper.js';
import { createSafeAxios } from '../../utils/safeFetch.js';
import { ResponseValidator, ErrorCategory } from '../../utils/responseValidator.js';
import { ExtractionError } from '../../utils/extractionError.js';

export const DataQualityState = {
  REVIEWS_AVAILABLE: 'REVIEWS_AVAILABLE',
  LIMITED_REVIEWS: 'LIMITED_REVIEWS',
  NO_REVIEWS_FOUND: 'NO_REVIEWS_FOUND',
  SOURCE_BLOCKED: 'SOURCE_BLOCKED',
  SCRAPE_FAILED: 'SCRAPE_FAILED'
};

export class BaseScraper {
  constructor(url) {
    this.url = url;
    this.headers = ProxyManager.getRandomHeaders();
    this.diagnostics = {
      url: this.url,
      attempts: 0,
      strategy: 'direct_http',
      fallbackAttempted: false,
      fallbackResult: null,
      blockClassification: null,
      primarySelectorFound: false,
      secondarySelectorFound: false,
      jsonLdPresent: false,
      productStatus: 'PENDING',
      reviewStatus: 'PENDING'
    };
  }

  async fetchWithAxios(proxyConfig, options = {}) {
    const { timeout = 8000, signal = null } = options;
    const axiosConfig = {
      headers: this.headers,
      timeout,
      signal: signal || undefined,
      validateStatus: () => true // Allow handling 200, 403, 404, 429, 503 explicitly
    };

    if (proxyConfig) {
      axiosConfig.proxy = {
        host: proxyConfig.host,
        port: proxyConfig.port,
        auth: proxyConfig.auth
      };
    }

    const client = createSafeAxios(axiosConfig);
    const response = await client.get(this.url);
    const $ = cheerio.load(response.data || '');
    return { $, status: response.status, dataLength: (response.data || '').length };
  }

  async fetchValidatedHtml(options = {}) {
    const {
      platform = 'generic',
      waitForSelector = null,
      headlessFirst = false,
      maxRetries = Math.min(2, ProxyManager.getMaxRetries()),
      signal = null,
      deadline = null,
      httpTimeout = 8000,
      navTimeout = 10000,
      selectorTimeout = 4000
    } = options;

    const attempts = Math.max(1, maxRetries);
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (signal?.aborted) {
        throw new ExtractionError('Scraping was cancelled.', {
          category: ErrorCategory.TIMEOUT,
          statusCode: 499,
          platform,
          diagnostics: this.getRedactedDiagnostics()
        });
      }

      if (deadline && Date.now() >= deadline) {
        throw new ExtractionError('Scraping deadline exceeded.', {
          category: ErrorCategory.TIMEOUT,
          statusCode: 504,
          platform,
          diagnostics: this.getRedactedDiagnostics()
        });
      }

      this.diagnostics.attempts = attempt + 1;
      const proxyEntry = ProxyManager.getNextProxy();
      const proxyConfig = proxyEntry ? ProxyManager.getProxyConfig(proxyEntry) : null;
      const proxyUrl = proxyEntry?.url;

      try {
        if (headlessFirst) {
          this.diagnostics.strategy = 'headless_browser';
          const rendered = await HeadlessScraper.fetchRenderedHtml(this.url, {
            waitForSelector,
            proxyEntry,
            navTimeout,
            selectorTimeout,
            signal
          });

          if (!rendered) {
            if (signal?.aborted) {
              throw new ExtractionError('Scraping was cancelled.', {
                category: ErrorCategory.TIMEOUT,
                statusCode: 499,
                platform,
                diagnostics: this.getRedactedDiagnostics()
              });
            }
            throw new ExtractionError('Headless browser fetch returned empty content', {
              category: ErrorCategory.NETWORK_ERROR,
              statusCode: 502,
              platform,
              diagnostics: this.getRedactedDiagnostics()
            });
          }

          const validation = ResponseValidator.validate(rendered, {
            status: 200,
            url: this.url,
            platform,
            isBrowser: true
          });

          if (!validation.isValid) {
            this.diagnostics.blockClassification = validation.category;
            throw new ExtractionError(validation.reason, {
              category: validation.category,
              statusCode: validation.category === ErrorCategory.PRODUCT_NOT_FOUND ? 404 : 422,
              platform,
              diagnostics: this.getRedactedDiagnostics()
            });
          }

          return rendered;
        }

        // Direct HTTP Request
        this.diagnostics.strategy = 'direct_http';
        const { $, status, dataLength } = await this.fetchWithAxios(proxyConfig, {
          timeout: httpTimeout,
          signal
        });

        const validation = ResponseValidator.validate($, {
          status,
          url: this.url,
          platform,
          isBrowser: false,
          bodyLength: dataLength
        });

        if (validation.isValid) {
          return $;
        }

        // Direct HTTP failed validation (e.g. HTTP 200 CAPTCHA / bot check / JS shell / 403)
        this.diagnostics.blockClassification = validation.category;

        if (validation.canBrowserHelp) {
          console.warn(
            `[Scraper Fallback] Direct HTTP validation failed (${validation.category}: ${validation.reason}). Triggering Headless Browser Fallback for ${this.url}...`
          );
          this.diagnostics.fallbackAttempted = true;

          const rendered = await HeadlessScraper.fetchRenderedHtml(this.url, {
            waitForSelector,
            proxyEntry,
            navTimeout,
            selectorTimeout,
            signal
          });

          if (rendered) {
            const browserValidation = ResponseValidator.validate(rendered, {
              status: 200,
              url: this.url,
              platform,
              isBrowser: true
            });

            if (browserValidation.isValid) {
              this.diagnostics.fallbackResult = 'SUCCESS';
              return rendered;
            }

            this.diagnostics.fallbackResult = 'FAILED';
            this.diagnostics.blockClassification = browserValidation.category;
            throw new ExtractionError(browserValidation.reason, {
              category: browserValidation.category,
              statusCode: 422,
              platform,
              diagnostics: this.getRedactedDiagnostics()
            });
          }
        }

        // Direct HTTP failed and browser cannot help or was not successful
        throw new ExtractionError(validation.reason, {
          category: validation.category,
          statusCode: validation.category === ErrorCategory.BOT_BLOCKED || validation.category === ErrorCategory.CAPTCHA ? 502 : (status >= 400 ? status : 422),
          platform,
          diagnostics: this.getRedactedDiagnostics()
        });
      } catch (error) {
        if (error instanceof ExtractionError && error.category === ErrorCategory.TIMEOUT) {
          throw error;
        }
        if (signal?.aborted || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
          throw new ExtractionError('Scraping was cancelled.', {
            category: ErrorCategory.TIMEOUT,
            statusCode: 499,
            platform,
            diagnostics: this.getRedactedDiagnostics()
          });
        }

        lastError = error;
        if (proxyUrl) {
          ProxyManager.markProxyFailed(proxyUrl);
        }

        if (attempt < attempts - 1 && !(error instanceof ExtractionError && error.category === ErrorCategory.PRODUCT_NOT_FOUND)) {
          console.warn(`[Scraper Warning] Fetch attempt ${attempt + 1}/${attempts} failed (${error.message}). Retrying...`);
        } else {
          break;
        }
      }
    }

    if (lastError instanceof ExtractionError) {
      throw lastError;
    }

    throw new ExtractionError(`Unable to fetch product page (${lastError?.message || 'Unknown network error'}).`, {
      category: ErrorCategory.NETWORK_ERROR,
      statusCode: 502,
      platform,
      diagnostics: this.getRedactedDiagnostics()
    });
  }

  /**
   * Backward-compatible alias for fetchValidatedHtml
   */
  async fetchHtml(options = {}) {
    return this.fetchValidatedHtml(options);
  }

  /**
   * Robust JSON-LD parser supporting @graph, single objects, and arrays.
   */
  extractJsonLd($) {
    const details = {
      title: '',
      brand: '',
      price: '',
      rating: 0,
      imageUrl: '',
      reviews: []
    };

    if (!$) return details;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const json = JSON.parse(raw);

        // Normalize to array of objects
        let items = [];
        if (Array.isArray(json)) {
          items = json;
        } else if (json && typeof json === 'object') {
          if (Array.isArray(json['@graph'])) {
            items = json['@graph'];
          } else {
            items = [json];
          }
        }

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;

          const type = item['@type'];
          const isProduct =
            type === 'Product' ||
            type === 'ProductGroup' ||
            type === 'IndividualProduct' ||
            (Array.isArray(type) && type.includes('Product'));

          if (isProduct) {
            details.title = details.title || item.name || item.headline || '';

            if (item.brand) {
              details.brand =
                typeof item.brand === 'object' ? item.brand.name || item.brand['@name'] || '' : String(item.brand);
            }

            if (item.offers) {
              const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              if (offer && offer.price) {
                details.price = offer.priceCurrency
                  ? `${offer.priceCurrency} ${offer.price}`
                  : `₹ ${offer.price}`;
              }
            }

            if (item.aggregateRating) {
              details.rating =
                parseFloat(item.aggregateRating.ratingValue) ||
                parseFloat(item.aggregateRating.rating) ||
                details.rating;
            }

            if (item.image) {
              if (typeof item.image === 'string') {
                details.imageUrl = details.imageUrl || item.image;
              } else if (Array.isArray(item.image) && item.image[0]) {
                details.imageUrl = details.imageUrl || (typeof item.image[0] === 'string' ? item.image[0] : item.image[0].url || '');
              } else if (item.image.url) {
                details.imageUrl = details.imageUrl || item.image.url;
              }
            }

            const rawReviews = item.review || item.reviews;
            if (Array.isArray(rawReviews)) {
              rawReviews.forEach((r) => {
                const body = r.reviewBody || r.description || r.comment;
                if (body && typeof body === 'string' && body.trim().length > 15 && !details.reviews.includes(body.trim())) {
                  details.reviews.push(body.trim());
                }
              });
            }
          }
        }
      } catch {
        // Ignore malformed JSON-LD script tags
      }
    });

    // Meta Fallbacks
    if (!details.title) {
      details.title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text().trim();
    }
    if (!details.imageUrl) {
      details.imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '';
    }

    return details;
  }

  determineReviewQuality(count) {
    if (count >= 3) {
      this.diagnostics.reviewStatus = DataQualityState.REVIEWS_AVAILABLE;
      return DataQualityState.REVIEWS_AVAILABLE;
    }
    if (count > 0) {
      this.diagnostics.reviewStatus = DataQualityState.LIMITED_REVIEWS;
      return DataQualityState.LIMITED_REVIEWS;
    }
    this.diagnostics.reviewStatus = DataQualityState.NO_REVIEWS_FOUND;
    return DataQualityState.NO_REVIEWS_FOUND;
  }

  throwInsufficientData(platform, count) {
    this.diagnostics.reviewStatus = 'INSUFFICIENT_REVIEWS';
    const err = new ExtractionError(
      `Insufficient customer reviews found on ${platform} (${count} found, minimum 3 required for AI analysis).`,
      {
        category: ErrorCategory.INSUFFICIENT_REVIEWS,
        statusCode: 422,
        platform: platform.toLowerCase(),
        diagnostics: this.getRedactedDiagnostics()
      }
    );
    err.code = 'INSUFFICIENT_DATA';
    throw err;
  }

  getRedactedDiagnostics() {
    return {
      url: this.url,
      attempts: this.diagnostics.attempts,
      strategy: this.diagnostics.strategy,
      fallbackAttempted: this.diagnostics.fallbackAttempted,
      fallbackResult: this.diagnostics.fallbackResult,
      blockClassification: this.diagnostics.blockClassification,
      primarySelectorFound: this.diagnostics.primarySelectorFound,
      secondarySelectorFound: this.diagnostics.secondarySelectorFound,
      jsonLdPresent: this.diagnostics.jsonLdPresent,
      productStatus: this.diagnostics.productStatus,
      reviewStatus: this.diagnostics.reviewStatus
    };
  }

  async scrape() {
    throw new Error('scrape() method must be implemented by concrete scraper');
  }
}
