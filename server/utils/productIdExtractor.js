import crypto from 'crypto';

/**
 * Extracts platform-specific canonical product identifier from URL.
 * @param {string} url - Product URL
 * @param {string} platform - Store platform ('amazon', 'flipkart', 'walmart', 'target', 'ebay', 'myntra', 'generic')
 * @returns {string} Extracted product ID or fallback identifier
 */
export function extractProductId(url, platform = 'generic') {
  if (!url || typeof url !== 'string') {
    return 'UNKNOWN';
  }

  const cleanUrl = url.trim();

  try {
    const parsed = new URL(cleanUrl);
    const pathname = parsed.pathname;
    const searchParams = parsed.searchParams;

    switch (platform.toLowerCase()) {
      case 'amazon': {
        const asinMatch =
          pathname.match(/\/(?:dp|gp\/product|product-reviews|ASIN)\/([A-Z0-9]{10})/i) ||
          searchParams.get('asin') ||
          searchParams.get('ASIN');
        if (typeof asinMatch === 'string') return asinMatch.toUpperCase();
        if (asinMatch && asinMatch[1]) return asinMatch[1].toUpperCase();
        break;
      }

      case 'flipkart': {
        const itmMatch = pathname.match(/\/p\/(itm[a-zA-Z0-9]+)/i);
        if (itmMatch && itmMatch[1]) return itmMatch[1];
        const pidParam = searchParams.get('pid');
        if (pidParam) return pidParam;
        break;
      }

      case 'walmart': {
        const wmMatch = pathname.match(/\/ip\/(?:[^/]+\/)?([0-9]{6,14})/i);
        if (wmMatch && wmMatch[1]) return wmMatch[1];
        break;
      }

      case 'target': {
        const targetMatch = pathname.match(/\/A-([0-9]{6,12})/i) || pathname.match(/\/p\/(?:[^/]+\/)?-\/A-([0-9]{6,12})/i);
        if (targetMatch && targetMatch[1]) return targetMatch[1];
        const tcin = searchParams.get('tcin');
        if (tcin) return tcin;
        break;
      }

      case 'ebay': {
        const ebayMatch = pathname.match(/\/itm\/(?:[^/]+\/)?([0-9]{9,16})/i);
        if (ebayMatch && ebayMatch[1]) return ebayMatch[1];
        const itemParam = searchParams.get('item');
        if (itemParam) return itemParam;
        break;
      }

      case 'myntra': {
        const myntraMatch = pathname.match(/\/([0-9]{6,14})\/buy/i) || pathname.match(/-([0-9]{6,14})(?:\?|$)/i);
        if (myntraMatch && myntraMatch[1]) return myntraMatch[1];
        break;
      }

      default: {
        const productMatch = pathname.match(/\/products?\/(?:[^/]+\/)?([a-zA-Z0-9-_]+)/i);
        if (productMatch && productMatch[1]) return productMatch[1];
        const idParam = searchParams.get('id') || searchParams.get('productId') || searchParams.get('sku');
        if (idParam) return idParam;
        break;
      }
    }
  } catch {}

  // Fallback: SHA-256 8-char hash of path
  return crypto.createHash('sha256').update(cleanUrl).digest('hex').slice(0, 10);
}
