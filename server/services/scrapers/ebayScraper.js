import { BaseScraper } from './baseScraper.js';
import { detectPlatform } from '../../utils/platformDetector.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class EbayScraper extends BaseScraper {
  async scrape() {
    const { headlessFirst } = detectPlatform(this.url);
    const $ = await this.fetchValidatedHtml({
      platform: 'ebay',
      waitForSelector: '#itemTitle, h1.x-item-title__mainTitle',
      headlessFirst
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'ebay');

    // Title Extraction: Primary -> Secondary -> JSON-LD
    let title = $('#itemTitle').text().trim();
    if (title) {
      this.diagnostics.primarySelectorFound = true;
    } else {
      title =
        $('h1.x-item-title__mainTitle span').text().trim() ||
        $('h1.x-item-title__mainTitle').text().trim() ||
        $('h1.d-item-title').text().trim() ||
        jsonLd.title;
      if (title) this.diagnostics.secondarySelectorFound = true;
    }

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError(
        'Could not parse product details from eBay. Layout may have changed or anti-bot verification blocked extraction.',
        {
          category: ErrorCategory.LAYOUT_CHANGED,
          statusCode: 422,
          platform: 'ebay',
          diagnostics: this.getRedactedDiagnostics()
        }
      );
    }

    this.diagnostics.productStatus = 'SUCCESS';

    // Price Extraction
    const priceText =
      $('#prcIsum').text().trim() ||
      $('.x-price-primary .ux-textspans').first().text().trim() ||
      $('[itemprop="price"]').attr('content') ||
      jsonLd.price ||
      'Price unavailable';

    // Rating Extraction
    const ratingText =
      $('.reviews-star-rating__rating').text().trim() ||
      $('[itemprop="ratingValue"]').attr('content');
    const rating = parseFloat(ratingText) || jsonLd.rating || 0;

    // Image Extraction
    const imageUrl =
      $('#icImg').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      jsonLd.imageUrl ||
      '';

    // Review Extraction
    const reviews = [...jsonLd.reviews];
    $('.x-review-body, .reviews-content .review-item .review-item-content, [itemprop="reviewBody"], .review-item-details').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    if (reviews.length < 3) {
      this.throwInsufficientData('eBay', reviews.length);
    }

    this.diagnostics.reviewStatus = 'SUCCESS';

    return {
      platform: 'ebay',
      productId,
      title,
      brand: jsonLd.brand || title.split(' ')[0] || 'eBay Seller',
      price: priceText,
      rating,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      diagnostics: this.getRedactedDiagnostics()
    };
  }
}
