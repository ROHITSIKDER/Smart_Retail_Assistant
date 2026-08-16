import React from 'react';
import { Tag } from 'lucide-react';

export const KeyThemes = ({ themes = [] }) => {
  if (!themes || themes.length === 0) return null;

  return (
    <div className="glass-card p-6 mb-8 border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-purple-400" />
        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Top Mentioned Attributes</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {themes.map((theme, idx) => (
          <span
            key={idx}
            className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
          >
            #{theme}
          </span>
        ))}
      </div>
    </div>
  );
};
