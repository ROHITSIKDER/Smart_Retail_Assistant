import React from 'react';
import { ThumbsUp, AlertTriangle, XCircle, Star, ExternalLink, ShieldCheck } from 'lucide-react';

export const VerdictCard = ({ productInfo, report, platform, url }) => {
  const getVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'BUY':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          glow: 'glow-emerald',
          badgeBg: 'bg-emerald-500 text-dark-900',
          icon: ThumbsUp,
          label: 'HIGHLY RECOMMENDED'
        };
      case 'CONSIDER WITH CAUTION':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          glow: 'shadow-amber-500/20',
          badgeBg: 'bg-amber-500 text-dark-900',
          icon: AlertTriangle,
          label: 'PROCEED WITH CAUTION'
        };
      case 'PASS':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          glow: 'glow-rose',
          badgeBg: 'bg-rose-500 text-white',
          icon: XCircle,
          label: 'NOT RECOMMENDED'
        };
      default:
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          glow: 'glow-cyan',
          badgeBg: 'bg-cyan-500 text-dark-900',
          icon: ThumbsUp,
          label: 'ANALYSIS COMPLETE'
        };
    }
  };

  const style = getVerdictStyles(report.verdict);
  const VerdictIcon = style.icon;

  return (
    <div className="glass-card p-6 sm:p-8 mb-8 border-slate-700/80 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Product Thumbnail & Details */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-5 items-center sm:items-start lg:items-center text-center sm:text-left lg:text-center border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-8">
          <div className="relative group w-36 h-36 rounded-2xl bg-dark-900 p-2 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={productInfo.imageUrl}
              alt={productInfo.title}
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-dark-900/90 text-cyan-400 border border-cyan-500/30">
              {platform}
            </span>
          </div>

          <div className="flex-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{productInfo.brand}</span>
            <h2 className="text-base font-bold text-white line-clamp-2 mt-1 mb-2">
              {productInfo.title}
            </h2>

            <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{productInfo.rating} / 5</span>
              </div>

              <div className="text-lg font-extrabold text-cyan-400">
                {productInfo.price}
              </div>
            </div>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <span>View original store page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Right: Verdict Badge & Executive Rationale */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-xs font-extrabold tracking-wide uppercase ${style.bg}`}>
                <VerdictIcon className="w-4 h-4" />
                <span>{style.label}: {report.verdict}</span>
              </div>

              <div className="flex items-center gap-2">
                {report.isMock ? (
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Demo Mode (Mock Engine)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    Gemini 1.5 Flash
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-dark-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>AI Confidence: <strong className="text-cyan-400">{report.confidenceScore || 88}%</strong></span>
                </div>
              </div>
            </div>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-medium mb-4">
              "{report.verdictReason}"
            </p>

            <div className="p-4 rounded-xl bg-dark-900/60 border border-slate-800/80 text-xs text-slate-300">
              <span className="font-semibold text-cyan-400 uppercase tracking-wider block mb-1">Executive Summary</span>
              <p className="leading-relaxed">{report.summary}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
