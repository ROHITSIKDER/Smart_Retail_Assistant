# 🚀 Smart Retail Assistant (SRA) - Master Project Tracker & Documentation

## 📌 1. Project Goal & Overview
**Smart Retail Assistant (SRA)** is an AI-powered e-commerce intelligence engine designed to analyze product URLs from major retail platforms (Amazon, Flipkart, Walmart, Target, eBay, Myntra, and Generic E-commerce), scrape authentic customer feedback, synthesize consensus using Google Gemini AI, and present executive buying recommendations (`BUY`, `CONSIDER WITH CAUTION`, `PASS`).

- **Architecture**: Monorepo (`/server`: Express + Mongoose + Cheerio + Playwright + Gemini AI | `/client`: React + Vite + Tailwind CSS)
- **Current Status**: 🟢 **Phase 2.1 Universal Multi-Store Extraction Reliability Hardening Complete** — Foundation Ready for **Phase 3 Deep AI Insights & Analytics**

---

## 📋 2. Execution Checklist & Status

### Phase 1: MVP Core Implementation — 🟢 Completed
- [x] **0. Monorepo Setup & Architecture Design**
- [x] **1. Backend Express API (`/server`)**
  - [x] Mongo Atlas / Local Mongoose connection with memory cache fallback
  - [x] Mongoose `Analysis` model schema & SHA-256 URL hashing
  - [x] Modular Scraper Engine (`BaseScraper`, `AmazonScraper`, `FlipkartScraper`, `GenericScraper`)
  - [x] AI Engine (`GeminiAI` using `@google/genai` + `MockAI` fallback)
  - [x] Controllers & Routes (`/api/v1/analyze`, `/api/v1/history`, `/api/v1/health`)
  - [x] Basic URL syntax validation middleware (`validateUrl.js`)
- [x] **2. Frontend React UI (`/client`)**
  - [x] Glassmorphic dark-mode Tailwind CSS styling
  - [x] Hero `UrlInput` with platform auto-detection & sample links
  - [x] Animated `LoadingSkeleton` stage visualizer
  - [x] `AnalysisDashboard` (`VerdictCard`, `ProsConsGrid`, `TargetAudience`, `KeyThemes`)
  - [x] Slide-over `HistoryDrawer` for recent 10 reports

---

### Phase 1.5: Security, Data Integrity & Reliability Hardening — 🟢 Completed
- [x] **Task 1: SSRF Defense Implementation (BUG-002)**
  - [x] Implement DNS IP lookup in `validateUrl.js`
  - [x] Block private/reserved IPs and internal hostnames
- [x] **Task 2: Elimination of Deceptive Synthetic Reviews (BUG-003)**
  - [x] Remove hardcoded fake review fallback from scrapers
  - [x] Return explicit `INSUFFICIENT_DATA` status when scraping fails or review count < 3
- [x] **Task 3: API Security & Rate Limiting (BUG-004)**
  - [x] Add `express-rate-limit` middleware (10 req/15 min per IP)
  - [x] Configure restricted CORS origin configuration
- [x] **Task 4: Cache Expiry & Manual Refresh (BUG-005)**
  - [x] Add 7-day TTL index on `createdAt` in `Analysis.js` schema
  - [x] Add `forceRefresh=true` query/body flag handling in `AnalysisService`
- [x] **Task 5: DB Offline Delay Elimination (BUG-006)**
  - [x] Track connection status in `db.js`; bypass Mongoose calls immediately if DB is down
- [x] **Task 6: AI JSON Output Schema Validation (BUG-007)**
  - [x] Enforce Zod schema validation on Gemini JSON response before DB persistence
- [x] **Task 7: Automated Test Suite (BUG-010)**
  - [x] Add Vitest & Supertest suite for API endpoints and SSRF middleware validation

---

### Phase 2: Advanced Extraction, Multi-Store Expansion & Security Hardening — 🟢 Completed
- [x] **Task 1: Multi-Store Scraper Suite Expansion**
  - [x] Headless browser scraping with Playwright (`HeadlessScraper` & `BrowserPool`)
  - [x] Platform scrapers for Walmart, Target, eBay, and Myntra
  - [x] Dynamic selector fallback with JSON-LD metadata parsing
- [x] **Task 2: Anti-Bot & Proxy Rotation Engine**
  - [x] Round-robin & random proxy rotation with automatic failure cooldown (`ProxyManager`)
  - [x] Realistic rotating User-Agents and HTTP client headers
  - [x] Sanitized proxy URL formatting (redacting credentials in logs & fixing Playwright port duplication)
