import React from 'react';
import { UserCheck, UserX } from 'lucide-react';

export const TargetAudience = ({ bestFor = [], notRecommendedFor = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      
      {/* Best For */}
      <div className="glass-card p-6 border-cyan-500/20">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-cyan-400" />
          <h4 className="font-bold text-white text-sm uppercase tracking-wider">Best For</h4>
        </div>
        <ul className="space-y-2">
          {bestFor.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 bg-dark-900/50 p-2.5 rounded-lg border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Not Recommended For */}
      <div className="glass-card p-6 border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-5 h-5 text-rose-400" />
          <h4 className="font-bold text-white text-sm uppercase tracking-wider">Avoid If You Are</h4>
        </div>
        <ul className="space-y-2">
          {notRecommendedFor.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 bg-dark-900/50 p-2.5 rounded-lg border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};
