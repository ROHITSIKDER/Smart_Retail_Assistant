export const ErrorCategory = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  CAPTCHA: 'CAPTCHA',
  BOT_BLOCKED: 'BOT_BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  JAVASCRIPT_REQUIRED: 'JAVASCRIPT_REQUIRED',
  INVALID_PRODUCT_PAGE: 'INVALID_PRODUCT_PAGE',
  LAYOUT_CHANGED: 'LAYOUT_CHANGED',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  REVIEWS_BLOCKED: 'REVIEWS_BLOCKED',
  INSUFFICIENT_REVIEWS: 'INSUFFICIENT_REVIEWS',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED'
};

const INTERACTIVE_CAPTCHA_SIGNATURES = [
  /validatecaptcha/i,
  /type the characters you see in this image/i,
  /enter the characters you see below/i,
  /solve this puzzle/i,
  /distil_identify_block/i
];

const BOT_BLOCK_SIGNATURES = [
  /robot check/i,
  /automated access/i,
  /we just need to make sure you're not a robot/i,
  /unusual traffic from your (?:computer|network)/i,
  /pardon our interruption/i,
  /attention required! \| cloudflare/i,
  /just a moment\.\.\./i,
  /please verify you are a human/i,
  /request blocked by security policy/i,
  /perimeterx/i,
  /datadome/i,
  /kasada/i,
  /cf-turnstile/i,
  /g-recaptcha/i,
  /hcaptcha/i,
  /arkoselabs/i,
  /security challenge/i,
  /to discuss automated access to amazon data/i
];

const ACCESS_DENIED_SIGNATURES = [
  /access denied/i,
  /403 forbidden/i,
  /you don't have permission to access/i,
  /access to this page has been denied/i,
  /forbidden: you do not have permission/i
];

const RATE_LIMITED_SIGNATURES = [
  /too many requests/i,
  /rate limit exceeded/i,
  /429 too many requests/i,
  /slow down/i
];

const LOGIN_REQUIRED_SIGNATURES = [
  /please log in to continue/i,
  /sign in to your account/i,
  /login required/i,
  /login to view this page/i
];

const JS_REQUIRED_SIGNATURES = [
  /you need to enable javascript/i,
  /javascript is required/i,
  /enable javascript to view/i,
  /please enable javascript/i
];