- [x] **Task 3: Connection-Level SSRF & Redirect Defense**
  - [x] Implemented `safeFetch.js` with custom `safeLookup` agent inspecting every redirect hop
  - [x] Exhaustive IPv4 & IPv6 private/reserved address validation (`ipValidator.js` covering IPv4-mapped IPv6, CGNAT, Link-Local)
  - [x] Playwright route interception aborting private/internal requests
- [x] **Task 4: Persistence, Caching & Concurrency Hardening**
  - [x] Fixed `forceRefresh` using `findOneAndUpdate(..., { upsert: true })` preventing `E11000` duplicate key errors
  - [x] Bounded in-memory fallback cache (max 100 items with LRU eviction)
  - [x] Reverse ordering for memory-cache history and sanitized query limits (1 to 50)
- [x] **Task 5: AI Engine Reliability & Prompt Injection Defense**
  - [x] Enclosed untrusted customer reviews in `<customer_review_untrusted>` XML tags
  - [x] Input bounding & truncation (max 20 reviews, max 500 chars each)
  - [x] Added `isMock: true/false` and `provider: 'gemini' | 'mock'` in `reportSchema.js`
  - [x] Added frontend UI indicator in `VerdictCard.jsx` distinguishing Demo/Mock mode vs Live Gemini AI
- [x] **Task 6: Production Hardening & Dependency Pinning**
  - [x] Pinned `@google/genai` to exact release `2.15.0`
  - [x] Configured fail-closed CORS outside development and 100KB JSON payload limits
  - [x] Comprehensive 39 automated tests across 7 test suites with 100% pass rate

---

### Phase 2.1: Universal Multi-Store Extraction Reliability Hardening — 🟢 Completed
- [x] **Task 1: Multi-Signal Response Validation (BUG-014)**
  - [x] Built shared `ResponseValidator` checking status, titles, body content, CAPTCHA signatures, and product signals.
  - [x] Eliminate `HTTP 200 == valid product page` assumption across all platforms.
  - [x] Detect anti-bot interstitials, robot checks, access-denied pages, login walls, and JavaScript-only shells.
- [x] **Task 2: Intelligent Browser Fallback Orchestration**
  - [x] Automatically trigger `HeadlessScraper` when Direct HTTP is blocked or returns a JavaScript shell.
  - [x] Re-validate browser DOM; safely fail with structured error if still blocked.
- [x] **Task 3: Structured Error Categorization & Redacted Diagnostics**
  - [x] Created `ExtractionError` with 15 granular categories (`CAPTCHA`, `BOT_BLOCKED`, `RATE_LIMITED`, `ACCESS_DENIED`, `LOGIN_REQUIRED`, `JAVASCRIPT_REQUIRED`, `INVALID_PRODUCT_PAGE`, `LAYOUT_CHANGED`, `PRODUCT_NOT_FOUND`, `REVIEWS_BLOCKED`, `INSUFFICIENT_REVIEWS`, etc.).
  - [x] Structured diagnostics with full redaction of credentials, headers, and raw HTML.
- [x] **Task 4: Robust Structured Data & Product ID Extraction**
  - [x] Enhanced JSON-LD parsing for `@graph`, array, and single object structures.
  - [x] Built `productIdExtractor` extracting ASIN, Item ID, TCIN, PID, and Style ID.
  - [x] Independent product extraction vs review extraction statuses.
- [x] **Task 5: Multi-Store Regression & Fixture Test Suite**
  - [x] Added 12 sanitized HTML fixtures for Amazon, Flipkart, Walmart, Target, eBay, Myntra, and Generic stores.
  - [x] 66 automated tests across 9 test files passing with 100% success rate.

---

### Phase 3: Deep AI Insights & Analytics — 🔵 Planned
- [ ] Historical price tracking and price drop alerts
- [ ] AI-powered Fake Review / Sentiment Manipulation Detection Index
- [ ] Side-by-side multi-product comparison matrix

---

### Phase 4: Chrome Extension & Public API — 🔵 Planned
- [ ] Chrome/Edge Browser Extension auto-detecting product URLs
- [ ] User authentication & API Key management for external developers

---

## 🐛 3. Bug, Vulnerability & Issue Tracker

