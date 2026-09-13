import { BaseScraper } from './baseScraper.js';
import { detectPlatform } from '../../utils/platformDetector.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class MyntraScraper extends BaseScraper {
  async scrape(options = {}) {
    const { headlessFirst } = detectPlatform(this.url);
    const $ = await this.fetchValidatedHtml({
      platform: 'myntra',
      waitForSelector: '.pdp-name, h1[class*="pdp"]',
      headlessFirst,
      ...options
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'myntra');

    // Title Extraction: Primary -> Secondary -> JSON-LD
    let title = $('.pdp-name').text().trim();
    if (title) {
      this.diagnostics.primarySelectorFound = true;
    } else {
      title =
        $('h1[class*="pdp"]').first().text().trim() ||
        $('h1.pdp-title').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        jsonLd.title;
      if (title) this.diagnostics.secondarySelectorFound = true;
    }

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError(
        'Could not parse product details from Myntra. Layout may have changed or anti-bot verification blocked extraction.',
        {
          category: ErrorCategory.LAYOUT_CHANGED,
          statusCode: 422,
          platform: 'myntra',
          diagnostics: this.getRedactedDiagnostics()
        }
      );
    }

    this.diagnostics.productStatus = 'SUCCESS';

    // Price Extraction
    const priceText =
      $('.pdp-price strong').text().trim() ||
      $('[class*="pdp-price"]').first().text().trim() ||
      $('span.pdp-offers-price').text().trim() ||
      jsonLd.price ||
      'Price unavailable';

    // Rating Extraction
    const ratingText =
      $('.index-overallRating').text().trim() ||
      $('[itemprop="ratingValue"]').attr('content');
    const rating = parseFloat(ratingText) || jsonLd.rating || 0;

    // Image Extraction
    const imageUrl =
      $('.image-grid-image img').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      jsonLd.imageUrl ||
      '';

    // Review Extraction
    const reviews = [...jsonLd.reviews];
    $('.user-review-reviewText, [class*="user-review"], div.user-review-container').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && text.length < 1000 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    const dataQualityState = this.determineReviewQuality(reviews.length);

    return {
      platform: 'myntra',
      productId,
      title,
      brand: jsonLd.brand || title.split(' ')[0] || 'Myntra Brand',
      price: priceText,
      rating,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      dataQualityState,
      diagnostics: this.getRedactedDiagnostics()
    };
  }
}
