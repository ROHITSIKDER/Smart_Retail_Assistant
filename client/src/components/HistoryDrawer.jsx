import React from 'react';
import { X, History, ExternalLink, ArrowRight, Star } from 'lucide-react';

export const HistoryDrawer = ({ isOpen, onClose, historyList = [], onSelectHistoryItem }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-dark-900/80 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-dark-800 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
          
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-lg">Analysis History</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            {historyList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No recent analyses yet. Paste a product link to start!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[75vh] pr-1">
                {historyList.map((item, idx) => {
                  const info = item.productInfo || {};
                  const verdict = item.report?.verdict || 'BUY';

                  return (
                    <div
                      key={item._id || idx}
                      onClick={() => {
                        onSelectHistoryItem(item);
                        onClose();
                      }}
                      className="p-3.5 rounded-xl bg-dark-900/70 hover:bg-dark-700/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        {info.imageUrl && (
                          <img
                            src={info.imageUrl}
                            alt=""
                            className="w-12 h-12 object-contain rounded-lg bg-dark-900 shrink-0 p-1 border border-slate-800"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                            {item.platform}
                          </span>
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {info.title || 'Product Analysis'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              verdict === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : verdict === 'PASS'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {verdict}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
            Smart Retail Assistant History Engine
          </div>

        </div>
      </div>
    </div>
  );
};