| Bug ID | Severity | Component | Description & Root Cause | Status | Resolution / Action Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Low | Dependencies | `npm install` failed for `@google/genai@^0.1.1` | 🛠 Fixed | Pinned `server/package.json` dependency to `"2.15.0"`. |
| **BUG-002** | 🔴 Critical | Security | **SSRF Vulnerability**: `validateUrl.js` allows internal/private IP requests & redirect bypasses. | 🛠 Fixed | Implemented `safeFetch.js` and `ipValidator.js` checking all IPv4/IPv6 private ranges, IPv4-mapped IPv6, CGNAT, and Playwright route interception. |
| **BUG-003** | 🔴 Critical | Data Integrity | **Deceptive Fake Reviews**: Scrapers silently inject hardcoded headphone/watch reviews when extraction fails or reviews < 3. | 🛠 Fixed | Return explicit `INSUFFICIENT_DATA` 422 error when review count < 3. |
| **BUG-004** | 🟠 High | Security | **Unrestricted Public API**: `cors({ origin: '*' })` with no rate limiting or abuse protection. | 🛠 Fixed | Implemented 10 req/15 min rate limiter, fail-closed CORS in production, and 100KB payload limit. |
| **BUG-005** | 🟠 High | Architecture | **Permanent Cache & forceRefresh Crash**: `Analysis.create()` fails on refresh with duplicate key error `E11000`. | 🛠 Fixed | Replaced with `findOneAndUpdate` with `upsert: true`, 7-day TTL index, and bounded memory cache. |
| **BUG-006** | 🟡 Medium | Performance | **MongoDB Offline Delays**: Disconnected DB causes 5s Mongoose query buffering timeouts per request. | 🛠 Fixed | Added global connection state tracking in `db.js` to skip DB calls when offline. |
| **BUG-007** | 🟡 Medium | Reliability | **Unvalidated AI Output**: Gemini JSON response parsed without schema validation. | 🛠 Fixed | Enforced shared Zod `reportSchema` on Gemini AI and Mock AI output with `isMock` and `provider` tracking. |
| **BUG-008** | 🟡 Medium | Concurrency | **Duplicate Request Race Condition**: Simultaneous requests for uncached URL run duplicate scraping/AI jobs. | 🛠 Fixed | Added in-flight request deduplication lock in `AnalysisService`. |
| **BUG-009** | 🟡 Medium | UX/API | **Timeout Mismatch**: Frontend Axios timeout (30s) aborts while server continues long scraper/AI operations. | 🛠 Fixed | Lowered Playwright navigation timeouts and added bounded selector waits. |
| **BUG-010** | 🟡 Medium | Quality | **Zero Test Coverage**: No unit, integration, or API tests exist in the project. | 🛠 Fixed | Implemented Vitest + Supertest suite with 100% pass rate across 66 tests in 9 test suites. |
| **BUG-011** | 🟢 Low | i18n/Encoding | **Mojibake Risk**: Currency symbols (`₹`) & emojis could misrender if non-UTF-8 parsed. | 🛠 Fixed | Enforced explicit UTF-8 encoding in HTML and response headers. |
| **BUG-012** | 🟢 Low | Scrapers | **ProxyManager Port Doubling & Credential Leak**: Playwright server URL generated duplicate ports (`proxy3:8888:8888`) and retained auth credentials in `proxy.url`. | 🛠 Fixed | Redacted credentials in `parseProxyUrl` and formatted Playwright proxy server cleanly. |
| **BUG-013** | 🟡 Medium | Security/AI | **Prompt Injection via Customer Reviews**: Untrusted scraped reviews passed raw into LLM prompt. | 🛠 Fixed | Encapsulated reviews in XML tags with length bounding (max 500 chars, max 20 reviews) and strict instructions. |
| **BUG-014** | 🔴 Critical | Extraction | **Multi-Store HTTP 200 Interstitial / False Success**: Scrapers assumed HTTP 200 meant valid product DOM. Interstitials and CAPTCHAs caused missing selectors and unclassified 422 crashes without browser fallback. | 🛠 Fixed | Built multi-signal `ResponseValidator`, automatic `HeadlessScraper` fallback orchestration, structured `ExtractionError` taxonomy, `@graph` JSON-LD parsing, and `productIdExtractor`. |

---

## 📝 4. Development Activity Log