export class ResponseValidator {
  /**
   * Multi-signal validation of scraped HTML DOM and response metadata.
   * @param {object} $ - Cheerio DOM instance
   * @param {object} metadata - Response metadata { status, url, platform, isBrowser, bodyLength, headers }
   * @returns {object} Validation result { isValid, category, reason, canBrowserHelp, isBlock, diagnostics }
   */
  static validate($, metadata = {}) {
    const {
      status = 200,
      url = '',
      platform = 'generic',
      isBrowser = false,
      bodyLength = 0
    } = metadata;

    const pageTitle = ($ ? $('title').text().trim() : '') || '';
    const bodyHtml = $ ? $('body').html() || '' : '';
    const bodyText = $ ? $('body').text().replace(/\s+/g, ' ').trim() : '';
    const length = bodyLength || bodyHtml.length;

    const diagnostics = {
      platform,
      httpStatus: status,
      isBrowser,
      pageTitle: pageTitle.slice(0, 100),
      bodyLength: length,
      jsonLdPresent: false,
      productSignalsFound: false
    };

    // 1. HTTP 404 / Product Not Found
    if (status === 404 || /page not found|item not found|product not found|404 not found/i.test(pageTitle)) {
      return {
        isValid: false,
        category: ErrorCategory.PRODUCT_NOT_FOUND,
        reason: 'The requested product page was not found (404).',
        canBrowserHelp: false,
        isBlock: false,
        diagnostics
      };
    }

    // 2. HTTP 429 / Rate Limited
    if (status === 429 || RATE_LIMITED_SIGNATURES.some((r) => r.test(pageTitle) || r.test(bodyText))) {
      return {
        isValid: false,
        category: ErrorCategory.RATE_LIMITED,
        reason: 'Rate limit exceeded by the retailer server.',
        canBrowserHelp: false,
        isBlock: true,
        diagnostics
      };
    }

    // 3. Interactive CAPTCHA Detection (Hard block: image/puzzle captcha)
    const isInteractiveCaptcha = INTERACTIVE_CAPTCHA_SIGNATURES.some(
      (r) => r.test(pageTitle) || r.test(bodyHtml) || r.test(bodyText)
    );
    if (isInteractiveCaptcha) {
      return {
        isValid: false,
        category: ErrorCategory.CAPTCHA,
        reason: 'CAPTCHA verification challenge encountered.',
        canBrowserHelp: false, // Per safety rules, we do not automate/solve CAPTCHAs
        isBlock: true,
        diagnostics
      };
    }

    // 4. Bot Block / Interstitial Detection (even on HTTP 200)
    const isBotBlocked = BOT_BLOCK_SIGNATURES.some(
      (r) => r.test(pageTitle) || r.test(bodyHtml) || r.test(bodyText)
    );
    if (isBotBlocked) {
      return {
        isValid: false,
        category: ErrorCategory.BOT_BLOCKED,
        reason: isBrowser
          ? 'Retailer access restricted by anti-bot verification even after browser rendering.'
          : 'Anti-bot protection or interstitial blocked direct access.',
        canBrowserHelp: !isBrowser, // Browser fallback may succeed if direct HTTP was rejected
        isBlock: true,
        diagnostics
      };
    }

    // 5. Access Denied / 403
    if (status === 403 || ACCESS_DENIED_SIGNATURES.some((r) => r.test(pageTitle) || r.test(bodyText))) {
      return {
        isValid: false,
        category: ErrorCategory.ACCESS_DENIED,
        reason: 'Access denied by retailer server (403).',
        canBrowserHelp: !isBrowser,
        isBlock: true,
        diagnostics
      };
    }

    // 6. Generic HTTP 5xx Server Error
    if (status >= 500) {
      return {
        isValid: false,
        category: ErrorCategory.HTTP_ERROR,
        reason: `Upstream server returned error HTTP ${status}.`,
        canBrowserHelp: !isBrowser,
        isBlock: false,
        diagnostics
      };
    }

    // 7. Check for empty or non-DOM response
    if (!$ || (length < 20 && !$('title').length)) {
      return {
        isValid: false,
        category: status >= 400 ? ErrorCategory.HTTP_ERROR : ErrorCategory.INVALID_PRODUCT_PAGE,
        reason: 'Empty or unparseable HTML received.',
        canBrowserHelp: !isBrowser,
        isBlock: false,
        diagnostics
      };
    }

    // 8. Login / Auth Wall
    const isLoginRequired = LOGIN_REQUIRED_SIGNATURES.some((r) => r.test(pageTitle)) && bodyText.length < 500;
    if (isLoginRequired) {
      return {
        isValid: false,
        category: ErrorCategory.LOGIN_REQUIRED,
        reason: 'Authentication or login is required to view this product.',
        canBrowserHelp: false,
        isBlock: true,
        diagnostics
      };
    }

    // 9. JavaScript Required / SPA Shell Detection
    const hasJsRequiredText = JS_REQUIRED_SIGNATURES.some((r) => r.test(bodyHtml) || r.test(bodyText));
    const isMinimalShell = $('div#root, div#app, div#__next, div#main').length > 0 && bodyText.length < 300;
    if ((hasJsRequiredText || isMinimalShell) && !this.hasProductSignals($, platform)) {
      return {
        isValid: false,
        category: ErrorCategory.JAVASCRIPT_REQUIRED,
        reason: 'Page is a client-rendered JavaScript shell without product markup.',
        canBrowserHelp: !isBrowser,
        isBlock: false,
        diagnostics
      };
    }

    // 10. Inspect Product Signals
    const hasSignals = this.hasProductSignals($, platform);
    diagnostics.productSignalsFound = hasSignals;

    // Check JSON-LD
    let hasJsonLd = false;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (text && (text.includes('"Product"') || text.includes('"product"') || text.includes('"offers"'))) {
          hasJsonLd = true;
        }
      } catch {}
    });
    diagnostics.jsonLdPresent = hasJsonLd;

    if (!hasSignals && !hasJsonLd) {
      return {
        isValid: false,
        category: ErrorCategory.INVALID_PRODUCT_PAGE,
        reason: 'No recognizable product structure or metadata found on the page.',
        canBrowserHelp: !isBrowser,
        isBlock: false,
        diagnostics
      };
    }

    // Valid product page DOM
    return {
      isValid: true,
      category: null,
      reason: 'Valid product page signals verified.',
      canBrowserHelp: false,
      isBlock: false,
      diagnostics
    };
  }

  /**
   * Check whether standard or platform-specific product elements exist in the DOM.
   */
  static hasProductSignals($, platform) {
    if (!$) return false;

    // Standard OpenGraph / Microdata product signals
    if (
      $('meta[property="og:title"]').attr('content') ||
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('[itemtype*="Product"]').length > 0
    ) {
      return true;
    }

    // Platform-specific selectors
    switch (platform) {
      case 'amazon':
        return (
          $('#productTitle').length > 0 ||
          $('#title').length > 0 ||
          $('#priceblock_ourprice').length > 0 ||
          $('.a-price').length > 0 ||
          $('#landingImage').length > 0
        );
      case 'flipkart':
        return (
          $('span.B_NuT2').length > 0 ||
          $('h1._6ERy96').length > 0 ||
          $('h1.yhB1nd').length > 0 ||
          $('div._30jeq3').length > 0
        );
      case 'walmart':
        return (
          $('[data-testid="product-title"]').length > 0 ||
          $('[itemprop="name"]').length > 0 ||
          $('[data-testid="price-wrap"]').length > 0
        );
      case 'target':
        return (
          $('[data-test="product-title"]').length > 0 ||
          $('h1[data-test="@web/ProductDetails/ProductTitle"]').length > 0 ||
          $('[data-test="product-price"]').length > 0
        );
      case 'ebay':
        return (
          $('#itemTitle').length > 0 ||
          $('h1.x-item-title__mainTitle').length > 0 ||
          $('#prcIsum').length > 0 ||
          $('.x-price-primary').length > 0
        );
      case 'myntra':
        return (
          $('.pdp-name').length > 0 ||
          $('h1[class*="pdp"]').length > 0 ||
          $('.pdp-price').length > 0
        );
      default:
        return (
          $('h1').length > 0 &&
          ($('[class*="price"]').length > 0 || $('[id*="price"]').length > 0 || $('title').text().trim().length > 3)
        );
    }
  }
}
