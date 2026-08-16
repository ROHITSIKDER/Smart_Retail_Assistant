import { BaseScraper } from './baseScraper.js';
import { detectPlatform } from '../../utils/platformDetector.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class TargetScraper extends BaseScraper {
  async scrape() {
    const { headlessFirst } = detectPlatform(this.url);
    const $ = await this.fetchValidatedHtml({
      platform: 'target',
      waitForSelector: '[data-test="product-title"], h1',
      headlessFirst
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'target');

    // Title Extraction: Primary -> Secondary -> JSON-LD
    let title = $('[data-test="product-title"]').text().trim();
    if (title) {
      this.diagnostics.primarySelectorFound = true;
    } else {
      title =
        $('h1[data-test="@web/ProductDetails/ProductTitle"]').text().trim() ||
        $('h1').first().text().trim() ||
        jsonLd.title;
      if (title) this.diagnostics.secondarySelectorFound = true;
    }

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError(
        'Could not parse product details from Target. Layout may have changed or anti-bot verification blocked extraction.',
        {
          category: ErrorCategory.LAYOUT_CHANGED,
          statusCode: 422,
          platform: 'target',
          diagnostics: this.getRedactedDiagnostics()
        }
      );
    }

    this.diagnostics.productStatus = 'SUCCESS';

    // Price Extraction
    const priceText =
      $('[data-test="product-price"]').text().trim() ||
      $('span[data-test="product-price"]').text().trim() ||
      jsonLd.price ||
      'Price unavailable';

    // Rating Extraction
    const ratingText =
      $('[data-test="rating"]').text().trim() ||
      $('[itemprop="ratingValue"]').attr('content');
    const rating = parseFloat(ratingText) || jsonLd.rating || 0;

    // Image Extraction
    const imageUrl =
      $('picture img').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      jsonLd.imageUrl ||
      '';

    // Review Extraction
    const reviews = [...jsonLd.reviews];
    $('[data-test="review-body"], [data-test="review-text"], [data-test="review-card--text"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    if (reviews.length < 3) {
      this.throwInsufficientData('Target', reviews.length);
    }

    this.diagnostics.reviewStatus = 'SUCCESS';

    return {
      platform: 'target',
      productId,
      title,
      brand: jsonLd.brand || title.split(' ')[0] || 'Target Brand',
      price: priceText,
      rating,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      diagnostics: this.getRedactedDiagnostics()
    };
  }
}
