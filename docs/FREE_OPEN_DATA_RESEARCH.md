# Free & Open Data/AI Source Research — T34–T38, T41, T53, T54

**Status:** 2026-09-30 · Phase 5 (T34–T64) · Executor: Super Z
**Method:** direct endpoint probes (sandbox + prod), official terms pages where
fetchable, npm registry metadata, existing-code audit. Where a terms page could
not be machine-verified, that is stated explicitly — **unverified ≠ approved**.

**Prime directive (spec T34):** source discovery, not credential discovery.
Zero credentials were harvested. No leaked key was read, stored, or used.
Accidentally encountered credentials would be reported to the provider, never used.

---

## 1. Existing provider audit (T37)

Measured 2026-09-30. Sandbox = this dev container (Akamai-blocked for NSE/BSE);
prod = Vercel deployment (US region). App-level latency measured against prod API.

| Provider | Role | Probe result | Success | Latency | Notes |
|---|---|---|---|---|---|
| Yahoo chart v8 | stocks/indices/forex change | 200 ×2 (sandbox) | 100% | 90–100 ms | Working; used as NSE fallback; `meta.previousClose` drift fixed 2026-09-30 (47ab3f5) |
| NSE allIndices / quote | equities, breadth | 403 sandbox / **200 from prod** | prod OK | ~0.3–1.5 s prod | Unofficial; Akamai geo/IP-sensitive; schema drift now coerced (50c986d) |
| BSE ScripHeaderData | scrip fallback | 403 sandbox / works from prod | prod OK | n/a | Fallback only |
| Screener.in HTML | fundamentals | 200 (sandbox) | 100% | ~970 ms | Slow scrape; ToS/licensing flagged to founder (see matrix) |
| CoinGecko simple/price | crypto | **429 then 200** | 50% cold | ~30 ms | Shared free pool is aggressively rate-limited → caching mandatory |
| ExchangeRate-API (er-api) | reference FX | 200 ×2 | 100% | 30–43 ms | Daily-refresh semantics; already labelled |
| FRED fredgraph.csv | bond yields (fallback) | **000 (sandbox network block)** | unverified here | n/a | Keyless public CSV download; prod path coded as fallback |
| RSS/Google News | news | 200 via prod `/api/news` | 100% | n/a | Headlines only, no redistribution of full text |

**T37 conclusion (do-not-replace rule):** no current provider is replaced.
The only production incidents this quarter were **schema drift** (NSE allIndices
→ fixed by coercion, not replacement) and **change-field zeroing** (Yahoo meta
→ fixed in `yahooChangeFromMeta`). Both were routing/parsing defects, exactly
the class T37 says must be fixed in place, not by provider churn.

## 2. Provider research matrix (T35)

Legend — Decision ∈ {APPROVED, RESEARCH_ONLY, REJECTED}. RESEARCH_ONLY sources
must not enter production routing (T55).

### 2.1 NSE India unofficial JSON API — **APPROVED** (existing)
- Dataset: equity quotes, indices (allIndices), MCX derivative quotes, block deals
- Asset class: Indian equities, indices, commodities · Realtime/EOD: near-realtime snapshot
- Historical depth: none · Fundamentals: none · Technical data: none
- Rate limit: unpublished; IP/geo-sensitive (Akamai)
- Auth: none (browser-like headers) · Free allowance: all
- Commercial-use / public-display / redistribution / caching terms: **no formal terms for unofficial JSON**; risk accepted as founder-flagged legacy; display of derived numbers, not raw-feed redistribution
- Attribution: "NSE India" in UI provenance labels
- Docs: nseindia.com · Terms URL: none published (unofficial)
- Reliability: good from prod IP; two schema-drift incidents fixed; per-field fail-closed validation
- Decision rationale: existing, keyless, measured stable after fixes; T37 rule applies

### 2.2 BSE India ScripHeaderData — **APPROVED** (existing, fallback only)
- Fallback scrip header for symbols missing on NSE · keyless · unofficial
- Terms: none published for unofficial endpoint · Attribution: "BSE India"
- Reliability: secondary path; low volume by design