### Date: 2026-08-15
- **Phase 2.1 Multi-Store Extraction Reliability Hardening Complete**:
  - **Confirmed Root Cause**: Direct HTTP requests to Amazon/Flipkart/Walmart/Target returning HTTP 200 with CAPTCHA/bot-check/JS shell bypassed Axios catch blocks, returned non-product DOM, failed on primary selector, and crashed with unclassified 422 error without triggering browser fallback.
  - **Built `ResponseValidator`**: Multi-signal response inspection checking HTTP status, page title, body HTML, CAPTCHA signatures, bot blocks, login walls, and product markers.
  - **Implemented `ExtractionError` Taxonomy**: 15 structured categories (`CAPTCHA`, `BOT_BLOCKED`, `RATE_LIMITED`, `ACCESS_DENIED`, `LOGIN_REQUIRED`, `JAVASCRIPT_REQUIRED`, `INVALID_PRODUCT_PAGE`, `LAYOUT_CHANGED`, `PRODUCT_NOT_FOUND`, `REVIEWS_BLOCKED`, `INSUFFICIENT_REVIEWS`, etc.).
  - **Built `productIdExtractor`**: Universal identifier extractor for Amazon (ASIN), Flipkart (PID), Walmart (Item ID), Target (TCIN), eBay (Item ID), Myntra (Style ID), and Generic stores.
  - **Hardened `BaseScraper` & Platform Scrapers**:
    - Automatic browser fallback orchestration when direct HTTP encounters bot interstitial or JS shell.
    - Robust `@graph`, array, and single-object JSON-LD schema parsing.
    - Redacted structured diagnostics without leaking credentials or raw HTML.
    - Product and review separation preventing deceptive review synthesis.
  - **Sanitized Fixtures & Expanded Test Suite**: Created 12 sanitized HTML fixtures across all 7 supported stores. Test suite expanded to 66 passing tests across 9 test files (100% pass rate).

### Date: 2026-08-15
- **Phase 2 Implementation Complete**:
  - **ProxyManager Fixes**: Resolved 2 test failures by sanitizing `parseProxyUrl` to redact credentials and constructing Playwright proxy server URL with `parsed.host`.
  - **Connection-Level SSRF Hardening**: Built `server/utils/ipValidator.js` and `server/utils/safeFetch.js`. Configured `safeLookup` agent validating each resolved IP on every connection/redirect.
  - **Playwright SSRF Guard**: Added route interception in `HeadlessScraper.js` to abort requests to localhost, internal hosts, or private IPs.
  - **MongoDB `forceRefresh` Upsert**: Fixed `AnalysisService.js` to use `findOneAndUpdate` with `upsert: true` preventing duplicate key exceptions on manual refresh.
  - **Memory Cache & History Sanitization**: Added LRU eviction for in-memory cache (max 100 items), reversed in-memory history order (newest first), and capped `GET /history?limit=` to 1-50.
  - **AI Prompt Injection & Traceability**: Encapsulated customer reviews in `<customer_review_untrusted>` XML tags, bounded input to 20 reviews / 500 chars each, and added `isMock` + `provider` fields to `reportSchema.js`, `geminiAI.js`, `mockAI.js`, and `VerdictCard.jsx`.
  - **CORS & Payload Security**: Configured `server/server.js` to fail closed outside development environments and restricted JSON payloads to 100KB.
  - **Dependency Pinning**: Pinned `@google/genai` to `"2.15.0"`.
  - **Test Suite Expansion**: Added `safeFetch.test.js` and updated `analysisApi.test.js` & `validateUrl.test.js`, achieving 39/39 passing tests (100% pass rate).

### Date: 2026-08-08
- **Phase 1.5 Hardening Complete**: Fully executed Phase 1.5 Security, Data Integrity & Reliability Hardening.
- **Scraper Error Status Codes**: Assigned explicit HTTP status codes (`502 Bad Gateway` for anti-bot blocks/network failures, `422 Unprocessable Entity` for unparseable HTML/insufficient reviews) in scrapers.
- **Frontend Error Propagation**: Updated `client/src/services/api.js` to extract and display human-readable server error messages.
- **SSRF Defense (BUG-002)**: Added strict DNS resolution & private IP blocklist middleware (`validateUrl.js`).
- **Synthetic Review Removal (BUG-003)**: Enforced `INSUFFICIENT_DATA` error (HTTP 422) for products with review count < 3 across all scrapers.
- **Cache Expiry & Manual Refresh (BUG-005)**: Configured 7-day Mongoose TTL index and `forceRefresh` support.
- **AI Schema Validation (BUG-007)**: Created shared Zod schema `reportSchema.js` and validated AI outputs.

### Date: 2026-07-31
- **MVP Completion**: Implemented Express backend (`/server`) and React Vite frontend (`/client`).
- **Code Audit**: Audited codebase and identified 11 open bugs/vulnerabilities.
- **Documentation Update**: Created consolidated Master Project Tracker & Documentation (`PROJECT_TRACKER.md`).
