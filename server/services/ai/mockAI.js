import { BaseAI } from './baseAI.js';
import { reportSchema } from './reportSchema.js';

export class MockAI extends BaseAI {
  async generateReport(productInfo, reviews) {
    const title = productInfo.title.toLowerCase();
    
    let verdict = 'BUY';
    let verdictReason = 'Offers strong core performance, solid durability, and high user satisfaction for its price segment.';
    let summary = `The ${productInfo.title} receives overwhelmingly positive feedback from buyers for its design, ease of use, and overall value. Customer reviews consistently highlight reliable daily performance with minimal setup friction. While a few users noted minor ergonomic or material trade-offs, it stands out as a highly competitive choice in its category.`;
    
    let pros = [
      { point: "Exceptional build quality and premium material finish", impact: "HIGH" },
      { point: "Intuitive user interface and effortless daily operation", impact: "HIGH" },
      { point: "Impressive efficiency and reliable battery/power management", impact: "MEDIUM" },
      { point: "Strong value for money relative to rival premium alternatives", impact: "MEDIUM" }
    ];

    let cons = [
      { point: "Slightly steep learning curve for initial configuration options", severity: "MODERATE" },
      { point: "Included accessories feel basic compared to main unit quality", severity: "MINOR" }
    ];

    let bestFor = [
      "Daily power users seeking reliability",
      "Buyers prioritizing build quality over gimmicks",
      "Gifting for tech-savvy individuals"
    ];

    let notRecommendedFor = [
      "Budget-only shoppers seeking absolute lowest price point",
      "Users requiring legacy connection support"
    ];

    let keyThemes = ["Build Quality", "Battery Performance", "Ease of Use", "Value for Money"];

    // Adjust synthesized response based on rating if available
    if (productInfo.rating > 0 && productInfo.rating < 3.8) {
      verdict = 'CONSIDER WITH CAUTION';
      verdictReason = 'Reported build consistency issues and mixed customer satisfaction warrant careful consideration before buying.';
      cons.unshift({ point: "Frequent quality control variations reported across customer batches", severity: "CRITICAL" });
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
      confidenceScore: 89,
      isMock: true,
      provider: 'mock'
    };

    return reportSchema.parse(report);
  }
}