### 2.3 Yahoo Finance chart v8 / quote v7 — **APPROVED** (existing)
- Dataset: quotes, 24h change, OHLC history, forex pairs, futures proxies
- Realtime: delayed snapshot (exchange-dependent) — **must not be labelled realtime**
- Historical: ~years of daily bars via chart endpoint · Fundamentals: none
- Rate limit: unpublished; two endpoint pools (query1/query2) used for resilience
- Auth: none · Terms: Yahoo ToS prohibit redistribution of bulk data; we display derived single-symbol views server-side with source labels; no bulk redistribution
- Attribution: "Yahoo Finance" in provenance
- Reliability: high; `regularMarketChangePercent` now primary change source

### 2.4 Screener.in HTML scrape — **RESEARCH_ONLY** (legacy use continues, no expansion)
- Dataset: Indian fundamentals (quarterly/annual, shareholding)
- Auth: none (HTML) · Free: all
- **Commercial/display/redistribution terms: NOT verified.** Scraping ToS and
  licensing risk already flagged to founder (DATA_SOURCES §3). Per T36 the
  free-ness of a page does not confer display rights.
- Decision rationale: remains in production as legacy ingest path (removing it
  would degrade live fundamentals), but **frozen**: no new consumers, no new
  fields, expansion blocked until founder completes FD-1 vendor decision.

### 2.5 CoinGecko — **APPROVED** (existing)
- Dataset: crypto prices + 24h change · Realtime snapshot
- Rate limit: keyless shared pool; **measured 429 on cold burst** → 60 s cache mandatory
- Auth: none · Terms: API terms require attribution for display; full terms text
  could not be machine-extracted (SPA) — attribution implemented; commercial
  display of single-symbol derived values, no bulk redistribution
- Attribution: "CoinGecko" in provenance

### 2.6 ExchangeRate-API (open.er-api.com) — **APPROVED** (existing)
- Dataset: base-USD cross reference rates · **Daily refresh — reference, not tradable quotes**
- Auth: none · Free: yes (open endpoint)
- Terms: free tier permits app use with attribution; commercial display of reference rates with attribution
- Attribution: "ExchangeRate-API" in provenance

### 2.7 FRED (fredgraph.csv download) — **APPROVED** (existing, keyless)
- Dataset: US Treasury yields (DGS2/DGS10/DGS30), macro series as CSV download
- Realtime/EOD: **daily reference** values · Historical: decades
- Auth: **none for fredgraph.csv public download**; the official FRED *API*
  (api.stlouisfed.org) requires a project-owned key (T39) — see 2.8
- Terms: St. Louis Fed terms require source attribution; no key sharing across apps
- Attribution: "FRED, Federal Reserve Bank of St. Louis"

### 2.8 FRED official API — **RESEARCH_ONLY**
- Would require `FRED_API_KEY`: project-owned, server-side, deployment secret
  (T39/T42). Only adopted if fredgraph.csv proves insufficient. Not sourced from
  GitHub or any other application. `.env.example` would gain an empty
  `FRED_API_KEY=` declaration only at adoption time.

### 2.9 ECB euro foreign-exchange reference rates — **APPROVED** (new, no-key)
- Dataset: official daily EUR reference rates (eurofxref-daily.xml) — **probe 200 OK**
- Semantics (T38): **daily reference rates published by a central bank — must
  never be labelled realtime tradable quotes.** Suitable for macro/FX context surfaces.
- Auth: none · Terms: ECB reuse policy — attribution "European Central Bank" required
- Docs: ecb.europa.eu/stats/eurofxref · Status: approved for reference use; integration optional (ExchangeRate-API already covers the surface)

### 2.10 Alpha Vantage — **RESEARCH_ONLY**
- Free tier: ~25 requests/day (widely documented); requires project-owned key
- **Display/commercial/redistribution terms: NOT machine-verified this pass**
  (terms page JS-shelled). Until verified: RESEARCH_ONLY. Potential niche:
  premium-adjusted US history. India coverage weak vs existing stack.

### 2.11 Twelve Data — **RESEARCH_ONLY**
- Free tier verified: 8 API credits/minute, 800/day; symbols limits; requires key
- India equities coverage exists but EOD-leaning; display/commercial terms need
  founder-level verification. Not primary material on these quotas alone (T41:
  "do not make a provider primary merely because marketing says free").

