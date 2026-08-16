import React, { useState } from 'react';
import { Search, ArrowRight, X, ExternalLink, Sparkles } from 'lucide-react';

const PLATFORM_PATTERNS = [
  { match: /amazon\./i, label: 'Amazon' },
  { match: /flipkart\./i, label: 'Flipkart' },
  { match: /walmart\./i, label: 'Walmart' },
  { match: /target\./i, label: 'Target' },
  { match: /ebay\./i, label: 'eBay' },
  { match: /myntra\./i, label: 'Myntra' }
];

const SAMPLE_URLS = [
  {
    name: 'Amazon Headphones',
    platform: 'Amazon',
    url: 'https://www.amazon.in/dp/B08N5WRWNW'
  },
  {
    name: 'Flipkart Smartwatch',
    platform: 'Flipkart',
    url: 'https://www.flipkart.com/pulsetech-smartwatch/p/itm123456789'
  },
  {
    name: 'Walmart Blender',
    platform: 'Walmart',
    url: 'https://www.walmart.com/ip/example-blender/123456789'
  },
  {
    name: 'Target Speaker',
    platform: 'Target',
    url: 'https://www.target.com/p/example-speaker/-/A-12345678'
  },
  {
    name: 'eBay Camera',
    platform: 'eBay',
    url: 'https://www.ebay.com/itm/example-camera/123456789'
  },
  {
    name: 'Myntra Sneakers',
    platform: 'Myntra',
    url: 'https://www.myntra.com/sneakers/example/12345678/buy'
  }
];

function detectPlatformLabel(url) {
  if (!url || url.trim().length <= 10) {
    return null;
  }

  const entry = PLATFORM_PATTERNS.find((platform) => platform.match.test(url));
  return entry ? entry.label : 'Generic E-Commerce';
}

export const UrlInput = ({ onAnalyze, isLoading }) => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    setDetectedPlatform(detectPlatformLabel(val));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onAnalyze(url.trim());
    }
  };

  const handleSelectSample = (sampleUrl) => {
    setUrl(sampleUrl);
    handleInputChange({ target: { value: sampleUrl } });
    onAnalyze(sampleUrl);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 text-center">
      {/* Hero Header */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Skip Reading 500+ Customer Reviews</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
        Make Smarter Buying Decisions with <br className="hidden sm:inline" />
        <span className="gradient-text">Instant AI Shopping Intelligence</span>
      </h1>

      <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
        Paste any e-commerce product link (Amazon, Flipkart, Walmart, Target, eBay, Myntra, and more). Our AI extracts customer consensus, uncovers hidden cons, and generates an honest buying verdict in seconds.
      </p>

      {/* URL Form Input */}
      <form onSubmit={handleSubmit} className="relative mb-6">
        <div className="relative glass-card p-2 flex items-center gap-2 border-slate-700/80 shadow-2xl focus-within:border-cyan-500/80 transition-all duration-300">
          <div className="pl-3 text-slate-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            type="url"
            value={url}
            onChange={handleInputChange}
            placeholder="Paste product URL (e.g. https://www.amazon.in/dp/...)"
            required
            disabled={isLoading}
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none px-2 py-2"
          />

          {url && (
            <button
              type="button"
              onClick={() => { setUrl(''); setDetectedPlatform(null); }}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Detected Badge */}
          {detectedPlatform && (
            <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-medium rounded-lg bg-dark-700 text-cyan-300 border border-slate-700">
              {detectedPlatform}
            </span>
          )}

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <span>{isLoading ? 'Analyzing...' : 'Analyze Product'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Sample Links Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-500">Or try sample links:</span>
        {SAMPLE_URLS.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectSample(sample.url)}
            disabled={isLoading}
            className="flex items-center gap-1 bg-dark-800/80 hover:bg-dark-700 text-slate-300 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors duration-200"
          >
            <span>{sample.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  );
};
