# Smart Retail Assistant - Codebase Audit

## 1. Audit Metadata

- **Date:** 2026-08-14
- **Repository state:** No Git worktree or `.git` directory is available at the workspace root; branch and change history cannot be verified.
- **Auditor:** Codex
- **Scope:** Static review of the root, client, and server source/configuration/tests; controlled execution of the existing server test suite; no live retailer or AI-service requests.
- **Commands run:** `npm test` in `server` (after a sandbox-only worker-spawn failure), plus `npm audit --omit=dev --json` in root, client, and server.
- **Files inspected:** `PROJECT_TRACKER.md`; all root/client/server `package.json` and lockfiles; `server/.env`; server entrypoint, routes, controllers, middleware, model, database config, AI services, scraper services, and all six test files; client entrypoint, app, API service, Vite/Tailwind config, HTML, CSS, and components.

## 2. Executive Summary

SRA is a functional MVP-shaped Express/React application with a modular scraper/AI pipeline, Mongo-backed cache with an in-process fallback, and a polished client. The implementation is materially ahead of the tracker in one area: headless scraping, proxy rotation, and four additional store scrapers already exist. It is not, however, ready to claim Phase 1.5 completion or production/Phase 2 readiness.

The most serious issue is that SSRF validation checks only the initial DNS lookup; Axios and Playwright perform a later network connection and can follow redirects. That leaves DNS-rebinding and redirect-to-private-network paths open. Other high-priority issues include wildcard CORS by default, non-evidence-based MockAI reports, broken persistent `forceRefresh`, and a server processing budget that exceeds the client's timeout. The test suite currently has 35 tests, of which 33 pass and 2 fail.

Finding totals: **1 Critical, 5 High, 8 Medium, 4 Low**.

## 3. Current Architecture

- **Client:** React 18/Vite/Tailwind single-page application. `App.jsx` submits a URL to `/api/v1/analyze`, renders a loading state/result/error banner, and fetches history on mount and after analysis. Axios uses a 30-second timeout and same-origin relative API calls.
- **API:** Express 4 exposes `POST /api/v1/analyze`, `GET /api/v1/history`, and `GET /api/v1/health`. URL validation is route middleware; rate limiting applies only to analysis requests. A centralized error handler returns an error message and exposes a stack only under `NODE_ENV=development`.
- **Processing:** `AnalysisService` hashes a partly-normalized URL, checks MongoDB then a process-local `Map`, uses a per-process in-flight promise map, invokes a scraper factory, invokes Gemini or MockAI, and persists an `Analysis` document when Mongo is connected.
- **Scraping:** Amazon, Flipkart, generic, Walmart, Target, eBay, and Myntra scraper classes extend `BaseScraper`. Direct Axios requests use a 12-second timeout; failures fall back to Playwright. Walmart/Target/eBay/Myntra start headless. Proxy selection is environment-driven and process-local.
- **AI:** `AIFactory` chooses Gemini only when `GEMINI_API_KEY` is non-empty; Gemini requests JSON and parses it with Zod. Any Gemini/API/schema failure silently returns deterministic MockAI content.
- **Persistence:** Mongoose `Analysis` uses a unique `urlHash` and a 7-day TTL index on `createdAt`. With no usable Mongo connection, all cache/history is process-local and non-expiring.

## 4. Documentation vs Reality

