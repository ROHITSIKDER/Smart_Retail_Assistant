import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { UrlInput } from './components/UrlInput';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { HistoryDrawer } from './components/HistoryDrawer';
import { analyzeProductUrl, fetchHistory } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const loadHistory = async () => {
    const res = await fetchHistory();
    if (res && res.success) {
      setHistory(res.data || []);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleAnalyze = async (url) => {
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      const response = await analyzeProductUrl(url);
      if (response && response.success) {
        setAnalysisData(response.data);
        loadHistory(); // Refresh history list
      } else {
        throw new Error(response.error || 'Failed to analyze product link');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred while fetching product intelligence.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* Navigation Header */}
      <Navbar onOpenHistory={() => setIsHistoryOpen(true)} historyCount={history.length} />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        
        {/* Error Alert Banner */}
        {error && (
          <div className="max-w-3xl mx-auto mt-6 px-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 shadow-xl">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm">
                <strong className="font-bold block text-white mb-0.5">Analysis Failed</strong>
                <span>{error}</span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs underline text-rose-300 hover:text-white shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* View Switcher */}
        {!analysisData && !isLoading && (
          <UrlInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}

        {isLoading && (
          <LoadingSkeleton />
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
