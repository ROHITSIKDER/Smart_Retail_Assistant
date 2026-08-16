import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Bot, Database, Sparkles } from 'lucide-react';

const STAGES = [
  { id: 1, label: 'Fetching e-commerce product specs & image', icon: Database },
  { id: 2, label: 'Extracting verified buyer review samples', icon: CheckCircle2 },
  { id: 3, label: 'Synthesizing Pros, Cons & Verdict via AI LLM', icon: Bot },
  { id: 4, label: 'Generating Shopping Intelligence Report', icon: Sparkles },
];

export const LoadingSkeleton = () => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto my-12 p-8 glass-card border-cyan-500/30 text-center animate-pulse-glow">
      <div className="inline-flex p-4 rounded-full bg-cyan-500/10 text-cyan-400 mb-6">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Analyzing Product & Reviews</h3>
      <p className="text-slate-400 text-xs mb-8">Please wait while our AI processes customer sentiment...</p>

      <div className="space-y-4 text-left max-w-md mx-auto">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isCurrent
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-medium'
                  : 'bg-dark-900/50 border-slate-800 text-slate-600'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              ) : (
                <Icon className="w-5 h-5 text-slate-600 shrink-0" />
              )}
              <span className="text-xs sm:text-sm">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