| Tracker Claim | Actual Status | Evidence | Notes |
|---|---|---|---|
| Phase 1.5 is complete | **Not true** | SEC-01/SEC-02, REL-01/REL-02, test results | Important hardening controls remain incomplete or broken. |
| DNS lookup blocks private/reserved addresses and internal hosts | **Partial** | `middleware/validateUrl.js` | Basic names/ranges are blocked, but redirect, rebinding, IPv4-mapped IPv6, and several special-use ranges are not safely handled. |
| Synthetic reviews removed; insufficient data returns 422 | **Partial** | All scraper classes and `BaseScraper.throwInsufficientData()` | Scrapers reject fewer than three collected strings, but no quality/deduplication policy is applied consistently and MockAI fabricates conclusions. |
| Restricted CORS origin configuration | **False by default** | `server.js` defaults `corsOrigin` to `'*'` | Restriction only occurs when an operator supplies `CORS_ORIGIN`. |
| 10 requests / 15 minutes rate limit | **Implemented, limited scope** | `routes/analysisRoutes.js` | Applied to `POST /analyze` only; it is an in-process/IP limiter with no shared-store or global AI budget. |
| Seven-day TTL cache expiry | **Partial** | `models/Analysis.js`, `analysisService.js` | Mongo documents have a TTL index; in-memory fallback never expires and TTL deletion is asynchronous. |
| `forceRefresh` works | **False with MongoDB** | `analysisController.js`, `Analysis.create()` plus unique `urlHash` | Refresh skips read but attempts an insert with the same unique hash; failure falls back to memory while stale Mongo data remains. |
| Mongo offline requests bypass Mongoose immediately | **Mostly implemented** | `config/db.js`, `getIsMongoConnected()` guards | Initial connection startup can still wait up to 5 seconds; process-local fallback has no durability/TTL. |
| Gemini JSON is validated by Zod | **Implemented, incomplete assurance** | `geminiAI.js`, `reportSchema.js` | JSON shape is checked, but field lengths, evidence/citation linkage, and verdict support are not checked. |
| Duplicate in-flight requests are deduplicated | **Implemented per process** | `inFlightRequests` map | It does not coordinate across instances and keys even force-refresh requests with non-refresh ones. |
| Client/server timeouts aligned | **False** | client Axios 30s; scraper retries/headless operations | One analysis can exceed 30 seconds by a large margin; client abort does not cancel server work. |
| 11 passing automated tests | **False** | Controlled run: 35 tests, 33 pass, 2 fail | The default sandbox run cannot spawn Vitest forks (`EPERM`); outside it, proxy tests fail. |
| Phase 2 headless/store support is planned only | **False** | Scraper factory, Playwright, proxy manager, Walmart/Target/eBay/Myntra modules | Code exists but it has fixture-only verification and is not production-ready. |

## 5. Security Findings

| ID | Severity | Component | Finding | Evidence | Recommended Fix |
|---|---|---|---|---|---|
| SEC-01 | Critical | URL validation / scrapers | SSRF can bypass initial validation through DNS rebinding or an external URL that redirects to an internal address. | Validation resolves once with `dns.lookup`; Axios/Playwright independently connect later, and Axios follows redirects by default. | Use an outbound HTTP client/agent that resolves and validates every destination/redirect immediately before connect; disable redirects unless each hop is revalidated; apply equivalent controls to Playwright. |
| SEC-02 | High | URL validation | Address blocking is incomplete: IPv4-mapped IPv6 and several non-public/special-use ranges are treated as public; hostname suffix rules are narrow. | `isPrivateIp()` uses prefixes such as `fe80:`, `fc00:`, and basic RFC1918 checks only. | Parse IPs with a maintained CIDR-aware library/policy that rejects all non-globally-routable IPv4/IPv6 addresses after normalization. |
| SEC-03 | High | CORS | The default policy permits every origin. | `server.js` uses `'*'` when `CORS_ORIGIN` is unset. | Fail closed outside explicit local development; use an allowlist and tests for allowed/denied origins. |
| SEC-04 | Medium | Scraper resource controls | Remote responses and rendered pages lack response-size, content-type, and total-work limits. | Axios config has timeout but no `maxContentLength`; Playwright returns full `page.content()` after `networkidle`. | Enforce byte/content-type limits, navigation/request interception, a per-job deadline, and bounded concurrency. |
| SEC-05 | Medium | AI input | Untrusted reviews are placed verbatim in the Gemini prompt without boundaries, input limits, or adversarial-content handling. | `geminiAI.js` interpolates all review strings into `Customer Reviews`. | Delimit/label reviews as untrusted data, cap/count/truncate input, request evidence-linked claims, and reject instruction-like/output-unsupported reports. |
| SEC-06 | Medium | API abuse / cost | Rate limit is per process and applies only to analyze; no authenticated quotas, shared limiter, request cancellation, or Gemini spend cap exists. | `express-rate-limit` uses default in-memory store; `GET /history` is unlimited. | Use a shared limiter, bounded queues/concurrency, per-tenant quotas, and provider usage/error monitoring. |
| SEC-07 | Low | Error handling | Operational error messages from scraper/provider/database paths are returned to clients. | `errorHandler.js` returns `err.message`; scraper errors describe anti-bot/layout outcomes. | Map internal failures to stable public messages and log detailed, redacted context server-side. |
| SEC-08 | Low | Configuration hygiene | A real `.env` file is present, but no `.env.example` or repository ignore policy can be verified. | `server/.env` contains local DB configuration and a blank API-key field; no Git metadata is present. | Add a redacted `.env.example`, ignore local secrets, and use deployment secret management. |

