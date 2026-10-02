# Data Sources — Rishi Terminal

**Status:** 2026-10-01 (Phase 1, D1-02: NSE official listing added as source #15 — the security master). This is the authoritative description of
where every number shown in the product comes from, how often it refreshes, and
what is known to be stale or risky. `AUDIT_FINDINGS_COMPREHENSIVE.md` is
superseded; this document and `scripts/validateStocks.ts` are the sources of
truth on data quality.

---

## 1. The freshness contract

- Every fundamentals value served to the UI flows through
  `lib/scoring/index.ts → resolveStockMetrics(symbol)`, which merges the static
  seed record with any live-fetched fundamentals. **Each field carries a
  `source` and an `asOf`** (`'seed'` / `'live'` / `'derived'`).
- **Seed data claims no date (R1).** The seed dataset header exports
  `SEED_STATUS = 'placeholder'` and `SEED_CAPTURED_AT = null`
  (`data/stocks/index.ts`). No capture date is provable from git history or
  any source (values pre-date the repo and many are deliberately round), so
  seed-sourced fields carry `source: 'seed', asOf: null` — never a date.
- **UI rule (R1): wherever seed-derived numbers, scores or rankings are
  shown, the UI renders the non-dismissable label**
  **“Illustrative sample data — not current, not investment advice.”**
  (`components/shared/SeedDataBanner.tsx`). No “as of <date>” text may appear
  anywhere for seed data; `scripts/validateStocks.ts` and
  `test/freshness.placeholder.test.ts` enforce this.
- **UI rule (enforced in T14): a seed `price` is never rendered as a live
  price.** When no live quote is available the UI shows `—` with a
  "price unavailable" tooltip (`lib/freshness.ts` helpers). Live prices show
  `updated HH:MM IST`.
- Nothing in this repo fabricates numbers: the fabricated backtester/options
  chain generators were deleted in T1/T2; every scorer returns `null` (not a
  guess) when inputs are degenerate (T11).

## 2. Source inventory

| # | Source | What it provides | Module | Auth | Cadence / cache |
|---|--------|------------------|--------|------|-----------------|
| 1 | **Seed dataset** (in-repo) | Fundamentals for ~940 NSE symbols: PE, ROE, OPM, ROCE, growth, mktcap, etc. Static placeholder values, many deliberately round (e.g. RELIANCE 2500, TCS 3600). **Status: `placeholder` — illustrative sample data, not current.** | `data/stocks/index.ts` (`SEED_STATUS = 'placeholder'`, `SEED_CAPTURED_AT = null`) | none | Static; changes only in code. Prices are placeholders, never displayed as live; every surface showing seed-derived output carries the illustrative-data label. |
| 2 | **NSE India (unofficial JSON API)** | Live equity quotes, indices (`/api/allIndices`), MCX commodity quotes. | `lib/livePrice.ts`, `lib/nse*.ts`, `app/api/pulse/breadth` | none (browser-like headers) | On request, short in-memory cache per server instance. Unofficial; can rate-limit or break without notice. **2026-09-30 schema drift:** allIndices numerics now arrive as strings — `nseNumeric` coercion in `lib/validation/schemas.ts` (tested in `test/nse-schema.test.ts`) accepts number/numeric-string/null, per-field fail-closed. |
| 3 | **BSE India API** | Scrip header data for symbols missing on NSE. | `api.bseindia.com getScripHeaderData` (server routes) | none | On request. Unofficial. |
| 4 | **Yahoo Finance (unofficial v7/v8 endpoints)** | Stock quote fallback (`query1/query2.finance.yahoo.com`), chart data, previous-close for 24h change, forex pair changes. | `lib/livePrice.ts`, `hooks/useLivePrices` via `/api/prices*` | none | On request; in-memory per-instance cache. Unofficial. |
| 5 | **Gemini API** (chat fallback) | LLM chat fallback only — NOT market data. Primary chat provider is the OpenAI-compatible endpoint (`CHAT_API_BASE_URL` + `CHAT_API_KEY`). | `app/api/chat/route.ts` (`GEMINI_API_KEY`, `x-goog-api-key` header) | API key (Google AI Studio free tier) | Chat fallback; inert when key unset. Finnhub client removed 2026-09-30 — it had zero consumers (dead code) and no data path ever imported it. |
| 6 | **Financial Modeling Prep** | Fundamentals enrichment. | `FMP_API_KEY` (server routes) | API key | On request. Inert when key unset. |
| 7 | **Screener.in (HTML scrape)** | Quarterly/annual fundamentals pages used by the ingest pipeline. | `lib/scrapers/screener.ts` | none (browser-like headers) | **Manual / on-ingest only** — see §3. Unofficial scrape; ToS and licensing risk flagged to founder (spec §Not-for-the-coder). |
| 8 | **CoinGecko** | Crypto prices (simple price + coin detail). | `lib/livePrice.ts` crypto section | none | On request, in-memory cache. |
| 9 | **ExchangeRate-API** (`open.er-api.com`) | Base USD cross rates for forex pairs. | `lib/livePrice.ts` forex section | none | Free tier updates ~daily; Yahoo supplies intraday 24h change. |
| 10 | **FRED** | Macro series CSV (economyPlus module: GDP, CPI, etc.). | `data/economyPlus/macroData*.ts` fetch layer | none | Cached; `asOf` recorded per macro record. |
| 11 | **News RSS** | Market/company/economy/crypto/sports headlines: Google News, Economic Times, Livemint, Investing.com, Times of India, Coindesk, Cointelegraph, ESPNcricinfo. | `app/api/news/route.ts` and related feeds | none | On request with cache; freshness limited to what each feed publishes. |
| 12 | **LLM chat provider** | Chat/consensus *generation* — never a market-data source. Primary: any OpenAI-compatible endpoint (`CHAT_API_BASE_URL` + `CHAT_API_KEY`, key via `Authorization: Bearer`, `CHAT_MODEL` selectable). Fallback: Google Gemini (`GEMINI_API_KEY`, key via `x-goog-api-key`) (T7). | `app/api/chat/route.ts` | API key | Per-request. |
| 13 | **Supabase (Postgres)** | Persistence: `users`, `transactions`, `rishi_snapshots` (nightly consensus history), `financial_quarters`, `financial_annual`, `ingestion_log`, `securities`/`symbol_history`/`universe` (D1-02 security master). RLS keyed on `auth.uid()` where user-scoped; deny-all + service-role-only on ingestion tables (N2) and the security master (D1-02); service-role client is server-only (`lib/services/supabaseAdmin.ts`, `import 'server-only'`). | `lib/db/*`, `lib/services/*` | anon key (client) / service-role (server) | Written by cron/ingest and payment webhooks; read by scoring persistence. |
| 14 | **Razorpay** | RETIRED (2026-10-02, Commit M — every feature free): the purchase endpoints answer 410 and no code reads the keys. Historical `transactions` rows remain preserved in the database. | ~~`app/api/payment/*`~~ (410 responders) | none (no longer read) | n/a. |
| 15 | **NSE official listing (EQUITY_L)** | The security master (D1-02): symbol → ISIN, company name, listing date, series for every NSE-listed equity (2,593 rows, snapshot 2026-10-01). Reference data only — no prices, no fundamentals. | `data/security-master/` (CSV snapshot + generated `populate.sql`), `lib/db/securityMaster.ts` (resolution), DB tables `securities`/`symbol_history`/`universe` | none (public file) | Snapshot committed in-repo with SHA-256 in `data/security-master/SOURCES.md`; applied by the CI migrations job and to the live DB. Refresh = re-fetch + regenerate + review the diff. Current-listings only (no delisted names — those arrive with licensed corporate-actions data, D1-03). |

## 3. Refresh pipeline (what actually runs)

- **`/api/ingest/snapshot`** — recomputes consensus scores for the whole
  registry and persists them to `rishi_snapshots` (with
  `SCORE_ENGINE_VERSION`, T10). Scheduled in `vercel.json`:
  `30 13 * * 1-5` = **19:00 IST, Mon–Fri** (Vercel Cron sends
  `Authorization: Bearer $CRON_SECRET` automatically when the variable is set
  on the project; auth fails closed without it, T8).
- **`/api/ingest/financials`** — quarterly fundamentals ingest (from the
  Screener scrape / manual JSON) into `financial_quarters` / `financial_annual`.
  **Not cron-scheduled**; triggered manually.
- **Pipeline status is not assumed — it is measured.** Run
  `npx tsx scripts/pipelineStatus.ts` (requires production
  `SUPABASE_SERVICE_ROLE_KEY`) to print row counts and newest dates for
  `rishi_snapshots`, `financial_quarters`, `ingestion_log`.
  **Known status as of 2026-09-30: the cron existed in code but was inert in
  production until `CRON_SECRET` was set on the Vercel project (round 1
  finding; set 2026-09-30, verified with three-state auth test).** Live row
  counts are reported by `pipelineStatus.ts` — see §4.

## 4. Path to sourced data (R1)

The seed dataset stops being “illustrative” only when real fundamentals exist
and their provenance is recorded. The pipeline that produces them:

- **`ingestQuarterly` / `ingestAnnual`** (`app/api/ingest/financials/route.ts`)
  write per-symbol fundamentals into the `financial_quarters` and
  `financial_annual` tables (sourced from the Screener.in scrape or manual
  JSON payloads; each row records `source` and quarter-end dates).
- **`/api/ingest/snapshot`** (cron, Mon–Fri 19:00 IST) persists daily
  consensus scores into `rishi_snapshots`, and every run appends to
  `ingestion_log`.
- **Row counts are measured by `scripts/pipelineStatus.ts`** (service-role
  key against the production Supabase project). It prints the exact row
  count and newest timestamp for `rishi_snapshots`, `financial_quarters`,
  `financial_annual` and `ingestion_log`.

**Current measured state (2026-09-30, remediation round 2): the production
Supabase schema (migrations 001–008) is being applied during this round; all
sourced tables start at 0 rows until the first ingestion runs.** Until the
counts are non-zero and `SEED_STATUS` flips to `'sourced'`, every
seed-derived surface remains labelled as illustrative sample data.

## 5. Known staleness & risk register

1. **Seed data is illustrative, not sourced.** All seed fundamentals are
   placeholders with no provable capture date (`SEED_CAPTURED_AT = null`).
   The UI never presents them as live or current; every seed-derived surface
   carries the “Illustrative sample data” label (R1), and rankings exclude
   `dataQuality: 'INCOMPLETE'` records (T11/T13). Founder note (R1): until
   the ingest pipeline has populated real fundamentals for the stocks being
   ranked, rankings must not be presented as signals at all — the label is
   the minimum.
2. **Nightly pipeline state is measured, not assumed.** Run
   `npx tsx scripts/pipelineStatus.ts` against production to get live row
   counts; see §4 for the current measured state.
3. **Unofficial endpoints (NSE, BSE, Yahoo, Screener.in).** No contract, no
   SLA; may throttle, change shape, or object under their ToS. Responses at
   trust boundaries are parsed defensively (numeric coercion + finiteness
   guards in `lib/livePrice.ts`); a schema-validation library (zod) is
   planned but not yet wired — tracked as residual debt from T18. A licensed
   vendor decision is pending with the founder before monetisation (spec,
   founder decisions).
4. **Per-instance in-memory caches.** Quote caches and the per-IP chat burst
   limiter (`app/api/chat/route.ts`) live per serverless instance; two
   instances can briefly disagree. The per-user daily chat quota is
   Supabase-backed. No shared cache (Upstash) yet.
5. **Bonds yields are static** (`lib/livePrice.ts` header: "Bonds: Static
   yields") — a known limitation, labelled as such in the UI.
6. **Forex base rates refresh ~daily** (free ExchangeRate-API tier); intraday
   change comes from Yahoo and can disagree with the base-rate timestamp.
7. **News feeds are third-party RSS**; headlines may be delayed relative to
   wire services and links may rot.
8. **NESTLEIND ROE = 110** in the seed is real (buyback-shrunken equity), not
   a data bug; it is whitelisted explicitly in `scripts/validateStocks.ts`.
   Any other `|ROE| > 150` fails the registry validation gate.
