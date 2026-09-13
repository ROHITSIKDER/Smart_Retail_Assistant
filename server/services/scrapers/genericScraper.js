import { BaseScraper } from './baseScraper.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class GenericScraper extends BaseScraper {
  async scrape(options = {}) {
    const $ = await this.fetchValidatedHtml({
      platform: 'generic',
      ...options
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'generic');

    const title =
      jsonLd.title ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim();

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError('Could not extract product details from this page.', {
        category: ErrorCategory.INVALID_PRODUCT_PAGE,
        statusCode: 422,
        platform: 'generic',
        diagnostics: this.getRedactedDiagnostics()
      });
    }

    this.diagnostics.productStatus = 'SUCCESS';

    const imageUrl =
      jsonLd.imageUrl ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    const rawPrice =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('[itemprop="price"]').attr('content') ||
      $('[class*="price"]').first().text().trim() ||
      '';

    const price =
      jsonLd.price ||
      (rawPrice ? (rawPrice.startsWith('₹') || rawPrice.startsWith('$') ? rawPrice : `₹ ${rawPrice}`) : 'Price unavailable');

    const reviews = [...jsonLd.reviews];
    $('[class*="review"], [id*="review"], [itemprop="reviewBody"], .user-review, .product-review').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && text.length < 1000 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    const dataQualityState = this.determineReviewQuality(reviews.length);

    return {
      platform: 'generic',
      productId,
      title,
      brand: jsonLd.brand || 'Generic E-Commerce',
      price,
      rating: jsonLd.rating || 0,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      dataQualityState,
      diagnostics: this.getRedactedDiagnostics()
    };
  }
}