## 6. Scraper Findings

| ID | Severity | Component | Finding | Recommended Action |
|---|---|---|---|---|
| SCR-01 | High | BaseScraper / headless scraper | Retry plus Axios-to-Playwright fallback can run far beyond the client timeout, and `networkidle` is fragile for retailer pages. | Add a single cancellation-aware job deadline and bounded retry/backoff policy. |
| SCR-02 | Medium | All platform scrapers | Selectors are narrow and tested only against hand-authored static HTML; no live-contract or saved-real-fixture coverage exists. | Establish versioned sanitized fixtures/contract checks and selector observability. |
| SCR-03 | Medium | Review extraction | Review count is the number of extracted strings, not the retailer's count; Amazon/Flipkart do not deduplicate, and generic deduplication is exact-string only. | Normalize reviews, deduplicate consistently, retain source metadata, and distinguish sample size from retailer review count. |
| SCR-04 | Medium | Platform detection | Regex matching checks any URL substring, so lookalike domains can select a retailer-specific scraper. | Match parsed hostname against explicit registrable-domain allowlists. |
| SCR-05 | Low | Browser/proxy lifecycle | Proxy credentials are retained in memory and invalid proxy parsing/configuration is only partly tested; BrowserPool has no global concurrency cap. | Validate proxy sources, redact logs, establish browser/context limits, and test concurrent acquisition/failure paths. |

Amazon and Flipkart have direct-first selectors; generic pages rely on JSON-LD/heuristics. Walmart, Target, eBay, and Myntra use headless-first selectors and have mock-fixture tests. The class/factory structure can support additional stores, but reliable Phase 2 support requires an extraction contract, request isolation, observability, and realistic test fixtures before adding further platforms.

## 7. AI/Gemini Findings

| ID | Severity | Component | Finding | Recommended Action |
|---|---|---|---|---|
| AI-01 | High | MockAI fallback | Missing/failing Gemini silently produces generic, positive-looking analysis unrelated to reviews; it can issue BUY or caution verdicts. | Return an explicit provider-unavailable/non-analysis state, or visibly label non-production mock output and prevent it from being stored as real analysis. |
| AI-02 | Medium | Gemini integration | Any provider failure, malformed JSON, or schema mismatch falls back rather than surfacing a reliable failure; no retry/timeout policy is set at the integration layer. | Add bounded provider timeout/retry policy and typed failure states. |
| AI-03 | Medium | Report schema | Zod validates a loose shape but does not require nonempty arrays, bounded fields, evidence references, or a verdict justified by review data. | Define a strict bounded schema with evidence snippets/counts and verdict rules. |
| AI-04 | Medium | Cost/reliability | Every accepted review is sent with no cap/token accounting; no model/response telemetry or provider rate-limit behavior is present. | Cap input, sample deterministically, track tokens/costs, and monitor provider error/rate-limit outcomes. |

The API key stays server-side and the current `.env` key is blank. The architecture is therefore acceptable for local prototyping, but not production-ready: unsupported verdict risk, silent fabricated fallback, prompt injection exposure, and missing operational controls remain.

## 8. Backend Findings

- **REL-01 — High:** `forceRefresh` is ineffective against persistent cache because `urlHash` is unique and a refresh uses `Analysis.create()` rather than replace/upsert/versioned storage.
- **REL-02 — High:** The 30-second client timeout is not aligned to three direct retries plus headless fallback/navigation. The abort is not propagated to scraper/browser/Gemini work.
- **BE-01 — Medium:** `GET /history?limit=` accepts unbounded user input; a negative/large limit can cause unnecessary database/memory work.
- **BE-02 — Medium:** In-memory history returns `Map` insertion order rather than actual newest-first and is lost on restart; it is not semantically equivalent to Mongo history.
- **BE-03 — Low:** There is no structured logging, request/job ID, metrics, or trace linking a request to scrape, AI, cache, and error outcomes.

