import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Bot, Database, Sparkles, XCircle } from 'lucide-react';

const STAGES = [
  { id: 1, label: 'Fetching e-commerce product specs & image', icon: Database },
  { id: 2, label: 'Extracting verified buyer review samples', icon: CheckCircle2 },
  { id: 3, label: 'Synthesizing Pros, Cons & Verdict via AI LLM', icon: Bot },
  { id: 4, label: 'Generating Shopping Intelligence Report', icon: Sparkles },
];

export const LoadingSkeleton = ({ onCancel }) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2500);

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stageInterval);
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto my-12 p-8 glass-card border-cyan-500/30 text-center animate-pulse-glow">
      <div className="inline-flex p-4 rounded-full bg-cyan-500/10 text-cyan-400 mb-4">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Analyzing Product & Reviews</h3>
      <p className="text-slate-400 text-xs mb-3">Please wait while our AI extracts specifications and customer feedback...</p>
      
      {/* Live elapsed timer badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mb-6">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>Elapsed: <strong className="text-cyan-300">{elapsedSeconds}s</strong> / max 26s budget</span>
      </div>

      <div className="space-y-4 text-left max-w-md mx-auto mb-6">
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

      {onCancel && (
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors"
        >
          <XCircle className="w-4 h-4 text-rose-400" />
          <span>Cancel Analysis</span>
        </button>
      )}
    </div>
  );
};
