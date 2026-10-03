# R12 feature-depth audit — round 1 (directives 17/18)

Date: 2026-10-03 ~07:00Z · Tree audited: `main` = `76c2a32` (the final
tree awaiting deploy) · Method: code-level depth contract per route
(`UI → client state → API → canonical resolver → real data/provider →
provenance → error state → AI integration where applicable → tests`),
grep + import-graph + execution probes. Production probes to be appended
after the final tree deploys (production still serves `faa2348`).

## Verdict per route

| Route | Data path | Provenance | Error state | Depth verdict |
|---|---|---|---|---|
| `/` Dashboard | server component, ISR 3600; T13 rankings (rankTopBuy/computeShortRadar/pickStockOfDay); U2 SSR price snapshot via the shared quote path (`lib/dashboardSnapshot`); client hook revalidates 60s | every value keeps its own observation-time label; U4 flag-gates the ranked widgets (fail-closed disabled state, FD-22) | honest disabled state when flag off | **DEEP** |
| `/screener` | server → `getSlimIndex` (free fields only) → client table; presets/pills on slim rows | seed display fields carry the documented seed/freshness footnote; live prices via client | T11 nulls render `—`, sorted last | **DEEP** |
| `/lab` (5 tabs) | RSC slim index + per-tab upgrades: Watchlist/Holdings localStorage, live prices via `useLivePrices`, verdict upgrades via `GET /api/rishis/[symbol]` | unpriced rows excluded from P&L totals (T14); live overlay per-value provenance | em-dash nulls; per-tab ErrorBoundary | **DEEP** |
| `/crypto` `/forex` `/commodities` `/bonds` | `use client` + `useLivePrices` + `/api/gurus?kind=…`; symbol lists from `data/markets.ts`/`data/crypto.ts` (the same source `lib/registry/validateInput` derives from) | ProvenanceChip LIVE/REFERENCE/UNAVAILABLE/DERIVED (round-4 E); maturity state derived not invented (FD-11) | `—` not 0% on reference fallbacks | **DEEP** (forex analytics labelled illustrative per route-aware footer) |
| `/alerts` | localStorage alerts + `useLivePrices`; header state derived from entry statuses via `pricePresentation` (R9-1) | observation clock = server-disclosed upstream time | honest empty/checked states | **DEEP** (client-side by design) |
| `/news` | RSS aggregation (ET/Google/… real feeds), `s-maxage=120` edge cache; ticker context via `useLivePrices` | per-item source/category/region; failure state with retry (round-5 H) | retry state | **DEEP**; known limitation: no per-symbol news query (feature gap, documented; not fabrication) |
| `/pulse` | `/api/prices`, `/api/pulse/breadth` (real advance/decline), `/api/pulse/currency`, `/api/pulse/blocks` (live NSE block-deal API), `/api/history/breadth` | R9-3 null semantics (unknown ≠ unchanged; no manufactured BUY side; provider timestamp or null) | honest degraded states | **DEEP** |
| `/rishis` + `/chat` | one AI loop; provenance rides every reply (model, grounding mode, tool calls) | context-only vs evidence-context vs structured-claims distinct (G3) | honest unavailable state (no pseudo-AI fallback, round-4 D) | **DEEP** (reliability = open AI workstream, measured by the battery) |
| `/stock/[symbol]` | canonical registry page path; InsufficientDataRecord for INCOMPLETE (no scored surface); per-value overlaySourced | LIVE/UNAVAILABLE tooltips (T14) | 308 alias redirects; generateMetadata honest | **DEEP** |
| `/fno` hub + `/fno/options` + `/fno/backtester` | honest unavailable states (synthetic chains/backtests deleted with rule-17 evidence) | explicit "licensed NSE derivatives data not available" | empty states explain why | **HONEST-THIN by design** (data-gated; FD recorded) |
| `/pricing` | everything-free truth; contract test `freeAccess.contract.test.ts` fails on tier/rupee/upgrade vocabulary | — | — | **HONEST** |
| `/terms` `/privacy` | static legal copy | — | — | present (round-5) |

## Defects found and fixed this round

1. **Dead data-module twins (rule 14/17)** — `data/{markets,crypto,stockDetails,forex}/index.ts`
   shadowed by sibling `.ts` files, carrying DIVERGENT instrument
   universes (e.g. `XAUUSD`-style vs `GOLD`-style commodity symbols;
   `XRP`/`DOGE` only in the dead crypto list). Fixed in PR #95 (R12-03)
   with a rule-21 RED→GREEN gate (`test/moduleTwins.test.ts`) making the
   class un-reintroducible.

## Low observations (no code change this round; recorded for triage)

1. `/fno` hub footer falls to the default equity source line although the
   page shows no equity data (only strategy names + unavailable states) —
   copy imprecision only; the LegalDisclaimer route-aware list could gain
   a `/fno` case.
2. `/fno` Strategy Library cards carry persona-style tags ("Jhunjhunwala
   Approved") on standard educational strategy definitions — decorative
   copy, no fabricated market data; covered by the site-wide disclaimer,
   but an explicit "educational reference" chip would be more precise.
3. News per-symbol limitation stands (feature gap — needs a symbol-aware
   feed strategy or vendor; Phase-1 data foundation dependency).

## Production probes (to append post-deploy)

After the final tree deploys: per-route `/api/version`-anchored spot
checks (prices/observedAt, gurus kinds, pulse breadth/blocks non-empty on
a trading window, news 200 + items>0, screener HTML contains consensus
bands, stock page INCOMPLETE record renders the insufficient-data
surface).
