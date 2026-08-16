import { BaseScraper } from './baseScraper.js';
import { extractProductId } from '../../utils/productIdExtractor.js';
import { ExtractionError } from '../../utils/extractionError.js';
import { ErrorCategory } from '../../utils/responseValidator.js';

export class FlipkartScraper extends BaseScraper {
  async scrape() {
    const $ = await this.fetchValidatedHtml({
      platform: 'flipkart',
      waitForSelector: 'span.B_NuT2, h1._6ERy96, h1.yhB1nd'
    });

    const jsonLd = this.extractJsonLd($);
    const productId = extractProductId(this.url, 'flipkart');

    // Title Extraction: Primary -> Secondary -> JSON-LD
    let title = $('span.B_NuT2').text().trim() || $('h1._6ERy96').text().trim();
    if (title) {
      this.diagnostics.primarySelectorFound = true;
    } else {
      title =
        $('h1.yhB1nd').text().trim() ||
        $('span._35KyD6').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        jsonLd.title;
      if (title) this.diagnostics.secondarySelectorFound = true;
    }

    if (!title) {
      this.diagnostics.productStatus = 'FAILED';
      throw new ExtractionError(
        'Could not parse product details from Flipkart. Layout may have changed or anti-bot verification blocked extraction.',
        {
          category: ErrorCategory.LAYOUT_CHANGED,
          statusCode: 422,
          platform: 'flipkart',
          diagnostics: this.getRedactedDiagnostics()
        }
      );
    }

    this.diagnostics.productStatus = 'SUCCESS';

    // Price Extraction
    const priceText =
      $('div._30jeq3._16Jbld').text().trim() ||
      $('div._30jeq3').first().text().trim() ||
      $('div._25b18c ._30jeq3').first().text().trim() ||
      jsonLd.price ||
      'Price unavailable';

    // Rating Extraction
    const ratingText =
      $('div._3LWZlK').first().text().trim() ||
      $('div._3u-gA4').first().text().trim() ||
      $('div._2d4LTz').first().text().trim();
    const rating = parseFloat(ratingText) || jsonLd.rating || 0;

    // Image Extraction
    const imageUrl =
      $('img._396cs4._2amPTt').attr('src') ||
      $('img._5535wE').attr('src') ||
      $('img._2r_T1I').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      jsonLd.imageUrl ||
      '';

    // Review Extraction
    const reviews = [...jsonLd.reviews];
    $('div.t-ZTfl, div.ZmyHeo, div._6K-7Co, div.EPCmJX').each((_, el) => {
      const text = $(el).text().replace('READ MORE', '').trim();
      if (text && text.length > 20 && !reviews.includes(text)) {
        reviews.push(text);
      }
    });

    if (reviews.length < 3) {
      this.throwInsufficientData('Flipkart', reviews.length);
    }

    this.diagnostics.reviewStatus = 'SUCCESS';

    return {
      platform: 'flipkart',
      productId,
      title,
      brand: jsonLd.brand || title.split(' ')[0] || 'Flipkart Brand',
      price: priceText,
      rating,
      reviewCount: reviews.length,
      imageUrl,
      reviews,
      diagnostics: this.getRedactedDiagnostics()
    };
  }
}
