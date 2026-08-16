import { describe, it, expect } from 'vitest';
import { extractProductId } from '../utils/productIdExtractor.js';

describe('productIdExtractor', () => {
  it('extracts Amazon ASIN from /dp/ URL', () => {
    const id = extractProductId('https://www.amazon.com/dp/B08N5WRWNW', 'amazon');
    expect(id).toBe('B08N5WRWNW');
  });

  it('extracts Amazon ASIN from /gp/product/ URL', () => {
    const id = extractProductId('https://www.amazon.in/gp/product/B09G9FPHY6?ref=example', 'amazon');
    expect(id).toBe('B09G9FPHY6');
  });

  it('extracts Amazon ASIN from query param', () => {
    const id = extractProductId('https://www.amazon.com/product-reviews?asin=B07PGL2ZSL', 'amazon');
    expect(id).toBe('B07PGL2ZSL');
  });

  it('extracts Flipkart item ID from /p/ URL', () => {
    const id = extractProductId('https://www.flipkart.com/apple-iphone-15/p/itm12345678abcdef', 'flipkart');
    expect(id).toBe('itm12345678abcdef');
  });

  it('extracts Flipkart PID from query param', () => {
    const id = extractProductId('https://www.flipkart.com/view-item?pid=MOBGTAG44WJAXD9P', 'flipkart');
    expect(id).toBe('MOBGTAG44WJAXD9P');
  });

  it('extracts Walmart Item ID', () => {
    const id = extractProductId('https://www.walmart.com/ip/Ninja-Blender/123456789', 'walmart');
    expect(id).toBe('123456789');
  });

  it('extracts Target TCIN', () => {
    const id = extractProductId('https://www.target.com/p/bose-speaker/-/A-82639102', 'target');
    expect(id).toBe('82639102');
  });

  it('extracts eBay item ID', () => {
    const id = extractProductId('https://www.ebay.com/itm/Sony-Camera/334567890123', 'ebay');
    expect(id).toBe('334567890123');
  });

  it('extracts Myntra style ID', () => {
    const id = extractProductId('https://www.myntra.com/shoes/nike/12345678/buy', 'myntra');
    expect(id).toBe('12345678');
  });

  it('extracts Generic product ID or falls back gracefully', () => {
    const id = extractProductId('https://www.store.com/products/ergonomic-chair', 'generic');
    expect(id).toBe('ergonomic-chair');
  });
});