The route/controller separation and per-process in-flight deduplication are appropriate foundations, but operating more than one server instance would bypass both deduplication and the current limiter.

## 9. Frontend Findings

- The client uses browser-level `type="url"` validation only; the backend remains the correct enforcement point. It cannot explain unsupported stores or distinguish a timeout from a still-running server job.
- **UX-01 — Medium:** A 30-second Axios timeout clears loading and displays an error while the backend can still finish, persist, and consume AI/browser resources.
- **UX-02 — Medium:** History is fetched once and after submission; errors are silently reduced to an empty list. History entries are partial projections, but selection sets them as full `analysisData`, creating a malformed/stale dashboard risk.
- **UX-03 — Low:** Product image URLs are untrusted remote content loaded by the visitor's browser; there is no image fallback. The original-store link is safely marked `rel="noopener noreferrer"`.
- No frontend tests, runtime response schema validation, or explicit accessible status/live-region behavior were found. Rendering uses React text nodes and no dangerous HTML API was found.

## 10. Database Findings

- The document schema applies useful enums and a unique URL hash. A 7-day Mongo TTL index is declared, but Mongo TTL cleanup is periodic rather than immediate.
- `urlHash` canonicalization removes only a few query parameters; equivalent URLs can cache separately, while the unique index prevents recording refresh history.
- **DB-01 — Medium:** Process-local cache has no TTL, maximum size, persistence, or eviction. It can grow indefinitely under distinct URLs and differs from Mongo cache behavior.
- Mongo connection is intentionally optional and guarded after initial startup. That supports local development, but it is not a reliable production persistence mode.

For the MVP, one collection is sufficient. Future growth needs explicit cache/document lifecycle, cache replacement semantics, store/product identity strategy, index review, and a shared cache/queue.

## 11. Testing Findings

- Controlled server test run: **6 files, 35 tests; 33 passed and 2 failed**. Failed assertions are both in `tests/proxyManager.test.js`:
  - `parseProxyUrl()` retains credentials in `url`, while the test expects a redacted URL.
  - Playwright proxy server construction appends `:${parsed.port}` to a host that already includes a port, yielding `http://proxy3:8888:8888`.
- The default sandbox run could not start Vitest fork workers (`spawn EPERM`). This was an environment limitation, not proof of code correctness; the controlled rerun established actual failures.
- Existing tests cover basic health/input handling, selected private IP checks, JSON-LD parsing, factory routing, static scraper fixture success, generic insufficient data, and proxy helper behavior.
- Missing: redirect/rebinding/special-IP SSRF, CORS/rate-limit behavior, cache/TTL/force-refresh/in-flight cases, database offline/reconnect, Gemini/fallback/schema failures, retry/deadline/cancellation, real scraper fixtures, frontend behavior, accessibility, response shape, and end-to-end failures.

Highest-value next tests are SSRF redirect/rebinding prevention, persistent force-refresh semantics, timeout/cancellation budget, MockAI/provider-failure behavior, and proxy URL construction.

## 12. Dependency Findings

- `npm audit --omit=dev --json` reported **0 known production vulnerabilities** in root, client, and server at audit time. This is a point-in-time advisory result, not a production-readiness guarantee.
- **DEP-01 — Medium:** Server declares `@google/genai: "latest"`; the lockfile presently resolves 2.15.0. Reinstalling can change behavior without a source change.
- Most dependencies use broad `^` ranges. Lockfiles improve current reproducibility, but no Node engine/version policy or CI lockfile enforcement is defined.
- Root, client, and server each declare `smart-retail-assistant: file:..`; local package linkage is unnecessary for the shown runtime architecture and yielded broken traversal paths under nested `node_modules` during inspection.
- Playwright is already installed, contrary to its tracker “planned” status; browser binary provisioning/version compatibility is not documented.

## 13. Performance Findings

