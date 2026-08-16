import React from 'react';
import { CheckCircle2, AlertOctagon, Flame } from 'lucide-react';

export const ProsConsGrid = ({ pros = [], cons = [] }) => {
  const getImpactBadge = (impact) => {
    switch (impact) {
      case 'HIGH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'MEDIUM':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      
      {/* Pros Panel */}
      <div className="glass-card p-6 border-emerald-500/20 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Key Advantages (Pros)</h3>
            <p className="text-xs text-slate-400">Main highlights extracted from positive reviews</p>
          </div>
        </div>

        <div className="space-y-3">
          {pros.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-dark-900/60 border border-slate-800/80">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {item.point}
                </span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded border shrink-0 uppercase ${getImpactBadge(item.impact)}`}>
                {item.impact || 'PRO'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cons Panel */}
      <div className="glass-card p-6 border-rose-500/20 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Potential Dealbreakers (Cons)</h3>
            <p className="text-xs text-slate-400">Reported issues, complaints & trade-offs</p>
          </div>
        </div>

        <div className="space-y-3">
          {cons.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-dark-900/60 border border-slate-800/80">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 mt-2 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {item.point}
                </span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider rounded border shrink-0 uppercase ${getSeverityBadge(item.severity)}`}>
                {item.severity || 'CON'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
