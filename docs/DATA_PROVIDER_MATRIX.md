# Data Provider Matrix — T64 Final Report (Phases 5 + 6)

**Date:** 2026-09-30 (Phase 5) · 2026-10-01 (Phase 6 addendum) · Companion detail: `docs/FREE_OPEN_DATA_RESEARCH.md`

## What was researched
Existing stack (T37): NSE, BSE, Yahoo, Screener.in, CoinGecko, ExchangeRate-API,
FRED (fredgraph.csv), RSS news. Candidates (T34/T41): ECB reference rates, Alpha
Vantage, Twelve Data, FMP, Finnhub, Gemini, Hugging Face, open-source TA libs
(`trading-signals`), open-source data clients (`yahoo-finance2`).

## Approved (production, keyless — no credentials exist to leak)
| Provider | Dataset | Semantics | Health note |
|---|---|---|---|
| NSE (unofficial JSON) | IN equity quotes/indices/breadth | near-realtime snapshot | 2 schema-drift fixes shipped (50c986d, 47ab3f5); coercion + validation |
| BSE | scrip header fallback; realtime index (SENSEX, INDEXSTRIP FD-32) | snapshot | index-quotes dataset class added with the founder's option (b) order (FD-32); fail-closed zod parse; production-egress byte validation recorded post-merge |
| Yahoo chart/quote | quotes, change, OHLC | delayed snapshot; never labelled realtime | `regularMarketChangePercent` trusted first |
| CoinGecko | crypto price/24h change | realtime snapshot | 429-prone → 60 s cache mandatory |
| ExchangeRate-API | FX reference | **daily reference**, not tradable | 30–43 ms |
| FRED fredgraph.csv | Treasury yields/macro | **daily reference** | keyless public download |
| ECB eurofxref (new, optional) | EUR FX reference | **daily official reference** | probe 200; attribution "European Central Bank" |
| RSS / Google News | headlines | timestamped links | link-out only |

## Approved (AI-track, project-owned credentials only)
- Primary: existing OpenAI-compatible endpoint (`CHAT_API_*`, already set)
- Fallback: Gemini (`GEMINI_API_KEY` — still to be provided by founder)

## Rejected — and why
- **Finnhub**: zero consumers (client removed in 50c986d); no data gap today
- **Python data clients** (yfinance et al.): foreign runtime, no coverage gain
- **`yahoo-finance2` adoption**: MIT client but client ≠ data rights (T54); own client exists

## RESEARCH_ONLY — must NOT enter production routing
- **Screener.in scrape**: legacy fundamentals ingest frozen (no new
  consumers/fields); display licensing unresolved → founder decision FD-1.
  Phase 5.1: REMOVED from the production price router, and `attempt()`
  enforces APPROVED-only gating inside the routing primitive — a
  RESEARCH_ONLY provider cannot be reached through the routing layer even
  accidentally (regression-tested).
- **FMP**: free API ≠ display rights (T36 example). Phase 5.1 correction:
  the client is NOT "inert by neglect" — it is **registry-gated**: both
  `lib/services/ingestion.ts` and the FMP client primitive fail closed
  unless the registry status becomes APPROVED (requires a licensing
  agreement = rights evidence, never an env toggle). Production financial
  ingestion currently records skips, not FMP data.
- **Alpha Vantage** (25/day), **Twelve Data** (8 credits/min, 800/day): quotas
  marginal for terminal traffic; display/commercial terms unverified this pass
- **FRED official API**: adopt only if fredgraph.csv insufficient; then
  `FRED_API_KEY` = project-owned server secret (T39)
- **Hugging Face inference**: AI-track evaluation; free credit ~$0.10/month
  (docs, subject to change) = evaluation capacity, not production capacity
- **`trading-signals`** (MIT): recommended future TA engine, gated by indicator
  parity tests before swap

## Requires project-owned credentials (none requested yet)
`FRED_API_KEY`, `TWELVEDATA_API_KEY`, `ALPHAVANTAGE_API_KEY`, HF token —
when adopted: deployment secrets, server-side, never committed, never
`NEXT_PUBLIC_`, never in URLs or logs; `.env.example` gains empty declarations
only (T42).