- One analysis can execute multiple 12-second HTTP attempts, Playwright fallbacks with 30-second navigation/10-second selector waits, then AI work. No end-to-end budget or concurrency queue bounds total cost.
- Full HTML and all extracted reviews are loaded into memory; no response/input size limits exist.
- The in-memory cache is unbounded. Database history limit is unbounded from public input.
- Per-process maps are fast for a single server but cannot control work across replicas.

## 14. Reliability Findings

- Cache refresh conflicts with the unique database key (REL-01).
- Client and server timeout behavior conflicts (REL-02).
- AI and DB outages are masked by fallback behavior, making results appear successful while quality/persistence changes materially.
- Two unit tests fail. Scraper success has not been verified against real platform responses, and page markup/anti-bot behavior will change.
- Mojibake is visible in source/displayed strings (for example currency/footer text), confirming the tracker’s open encoding concern.

## 15. Technical Debt

- Tracker is materially stale: it labels implemented Phase 2 modules as planned and claims success for controls that remain partial/broken.
- Repeated scraping patterns and error construction across platform classes lack a formal normalized extraction contract.
- No runtime schemas share the API boundary with the client.
- Operational configuration is undocumented: no `.env.example`, deployment guidance, Node version policy, monitoring, or test/CI configuration.
- Committed `client/dist` artifacts are present; without repository history/ignore rules, their freshness cannot be verified.

## 16. Phase 2 Readiness Assessment

**Ready:** scraper factory abstraction, platform registry, a base scraper, Playwright integration, basic proxy-pool helper, platform model enum, and static selector-fixture tests.

**Not ready:** safe outbound networking, end-to-end time/cost/concurrency controls, reliable selector/test contracts, correct proxy configuration, real cache refresh semantics, production-quality AI behavior, shared multi-instance coordination, and observability.

**Fix before Phase 2:** resolve SEC-01, SEC-03, REL-01, REL-02, AI-01, the failing proxy tests, and add the high-value tests listed above.

**Can wait:** additional store integrations, rich analytics, authentication, public API packaging, and proxy rotation sophistication.

**Architectural risk:** Adding stores/browsers/proxies now multiplies SSRF exposure, provider/browser cost, selector maintenance, and false-confidence verdicts without a bounded extraction/job contract.

## 17. Recommended Priority Order

| Priority | Work |
|---|---|
| P0 | Replace initial-only SSRF validation with connection/redirect-safe outbound request controls for Axios and Playwright, with exhaustive IP/redirect/rebinding tests. |
| P1 | Make analysis jobs bounded/cancellable; align client/server timeouts; add concurrency and response/input limits. |
| P1 | Correct persistent `forceRefresh`/cache lifecycle and add database/cache integration tests. |
| P1 | Remove silent fabricated MockAI production results; make AI failure/data sufficiency explicit and evidence-based. |
| P1 | Fail closed on CORS configuration and establish shared rate/cost controls. |
| P2 | Fix proxy parsing/Playwright server construction and make all 35 tests pass; add CI/Node-version policy. |
| P2 | Add real sanitized scraper fixtures, normalized review quality rules, selector observability, and a platform allowlist. |
| P3 | Add client response validation, history-state handling, accessibility states, and image fallback. |
| P4 | Add further retailer support, analytics, extension, and public API work. |

## 18. Recommended Next Task

**Implement a safe outbound-fetch boundary for all scraper traffic (Axios and Playwright), then cover it with redirect, DNS-rebinding, IPv4/IPv6, and private-range tests.**

This is first because the current URL check creates a false sense of protection while the application fetches user-controlled URLs from the server. New headless stores and proxy support would increase the blast radius. The task should also make the security policy reusable by every current and future scraper.

## 19. Questions / Unknowns

- No Git metadata exists in this workspace, so branch, commit, tracked/ignored secrets, ownership, and whether `client/dist` is intentionally committed cannot be confirmed.
- No live retailer, MongoDB, Gemini, proxy, or deployed CORS environment was contacted by design. Current selector validity, provider configuration, and deployment network topology remain unverified.
- The audit cannot confirm whether the blank local `GEMINI_API_KEY` is representative of deployment; it only confirms the code path selected when the key is absent.
