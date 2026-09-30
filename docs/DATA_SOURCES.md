# Data Sources — Rishi Terminal

**Status:** 2026-09-30 (Remediation T19). This is the authoritative description of
where every number shown in the product comes from, how often it refreshes, and
what is known to be stale or risky. `AUDIT_FINDINGS_COMPREHENSIVE.md` is
superseded; this document and `scripts/validateStocks.ts` are the sources of
truth on data quality.

---

## 1. The freshness contract

- Every fundamentals value served to the UI flows through
  `lib/scoring/index.ts → resolveStockMetrics(symbol)`, which merges the static
  seed record with any live-fetched fundamentals. **Each field carries a
  `source` and an `asOf`** (`'seed'` / `'live'` / `'missing'`, plus ISO date).
- The seed dataset header exports `SEED_AS_OF` (`data/stocks/index.ts`,
  currently `2026-09-30`). All seed-sourced values are labelled
  `as of SEED_AS_OF (seed)`.
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
| 1 | **Seed dataset** (in-repo) | Fundamentals for ~940 NSE symbols: PE, ROE, OPM, ROCE, growth, mktcap, etc. Static snapshot values, many deliberately round placeholders (e.g. RELIANCE 2500, TCS 3600). | `data/stocks/index.ts` (`SEED_AS_OF = 2026-09-30`) | none | Static; changes only in code. **Known staleness: entire seed is a point-in-time snapshot; prices are placeholders, never displayed as live.** |
| 2 | **NSE India (unofficial JSON API)** | Live equity quotes, indices (`/api/allIndices`), MCX commodity quotes. | `lib/livePrice.ts`, `lib/nse*.ts` | none (browser-like headers) | On request, short in-memory cache per server instance. Unofficial; can rate-limit or break without notice. |
| 3 | **BSE India API** | Scrip header data for symbols missing on NSE. | `api.bseindia.com getScripHeaderData` (server routes) | none | On request. Unofficial. |
| 4 | **Yahoo Finance (unofficial v7/v8 endpoints)** | Stock quote fallback (`query1/query2.finance.yahoo.com`), chart data, previous-close for 24h change, forex pair changes. | `lib/livePrice.ts`, `hooks/useLivePrices` via `/api/prices*` | none | On request; in-memory per-instance cache. Unofficial. |
| 5 | **Finnhub** | Quote fallback (server-side only). | `lib/finnhub.ts` (`import 'server-only'`, `FINNHUB_API_KEY`) | API key, **server-only** since T3 | On request. Free tier: 60 calls/min. Inert when key unset. |
| 6 | **Financial Modeling Prep** | Fundamentals enrichment. | `FMP_API_KEY` (server routes) | API key | On request. Inert when key unset. |
| 7 | **Screener.in (HTML scrape)** | Quarterly/annual fundamentals pages used by the ingest pipeline. | `lib/scrapers/screener.ts` | none (browser-like headers) | **Manual / on-ingest only** — see §3. Unofficial scrape; ToS and licensing risk flagged to founder (spec §Not-for-the-coder). |
| 8 | **CoinGecko** | Crypto prices (simple price + coin detail). | `lib/livePrice.ts` crypto section | none | On request, in-memory cache. |
| 9 | **ExchangeRate-API** (`open.er-api.com`) | Base USD cross rates for forex pairs. | `lib/livePrice.ts` forex section | none | Free tier updates ~daily; Yahoo supplies intraday 24h change. |
| 10 | **FRED** | Macro series CSV (economyPlus module: GDP, CPI, etc.). | `data/economyPlus/macroData*.ts` fetch layer | none | Cached; `asOf` recorded per macro record. |
| 11 | **News RSS** | Market/company/economy/crypto/sports headlines: Google News, Economic Times, Livemint, Investing.com, Times of India, Coindesk, Cointelegraph, ESPNcricinfo. | `app/api/news/route.ts` and related feeds | none | On request with cache; freshness limited to what each feed publishes. |
| 12 | **LLM chat provider** | Chat/consensus *generation* — never a market-data source. Primary: any OpenAI-compatible endpoint (`CHAT_API_BASE_URL` + `CHAT_API_KEY`, key via `Authorization: Bearer`, `CHAT_MODEL` selectable). Fallback: Google Gemini (`GEMINI_API_KEY`, key via `x-goog-api-key`) (T7). | `app/api/chat/route.ts` | API key | Per-request. |
| 13 | **Supabase (Postgres)** | Persistence: `users`, `transactions`, `rishi_snapshots` (nightly consensus history), `financial_quarters`, `financial_annual`, `ingestion_log`. RLS keyed on `auth.uid()`; service-role client is server-only (`lib/services/supabaseAdmin.ts`, `import 'server-only'`). | `lib/db/*`, `lib/services/*` | anon key (client) / service-role (server) | Written by cron/ingest and payment webhooks; read by scoring persistence. |
| 14 | **Razorpay** | Payment orders + webhook events; source of truth for tier grants (`transactions`, webhook HMAC verification, T6). | `app/api/payment/*` | Key ID/secret + webhook secret | Event-driven. |

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
  production until `CRON_SECRET` is set on the Vercel project (T8/T14 finding);
  founder action pending.** No row counts could be verified from the
  remediation environment (no production DB credentials) — this is reported as
  BLOCKED rather than guessed.

## 4. Known staleness & risk register

1. **Seed snapshot drift.** All seed fundamentals are from `SEED_AS_OF`
   (2026-09-30) or earlier and many values are round placeholders. The UI
   never presents them as live; rankings exclude `dataQuality: 'INCOMPLETE'`
   records (T11/T13).
2. **Nightly pipeline unverified in production.** Until the founder runs
   `pipelineStatus.ts` against production, the true fill state of
   `financial_quarters` is unknown. Score history may therefore be seed-based.
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
