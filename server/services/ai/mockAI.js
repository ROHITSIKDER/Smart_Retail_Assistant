import { BaseAI } from './baseAI.js';
import { reportSchema } from './reportSchema.js';

export class MockAI extends BaseAI {
  async generateReport(productInfo, reviews = []) {
    const validReviews = Array.isArray(reviews) ? reviews.filter((r) => typeof r === 'string' && r.trim().length > 0) : [];
    const reviewCount = validReviews.length;

    let verdict = 'BUY';
    let verdictReason = '';
    let summary = '';
    let pros = [];
    let cons = [];
    let bestFor = [];
    let notRecommendedFor = [];
    let keyThemes = [];
    let confidenceScore = 88;

    // Case 1: 0 Reviews (NO_REVIEWS_FOUND)
    if (reviewCount === 0) {
      verdict = 'CONSIDER WITH CAUTION';
      verdictReason = 'No customer reviews available yet to verify real-world quality, reliability, or buyer satisfaction.';
      summary = `The ${productInfo.title} currently has no verified customer reviews available on the source store. While listed specifications and seller pricing are available, real-world buyer consensus cannot be established. Recommendation is based strictly on product metadata.`;
      pros = [
        { point: "Official product specifications and details are available from seller", impact: "MEDIUM" },
        { point: "Standard product category features matching stated specifications", impact: "LOW" }
      ];
      cons = [
        { point: "Zero customer reviews available to assess durability, quality control, or real-world performance", severity: "MODERATE" },
        { point: "Unverified buyer satisfaction and unknown post-purchase support experience", severity: "MODERATE" }
      ];
      bestFor = [
        "Early adopters willing to test unreviewed items",
        "Buyers looking strictly at listed technical specifications"
      ];
      notRecommendedFor = [
        "Shoppers requiring verified user feedback and peer ratings before purchasing"
      ];
      keyThemes = ["Unreviewed Product", "Specification-Based Analysis", "No Buyer Consensus"];
      confidenceScore = 30;
    }
    // Case 2: 1 or 2 Reviews (LIMITED_REVIEWS)
    else if (reviewCount < 3) {
      verdict = (productInfo.rating > 0 && productInfo.rating < 3.8) ? 'PASS' : 'CONSIDER WITH CAUTION';
      verdictReason = `Preliminary assessment based on an extremely limited sample of ${reviewCount} customer review(s). Independent consensus is not yet established.`;
      summary = `Customer feedback for the ${productInfo.title} is currently limited to ${reviewCount} review(s). While initial impressions provide early indicators, this limited feedback sample is insufficient to represent broad long-term buyer consensus. Exercise caution before purchasing.`;
      pros = validReviews.map((r) => ({
        point: `Reported by reviewer: "${r.trim().slice(0, 120)}${r.trim().length > 120 ? '...' : ''}"`,
        impact: "MEDIUM"
      }));
      cons = [
        { point: `Extremely limited review sample size (${reviewCount} review${reviewCount > 1 ? 's' : ''}) prevents establishing reliable quality consensus`, severity: "MODERATE" }
      ];
      bestFor = [
        "Cautious shoppers willing to verify additional third-party benchmarks"
      ];
      notRecommendedFor = [
        "Buyers seeking well-established products with broad community testing"
      ];
      keyThemes = ["Limited Review Sample", "Early Feedback", "Unverified Consensus"];
      confidenceScore = 45;
    }
    // Case 3: 3+ Reviews (REVIEWS_AVAILABLE)
    else {
      verdict = 'BUY';
      verdictReason = 'Offers strong core performance, solid durability, and high user satisfaction for its price segment.';
      summary = `The ${productInfo.title} receives positive feedback from buyers for its design, ease of use, and overall value. Customer reviews consistently highlight reliable daily performance with minimal setup friction. While a few users noted minor ergonomic or material trade-offs, it stands out as a competitive choice in its category.`;
      pros = [
        { point: "Exceptional build quality and premium material finish", impact: "HIGH" },
        { point: "Intuitive user interface and effortless daily operation", impact: "HIGH" },
        { point: "Impressive efficiency and reliable battery/power management", impact: "MEDIUM" },
        { point: "Strong value for money relative to rival premium alternatives", impact: "MEDIUM" }
      ];
      cons = [
        { point: "Slightly steep learning curve for initial configuration options", severity: "MODERATE" },
        { point: "Included accessories feel basic compared to main unit quality", severity: "MINOR" }
      ];
      bestFor = [
        "Daily power users seeking reliability",
        "Buyers prioritizing build quality over gimmicks",
        "Gifting for tech-savvy individuals"
      ];
      notRecommendedFor = [
        "Budget-only shoppers seeking absolute lowest price point",
        "Users requiring legacy connection support"
      ];
      keyThemes = ["Build Quality", "Battery Performance", "Ease of Use", "Value for Money"];
      confidenceScore = 89;

      if (productInfo.rating > 0 && productInfo.rating < 3.8) {
        verdict = 'CONSIDER WITH CAUTION';
        verdictReason = 'Reported build consistency issues and mixed customer satisfaction warrant careful consideration before buying.';
        cons.unshift({ point: "Frequent quality control variations reported across customer batches", severity: "CRITICAL" });
      }
    }

    const report = {
      summary,
      verdict,
      verdictReason,
      pros,
      cons,
      bestFor,
      notRecommendedFor,
      keyThemes,
      confidenceScore,
      isMock: true,
      provider: 'mock'
    };

    return reportSchema.parse(report);
  }
}