## Licensing restrictions recorded
1. Screener.in scrape — display/redistribution rights unresolved (founder-flagged)
2. FMP free plan — display requires licensing agreement
3. Yahoo ToS — no bulk redistribution; derived single-symbol display with attribution
4. CoinGecko — attribution required for display
5. ECB/FRED — attribution required ("European Central Bank" / "FRED, St. Louis Fed")

## What remains unavailable (honest gaps)
- Realtime tradable IN equity ticks from a licensed vendor (FD-1 pending)
- Point-in-time fundamentals with storage rights (roadmap D1)
- Full commercial-display licence for any third-party fundamentals vendor

## Claim hygiene
No "100% free data" claim is made. Current production stack is keyless and
free-as-in-no-fee; usage **rights** are documented per provider above, with
two surfaces (Screener-derived fundamentals; bulk redistribution generally)
explicitly gated on founder/vendor decisions. Synthetic numbers remain
prohibited: unavailable data renders as unavailable (T57), and the seed
placeholder can no longer leak through the live-price API.

---

# Phase 6 addendum (T59–T64)

## T59 — Measure first (request-volume accounting)
`providerHealth` now keeps windowed per-provider volume counters
(total / UTC-day / current minute) beside the health stats, plus two
dedup counters exposed at `/api/admin/providers` (CRON_SECRET only):
`reuse.coalesceHits` (concurrent requests that shared one upstream call)
and `reuse.cacheHits` (sequential replays served from the 30 s snapshot
store). Live probes recorded in Phase 5 stand: Yahoo ~95 ms, er-api
30–43 ms, screener ~970 ms, CoinGecko 429-prone shared pool, FRED/NSE/BSE
sandbox-blocked but production-verified. Caveat recorded honestly: counters
are per-serverless-instance; platform-wide totals need Vercel analytics
(founder decision, out of code scope).

**Verdict unchanged: no provider replacement is warranted.** Both Phase 5
incidents were parsing defects (NSE schema drift, Yahoo meta drift), fixed
in place with regression tests — swapping sources would not have prevented
either.

