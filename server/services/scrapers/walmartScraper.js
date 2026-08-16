import { BaseScraper } from './baseScraper.js';
import { detectPlatform } from '../../utils/platformDetector.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class WalmartScraper extends BaseScraper {
  async scrape() {
    const { headlessFirst } = detectPlatform(this.url);
    const $ = await this.fetchValidatedHtml({
      platform: 'walmart',
      waitForSelector: '[data-testid="product-title"], [itemprop="name"], h1',
      headlessFirst
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'walmart');

    // Title Extraction: Primary -> Secondary -> JSON-LD
    let title = $('[data-testid="product-title"]').text().trim();
    if (title) {
      this.diagnostics.primarySelectorFound = true;
    } else {
      title =
        $('[itemprop="name"]').first().text().trim() ||
        $('h1.prod-ProductTitle').text().trim() ||
        $('h1').first().text().trim() ||
        jsonLd.title;
      if (title) this.diagnostics.secondarySelectorFound = true;
    }

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError(
        'Could not parse product details from Walmart. Layout may have changed or anti-bot verification blocked extraction.',
        {
          category: ErrorCategory.LAYOUT_CHANGED,
          statusCode: 422,
          platform: 'walmart',
          diagnostics: this.getRedactedDiagnostics()
        }
      );
    }

    this.diagnostics.productStatus = 'SUCCESS';

    // Price Extraction
    const priceText =
      $('[itemprop="price"]').attr('content') ||
      $('[data-testid="price-wrap"] [aria-hidden="true"]').first().text().trim() ||
      $('span[itemprop="price"]').first().text().trim() ||
      jsonLd.price ||
      'Price unavailable';

    // Rating Extraction
    const ratingText =
      $('[data-testid="reviews-section"] [itemprop="ratingValue"]').attr('content') ||
      $('[itemprop="ratingValue"]').attr('content');
    const rating = parseFloat(ratingText) || jsonLd.rating || 0;

    // Image Extraction
    const imageUrl =
      $('[data-testid="hero-image-container"] img').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      jsonLd.imageUrl ||
      '';

    // Review Extraction
    const reviews = [...jsonLd.reviews];
    $('[data-testid="reviews-section"] [data-testid="review-text"], [itemprop="reviewBody"], .review-text').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    if (reviews.length < 3) {
      this.throwInsufficientData('Walmart', reviews.length);
    }

    this.diagnostics.reviewStatus = 'SUCCESS';

    return {
      platform: 'walmart',
      productId,
      title,
      brand: jsonLd.brand || title.split(' ')[0] || 'Walmart Brand',
      price: priceText,
      rating,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      diagnostics: this.getRedactedDiagnostics()
    };
  }
}
