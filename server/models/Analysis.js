import mongoose from 'mongoose';

const proSchema = new mongoose.Schema({
  point: { type: String, required: true },
  impact: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' }
}, { _id: false });

const conSchema = new mongoose.Schema({
  point: { type: String, required: true },
  severity: { type: String, enum: ['CRITICAL', 'MODERATE', 'MINOR'], default: 'MODERATE' }
}, { _id: false });

const analysisSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    urlHash: { type: String, required: true, unique: true, index: true },
    platform: { 
      type: String, 
      enum: ['amazon', 'flipkart', 'generic', 'walmart', 'target', 'ebay', 'myntra'], 
      default: 'generic' 
    },
    dataQualityState: {
      type: String,
      enum: ['REVIEWS_AVAILABLE', 'LIMITED_REVIEWS', 'NO_REVIEWS_FOUND', 'SOURCE_BLOCKED', 'SCRAPE_FAILED'],
      default: 'REVIEWS_AVAILABLE'
    },
    productInfo: {
      productId: { type: String, default: '' },
      title: { type: String, required: true },
      brand: { type: String, default: 'Brand N/A' },
      price: { type: String, default: 'Price unavailable' },
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      imageUrl: { type: String, default: '' },
    },
    report: {
      summary: { type: String, required: true },
      verdict: {
        type: String,
        enum: ['BUY', 'CONSIDER WITH CAUTION', 'PASS'],
        required: true,
      },
      verdictReason: { type: String, required: true },
      pros: [proSchema],
      cons: [conSchema],
      bestFor: [{ type: String }],
      notRecommendedFor: [{ type: String }],
      keyThemes: [{ type: String }],
      confidenceScore: { type: Number, default: 88 },
    },
    reviewsAnalyzedCount: { type: Number, default: 0 },
    rawReviewsSample: [{ type: String }],
  },
  { timestamps: true }
);

// 7-day automatic TTL expiry for cached product analysis
analysisSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model('Analysis', analysisSchema);