## T60 — Snapshot reuse (one observation serves many widgets)
`fetchLivePrice` now consults a 30 s result-snapshot store (aligned with the
route's `s-maxage=30` CDN layer) BEFORE the provider chain: a hit replays
the stored point as **CACHED** with the ORIGINAL `observedAt` as
`lastUpdated` — the serve time is never presented as the observation time.
STATIC/DERIVED semantics survive the replay (a static reference replayed is
still STATIC, never relabelled). Coalescing (T46) covers concurrent callers;
the snapshot store covers sequential ones. Every replay is counted
(`cacheHits`), so the admin endpoint shows real upstream savings, not
estimates.

## T62 — Cache hierarchy + persistent layer (storage rights enforced)
Full chain now: **Provider → DB (`provider_cache`) → server (snapshot store
+ coalescing) → CDN (`s-maxage=30`) → client (display only — the client is
never a source of truth)**.

DB persistence is gated by an explicit allow-list (`PERSISTABLE_SOURCES` in
`lib/livePrice.ts`) — only providers whose terms permit storing observed
values:

| Source | Storage basis (evidence) | TTL | Served as |
|---|---|---|---|
| `fred-csv` | FRED data terms — attribution "FRED, Federal Reserve Bank of St. Louis" | 7 d (daily series) | CACHED + original observedAt |
| `exchangerate-api` | Free tier permits app use with attribution (research §2.6) | 24 h | CACHED + original observedAt |
| `ecb-fx` | ECB reuse policy — attribution "European Central Bank" (research §2.9) | 24 h | CACHED + original observedAt |

NSE, BSE, Yahoo, CoinGecko, screener, `yahoo-etf-proxy` are **never**
persisted (scraped / terms-unverified). The layer is used two ways: a
throttled write-through on successful observations (≤1 write/key/minute),
and a last-known fallback consulted ONLY after the entire live chain fails —
an outage on a non-entitled source still resolves to honest UNAVAILABLE.
The cache layer cannot take a quote path down: every operation swallows
errors and the read path is bounded at 1.5 s.

## T61 — Historical persistence (our own observations)
Migration `009_phase6_provider_cache.sql` adds `observed_prices`
(symbol + observed_date PK, source-attributed). A dedicated cron
(`/api/ingest/observations`, 13:45 UTC Mon–Fri, CRON_SECRET-gated) captures
the reference set (FRED yield curve + FX pairs = `REFERENCE_SYMBOLS`) — but
only rows whose winning source passes the storage-rights gate; everything
else is skipped, never fabricated. First production run (2026-10-01):
15 eligible → 5 persisted (US Treasury curve via fred-csv), 10 honestly
skipped (FX resolved via yahoo — no storage entitlement), 0 errors.
The capture deliberately does NOT share the consensus snapshot's cron:
stacking both jobs blew the 60 s maxDuration budget (observed live) — one
job, one budget. Equity closes from scraped sources are deliberately NOT
persisted; the existing consensus snapshot (`rishi_snapshots`) keeps its
prior scope pending founder licensing decisions (FD-1).

## Honest gaps (updated)
- Volume counters are per-instance; platform totals need founder-enabled
  Vercel analytics or a shared store.
- No persistable entitlement for crypto or IN-equity quotes: an outage on
  those surfaces shows UNAVAILABLE (by design, not a defect).
- Realtime tradable IN ticks, point-in-time fundamentals, and commercial
  display licensing remain gated on founder/vendor decisions (FD-1).
- CoinGecko/Alpha Vantage/Twelve Data commercial terms remain unverified
  (JS-shell terms pages) — RESEARCH_ONLY stands.

---

# Round 9 addendum — provenance-contract closure (2026-10-02)

Scope: Coder Directions 2026-10-02 (directives 14–27). Every change below is
code-verified with fail-first tests on its branch; this addendum records the
resulting provider semantics so no surface has to re-derive them.

## Observation-time contract (directive 20)
Every APPROVED provider that discloses an observation time now transports it
end-to-end as `observedAt` (the ORIGINAL upstream time — never the serve
time, never the browser fetch time), identically on `/api/prices` and
`/api/prices/batch`:

| Provider | Disclosure transported |
|---|---|
| NSE bulk (shared quote cache serving path) | `regularMarketTime` → observedAt (`lib/nse/bulkFetch.ts`) |
| NSE direct quote (fallback inside the chain) | none parsed — observedAt null (honest absence; the equity serving path is the shared cache above) |
| Yahoo v7/v8 chart | `regularMarketTime` → observedAt |
| CoinGecko | `last_updated_at` (now REQUESTED via `include_last_updated_at=true`; previously the single-route gap — crypto served `observedAt: null`) |
| ExchangeRate-API | `time_last_update_unix` → observedAt |
| FRED fredgraph.csv | DATE column → observedAt |
| Static references (yields, commodities) | honestly none — `observedAt: null` (there is no observation) |

## Change-semantics contract (directives 16, 17)
- **ExchangeRate-API**: a rate observation with NO 24h comparison →
  `change: null` (previously hardcoded `0`, which rendered as a real
  "0.00%" market move). The Yahoo FX path keeps its disclosed change.
- **Static reference yields** (US/India/corporate): `change: null` —
  identical semantics across all three static tables.
- **NSE breadth** (`/api/pulse/breadth`): an index without a disclosed
  `percentChange` is counted `unknown`, never classified "unchanged";
  the advance/decline ratio is null when declines = 0.
- **NSE block deals** (`/api/pulse/blocks`): missing qty/price/change/
  pchange are null (never 0); no BUY/SELL side is manufactured from a
  missing pchange; the response timestamp is the provider's disclosure
  or null.
- **UI**: a missing change renders "—" with no direction/color claim on
  every market surface (shared ownership: `lib/pricePresentation.ts` —
  `formatChangePair`, `aggregatePresentationState`, `aggregateMarketLabel`
  with DELAYED downgrade for Yahoo transports).

## Naming discipline (directive 25)
"LIVE" = an actual approved observation; "DELAYED" = delayed transport
(Yahoo); "CACHED" = replayed legitimate observation; "STATIC"/"REFERENCE" =
non-current reference data; "DERIVED" = computed from labelled inputs;
"UNAVAILABLE" = no usable observation. Page-level badges are derived from
the entries' statuses (conservative: the stalest usable tile sets the word)
— a fetch having happened is not a freshness claim.

## Upstream-volume result (preserved, directive 22)
Round 9 measurement stands: 50 impressions across 5 symbols produced only
5 distinct upstream observations (90% upstream reduction / 10×
application-to-upstream deduplication) through the shared quote cache +
coalescing + snapshot reuse. This is an UPSTREAM-VOLUME result only;
request wall-time reduction is a separate metric that requires the
production price battery (cold/warm/stale/concurrency) — not yet claimed.

## Provider status (re-verified)
The registry (`lib/registry/providerRegistry.ts`) remains the single
provider authority; APPROVED-only routing is enforced inside the routing
primitive. No provider was added, removed, or switched in Round 9
(directive 13: `chat-api / agnes-2.5-flash` remains the attested AI
provider/model — vendor changes are Rule-31 founder decisions).

## The 2026-10-11 licensing review (founder research) — routing consequences

The founder's licensing research (delivered in-session 2026-10-11) is the
movement on FD-1 and the answer to P0-8's "FOUNDER DECISION NEEDED
(licensing)". Recorded here verbatim-in-substance; the implementation leg
(the price-license gate) is PR #349 / `docs/evidence/round47/p0-8-license-gate.md`.

**NSE (the exchange whose data the equity universe derives from).** The
published domestic price list charges fixed annual fees per website and
per mobile app for DISPLAYING market data. The non-display policy defines
automated calculations on NSE market data as a separate usage needing its
own agreement — valuation frameworks (P/E, earnings yield, price-to-NCAV)
ARE automated calculations on prices. Consequence: any price-based score
is treated as unresolved until NSE answers in writing; the enquiries below
ask exactly these two questions.

**Broker APIs (own-account licenses).** Angel One SmartAPI — free; live
market feed + historical data for NSE equities and F&O listed at no cost,
with public live streams named as a use case; still exchange data, so
public display needs Angel One's written confirmation (and under which
exchange licence). Upstox — listed free for developers. Fyers — community
post lists TrueData live-tick plans at ₹1,599 + GST for retail (verify
what Fyers includes). Dhan — data API ₹499 + taxes/month. Kite Connect —
₹500/month. ALL broker APIs are licensed to the subscriber's own account:
build and test with them; never serve their data to other users without
written permission.