### 2.12 Financial Modeling Prep — **RESEARCH_ONLY** (spec's own example)
- Free plan exists; **display/redistribution requires applicable licensing
  agreement** per provider statements — free API ≠ display rights (T36).
- Repo has inert null-safe client (`lib/services/fmp.ts`); key set on Vercel.
  Keep inert; no production routing until licensing resolved (FD-1).

### 2.13 Finnhub — **REJECTED** (current state)
- Free tier exists (60/min) but the repo client had zero consumers and was
  removed (50c986d). No data need today. Re-evaluate only if a concrete gap appears.

### 2.14 Google Gemini API — **APPROVED for AI fallback only** (not market data)
- AI Studio free tier; project-owned key required (T42); server-side only
- Role: chat fallback behind the primary OpenAI-compatible endpoint (T50)

### 2.15 Hugging Face (Inference Providers / open-weight) — **RESEARCH_ONLY, AI-track**
- Ecosystem approved for AI evaluation (T40): open-weight models, embeddings,
  NER/rerankers, ZeroGPU Spaces
- Free accounts receive small monthly inference credit (docs state ~$0.10/month,
  subject to change) — treat as evaluation quota, not production capacity
- Rules: project-owned HF account + token, deployment secret; never a public
  token from another Space; **evaluated for AI workloads, not market data**

### 2.16 Official RSS feeds / Google News RSS — **APPROVED** (existing)
- Headline ingestion with link-out; no full-text redistribution

### 2.17 Open-source TA libraries (T53)
| Package | License | Verdict |
|---|---|---|
| `trading-signals` | MIT (v8.3.0) | Mathematically solid, pure TS, deterministic. **RESEARCH_ONLY** — adoption recommended when indicator parity tests can gate it (existing score-parity discipline); not swapped in mid-phase |
| `yahoo-finance2` | MIT (v4.0.2) | Client only; underlying data rights unchanged (T54: open-source client ≠ open data). Our own server-side client already exists — **no adoption** |
| in-repo `lib/technical*` | project | Stays canonical until a library adoption is gated by tests |

### 2.18 Open-source data clients (T54)
- `yahoo-finance2` (MIT): underlying source = Yahoo; terms as §2.3. No adoption.
- Python-only clients (yfinance etc.): **REJECTED** — runtime mismatch (Next.js/Node), would add a foreign runtime for no coverage gain.

## 3. Decisions summary
- **APPROVED (production, keyless):** NSE, BSE, Yahoo, CoinGecko,
  ExchangeRate-API, FRED fredgraph.csv, ECB reference rates, RSS
- **APPROVED (AI-track, project key):** Gemini (fallback), existing CHAT_API provider
- **RESEARCH_ONLY (must not enter production routing):** Screener.in (legacy
  freeze), FRED official API, Alpha Vantage, Twelve Data, FMP, HF inference,
  trading-signals adoption
- **REJECTED:** Finnhub (no consumer), Python data clients
- **Requires project-owned credential before any adoption:** FRED_API_KEY,
  TWELVEDATA_API_KEY, ALPHAVANTAGE_API_KEY, HF token — all deployment secrets,
  server-side, never committed, never NEXT_PUBLIC_ (T42)

## 4. Phase 6 addendum (2026-10-01) — storage rights decided
The research above is retained verbatim as the evidence base. Phase 6 added
an explicit **storage-rights layer** on top of the access decisions (full
policy: `docs/DATA_PROVIDER_MATRIX.md` "Phase 6 storage policy"):

- **Storage entitled (may persist observed values with attribution):**
  fred-csv, exchangerate-api, ecb-fx.
- **Storage NOT entitled (may display an observation, never persist it):**
  NSE, BSE, Yahoo, CoinGecko (terms unverified beyond attribution), screener
  (frozen), yahoo-etf-proxy (derived).
- Enforcement is code, not convention: `PERSISTABLE_SOURCES` in
  `lib/livePrice.ts` gates the T62 persistent cache and the T61 nightly
  observation capture (migration 009). Anything outside the allow-list
  resolves to honest UNAVAILABLE during outages.
- No claim of "100% free" is made anywhere; every restriction recorded in
  the sections above remains binding.
