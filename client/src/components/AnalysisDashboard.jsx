import React, { useState } from 'react';
import { VerdictCard } from './VerdictCard';
import { ProsConsGrid } from './ProsConsGrid';
import { TargetAudience } from './TargetAudience';
import { KeyThemes } from './KeyThemes';
import { Copy, Check, RotateCcw, MessageSquareText } from 'lucide-react';

export const AnalysisDashboard = ({ analysisData, onReset }) => {
  const [copied, setCopied] = useState(false);

  if (!analysisData) return null;

  const { productInfo, report, platform, url, rawReviewsSample = [], dataQualityState } = analysisData;

  const handleCopyReport = () => {
    const text = `
🛒 SMART RETAIL ASSISTANT REPORT
----------------------------------
Product: ${productInfo.title}
Price: ${productInfo.price} | Rating: ${productInfo.rating}⭐
Platform: ${platform}
Data Quality: ${dataQualityState || 'REVIEWS_AVAILABLE'}

VERDICT: ${report.verdict}
"${report.verdictReason}"

SUMMARY:
${report.summary}

PROS:
${report.pros.map((p) => `• ${p.point} [${p.impact}]`).join('\n')}

CONS:
${report.cons.map((c) => `• ${c.point} [${c.severity}]`).join('\n')}

BEST FOR: ${report.bestFor.join(', ')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 animate-fade-in">
      
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 px-3.5 py-2 rounded-xl border border-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span>Analyze Another Product</span>
        </button>

        <button
          onClick={handleCopyReport}
          className="flex items-center gap-2 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 rounded-xl border border-cyan-500/30 transition-colors shadow-lg shadow-cyan-500/10"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
          <span>{copied ? 'Report Copied!' : 'Copy Summary Report'}</span>
        </button>
      </div>

      {/* Main Report Cards */}
      <VerdictCard productInfo={productInfo} report={report} platform={platform} url={url} dataQualityState={dataQualityState} />
      <ProsConsGrid pros={report.pros} cons={report.cons} />
      <TargetAudience bestFor={report.bestFor} notRecommendedFor={report.notRecommendedFor} />
      <KeyThemes themes={report.keyThemes} />

      {/* Raw Reviews Sample Section */}
      <div className="glass-card p-6 border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareText className="w-4 h-4 text-cyan-400" />
          <h4 className="font-bold text-white text-xs uppercase tracking-wider">
            Sample Customer Reviews Analyzed ({rawReviewsSample.length})
          </h4>
        </div>
        {rawReviewsSample.length > 0 ? (
          <div className="space-y-3">
            {rawReviewsSample.map((rev, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-dark-900/60 border border-slate-800 text-xs text-slate-300 italic">
                "{rev}"
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No customer reviews were found on the source product page. Analysis was performed using verified seller product specifications.
          </p>
        )}
      </div>

    </div>
  );
};
