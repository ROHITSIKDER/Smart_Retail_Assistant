import React from 'react';
import { Sparkles, History, ShoppingBag, ShieldCheck } from 'lucide-react';

export const Navbar = ({ onOpenHistory, historyCount = 0 }) => {
  return (
    <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                Smart Retail <span className="gradient-text">Assistant</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Phase 1 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Instant AI Product & Review Intelligence
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AI Scraper Active</span>
          </div>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-dark-800 hover:bg-dark-700 px-3.5 py-2 rounded-xl border border-slate-700/80 transition-all duration-200 hover:text-white"
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-cyan-500 text-dark-900 font-bold rounded-full">
                {historyCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
