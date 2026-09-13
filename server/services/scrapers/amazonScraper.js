import { BaseScraper } from './baseScraper.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class AmazonScraper extends BaseScraper {
  async scrape(options = {}) {
    const $ = await this.fetchValidatedHtml({
      platform: 'amazon',
      waitForSelector: '#productTitle, #title, .a-price',
      ...options
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'amazon');

    // Title Extraction: Primary -> Secondary -> JSON-LD
    let title = $('#productTitle').text().trim();
    if (title) {
      this.diagnostics.primarySelectorFound = true;
    } else {
      title =
        $('#title').text().trim() ||
        $('h1.a-size-large').first().text().trim() ||
        $('h1.product-title-word-break').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        jsonLd.title;
      if (title) this.diagnostics.secondarySelectorFound = true;
    }

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError(
        'Could not parse product details from Amazon. Layout may have changed or anti-bot verification blocked extraction.',
        {
          category: ErrorCategory.LAYOUT_CHANGED,
          statusCode: 422,
          platform: 'amazon',
          diagnostics: this.getRedactedDiagnostics()
        }
      );
    }

    this.diagnostics.productStatus = 'SUCCESS';

    // Price Extraction
    const priceText =
      $('.a-price .a-offscreen').first().text().trim() ||
      $('#priceblock_ourprice').text().trim() ||
      $('#priceblock_dealprice').text().trim() ||
      $('#corePrice_feature_div .a-offscreen').first().text().trim() ||
      $('span.a-color-price').first().text().trim() ||
      jsonLd.price ||
      'Price unavailable';

    // Rating Extraction
    const ratingText =
      $('i.a-icon-star span.a-icon-alt').first().text().trim() ||
      $('#acrPopover span.a-icon-alt').first().text().trim() ||
      $('span.a-icon-alt').first().text().trim();
    const rating = parseFloat(ratingText) || jsonLd.rating || 0;

    // Image Extraction
    const imageUrl =
      $('#landingImage').attr('src') ||
      $('img#imgBlkFront').attr('src') ||
      $('#main-image').attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      jsonLd.imageUrl ||
      '';

    // Review Extraction: Primary DOM -> Secondary DOM -> JSON-LD
    const reviews = [...jsonLd.reviews];
    $('[data-hook="review-body"] span, .review-text-content span, [data-hook="review-collapsed"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    const dataQualityState = this.determineReviewQuality(reviews.length);

    return {
      platform: 'amazon',
      productId,
      title,
      brand: jsonLd.brand || this.extractBrand(title),
      price: priceText,
      rating,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      dataQualityState,
      diagnostics: this.getRedactedDiagnostics()
    };
  }

  extractBrand(title) {
    const words = title.split(' ');
    return words[0] || 'Amazon Brand';
  }
}