**yfinance — RESEARCH_ONLY, now explicit.** Its own README states the
Yahoo finance API is intended for personal use only and the access is
unofficial. Fine for experiments; never the product. (Consistent with the
existing rejection row: client ≠ data rights.)

**NSE archives — the free official base.** Daily files: corporate
actions, gainers/losers, new 52-week highs/lows, price-band hits, top 25
securities by traded value; historical bulk/block deals, price-volume
archives, India VIX history. The equity list (EQUITY_L.csv) on the
archive server is the agreed base for rebuilding the ticker master
(fixes the duplicate/invalid symbols from the audit). CONSTRAINTS: check
the website terms before automating any download; keep it to one request
per day. (Measured from the sandbox: nsearchives returns 403 to
non-browser clients — the first fetches run founder-side or from an
allowlisted job; no loader ships unverified, rule 20.)

**Macro — RBI.** The Database on Indian Economy (DBIE) data is
downloadable free of charge; RBI bulletin tables carry government
securities redemption yields, T-bill auctions and repo operations. ONE
official 10-year yield series is adopted and its date recorded with
every value — this retires the 6.92% vs 7.08% dual-source conflict from
the audit. (Sandbox probe: rbi.org.in answers 418 to non-browser
clients — same founder-side fetch constraint.)

**News — primary sources first.** RBI and SEBI publications and exchange
announcements before any aggregator.

**Hosting — recorded constraint for the launch decision.** Vercel's
Hobby plan is restricted to non-commercial personal use; commercial use
requires Pro ($20 per user per month; asking for donations does not make
a deployment commercial). A third-party comparison says Cloudflare Pages
allows commercial use on its free tier — verify its CURRENT terms before
any switch. FOUNDER DECISION at launch (rule 31: vendor selection).

**The two enquiries (drafted 2026-10-11 for the founder to send; both
cost nothing):**
1. NSE Data & Analytics — may the product show end-of-day prices on a
   website; does computing valuation ratios require a non-display
   licence; what does each cost.
2. Angel One — may the SmartAPI feed be shown publicly, and under which
   exchange licence.

Until both answers are in writing: price-based scores are own-use only
(enforced mechanically by the price-license gate), and no surface claims
"live".
