
import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { UrlInput } from './components/UrlInput';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { HistoryDrawer } from './components/HistoryDrawer';
import { analyzeProductUrl, fetchHistory } from './services/api';
import { AlertCircle, RefreshCw, Clock, ShieldAlert, RotateCcw } from 'lucide-react';

export function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [lastAnalyzedUrl, setLastAnalyzedUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const abortControllerRef = useRef(null);

  const loadHistory = async () => {
    const res = await fetchHistory();
    if (res && res.success) {
      setHistory(res.data || []);
    }
  };

  useEffect(() => {
    loadHistory();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAnalyze = async (url, forceRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorInfo(null);
    setAnalysisData(null);
    setLastAnalyzedUrl(url);

    try {
      const response = await analyzeProductUrl(url, {
        signal: controller.signal,
        forceRefresh
      });

      if (response && response.success) {
        setAnalysisData(response.data);
        loadHistory(); // Refresh history list
      } else {
        throw new Error(response?.error || 'Failed to analyze product link');
      }
    } catch (err) {
      if (err.isCancelled) {
        console.log('Analysis was cancelled by user.');
        return;
      }
      console.error('Analysis error:', err);
      setErrorInfo({
        message: err.message || 'An error occurred while fetching product intelligence.',
        isTimeout: err.isTimeout || false,
        isBlocked: err.isBlocked || false,
        isTechnical: err.isTechnical || false,
        category: err.category || 'UNKNOWN',
        statusCode: err.statusCode || 500
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAnalysisData(null);
    setErrorInfo(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* Navigation Header */}
      <Navbar onOpenHistory={() => setIsHistoryOpen(true)} historyCount={history.length} />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        
        {/* Categorized Error Alert Banners */}
        {errorInfo && (
          <div className="max-w-3xl mx-auto mt-6 px-4">
            {errorInfo.isTimeout ? (
              /* 1. Timeout Alert Banner */
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 shadow-xl">
                <Clock className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1 text-xs sm:text-sm">
                  <strong className="font-bold block text-white mb-0.5">Analysis Request Timed Out</strong>
                  <p className="text-amber-200/90 mb-2">{errorInfo.message}</p>
                  <p className="text-xs text-amber-300/70 mb-3">
                    The retailer took longer than our 26-second pipeline budget to respond. You can retry the analysis or force a fresh scrape.
                  </p>
                  <div className="flex items-center gap-3">
                    {lastAnalyzedUrl && (
                      <>
                        <button
                          onClick={() => handleAnalyze(lastAnalyzedUrl, false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-medium border border-amber-500/40 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                        <button
                          onClick={() => handleAnalyze(lastAnalyzedUrl, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Force Refresh</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs underline text-amber-300 hover:text-white shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ) : errorInfo.isBlocked ? (
              /* 2. Blocked Source / Anti-Bot Alert Banner */
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-200 flex items-start gap-3 shadow-xl">
                <ShieldAlert className="w-5 h-5 shrink-0 text-purple-400 mt-0.5" />
                <div className="flex-1 text-xs sm:text-sm">
                  <strong className="font-bold block text-white mb-0.5">Retailer Security Interstitial Encountered</strong>
                  <p className="text-purple-200/90 mb-1">{errorInfo.message}</p>
                  <p className="text-xs text-purple-300/70">
                    The source retailer is actively challenging automated scraping (CAPTCHA / Cloudflare). In accordance with bot safety policies, we do not bypass interactive challenges.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs underline text-purple-300 hover:text-white shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              /* 3. Technical Failure / Generic Alert Banner */
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 shadow-xl">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 text-xs sm:text-sm">
                  <strong className="font-bold block text-white mb-0.5">
                    {errorInfo.isTechnical ? 'Data Extraction Failed' : 'Analysis Failed'}
                  </strong>
                  <p className="text-rose-200/90 mb-1">{errorInfo.message}</p>
                  {errorInfo.isTechnical && (
                    <p className="text-xs text-rose-300/70">
                      The product page structure could not be parsed. Please check that the URL is a valid, active product listing.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs underline text-rose-300 hover:text-white shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Switcher */}
        {!analysisData && !isLoading && (
          <UrlInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}

        {isLoading && (
          <LoadingSkeleton onCancel={handleCancel} />
        )}

        {analysisData && !isLoading && (
          <AnalysisDashboard analysisData={analysisData} onReset={handleReset} />
        )}

      </main>

      {/* Slide-over History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={history}
        onSelectHistoryItem={(item) => setAnalysisData(item)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>Smart Retail Assistant (SRA) • Phase 1 MVP</div>
          <div>Architected for Amazon, Flipkart & Multi-platform E-Commerce</div>
        </div>
      </footer>

    </div>
  );
}

export default App;
