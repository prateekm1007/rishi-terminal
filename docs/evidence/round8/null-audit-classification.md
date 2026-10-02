# Rule-16 null→0 audit — full classification (Coder Directions §9, 2026-10-02)

Sweep: `rg '\|\| 0|\?\? 0'` over runtime code (lib/ app/ hooks/ components/),
plus `: 0`/`Number(...) || 0` arithmetic defaults reviewed per file. Every hit
classified as (A) mathematically valid zero, (B) legitimate non-market default,
(C) dead/defensive coercion that cannot fabricate, or (D) prohibited
missing-data fabrication. Category D was fixed in this round with fail-first
tests; borderline-but-defensible cases are named with their rationale.

## Fixed this round (category D — fabricated market observations)

| Site | Pre-fix behavior | Post-fix |
|---|---|---|
| `lib/livePrice.ts` CoinGecko batch | `price: Number(usd) \|\| 0`, `change: Number(usd_24h_change) \|\| 0` — a missing price became a fake "LIVE 0" quote; a missing change became a fabricated flat day | `coinGeckoEntryFromPayload()` pure parser: null for absent/garbage, genuine 0 change stays 0, non-positive price = no observation (null downstream). Tests: `test/coingecko-null.test.ts` |
| `lib/nse/fundamentals.ts` (NSE + Yahoo + hybrid) | `pe: 0 // Not available`, `roe: fin... ? ... : 0`, `?? 0` merges — sentinel zeros for unreported fundamentals | Every field `number \| null`; unreported → null; negative ROE/EPS survive. Tests: `test/fundamentals-null.test.ts` |
| `lib/scrapers/screener.ts` | `r["ROE"] ?? 0`, `fcf: 0 // TODO`, `roa: 0`, extractors returning 0 on parse failure | Null on parse failure; TODO sentinels → null |
| `lib/liveFundamentals.ts` + `hooks/useFundamentals.ts` | `FullFundamentals` hard-typed `number` — forced every transport to invent a number | All observation fields `number \| null`; the yahoo+nse fallback no longer serves `opm: 0 / revCagr3y: 0 / promoterHolding: 0` for fields it never parsed |
| `app/api/pulse/currency/route.ts` | `prev = chartPreviousClose ?? previousClose ?? price` (banned fallback → fabricated 0% day); rejected pair → `{rate: 0}` rows; 500 body leaked `String(err)` (Rule 10) | Missing price/prev → row OMITTED (page's explicit unavailable state); generic 503 outward, detail logged server-side. Tests: `test/pulse.currency.null.test.ts` |
| `scripts/update-fundamentals.ts` | Patched the seed file with coerced values | Patches only real (>0) observations; nulls skip |

**Why the fundamentals sentinels mattered (the mechanism this audit exists for):**
the resolver's G5 admissibility table (lib/types/admissibility.ts) deliberately
treats a GENUINE zero/negative ROE/OPM/CAGR/BVPS as real data. Sentinel zeros
from the transport rode straight through `pick("roe", live?.roe, seed.roe)` as
if they were observations and overrode the seed baseline — to the UI and into
the AI's getFinancials evidence facts. Null now keeps the seed (the exact
"missing" semantics G5 was designed around).

## Explicitly NOT defects (classified)

- Counters, indices, accumulators, XP/rate/health defaults
  (`lib/rateLimit.ts`, `lib/health/measurement.ts`, `lib/engine/disagreementIndex.ts`,
  `lib/gamification/index.ts`): absence of prior events = 0 — legitimate.
- Comparator/normalizer helpers (`lib/utils/hydration.ts`, lab `helpers.ts`):
  sort baselines, not served values.
- Seed-typed reads (`lib/wisdom/stockParallels.ts`, `lib/consensus/eliteGraph.ts`,
  `lib/scorers/rishiScoreV2.ts`, `app/api/fundamentals/route.ts` seed columns):
  inputs are total `Stock` seed numbers; `?? 0` is unreachable for real rows.
  `rishiScoreV2.ts:49-51` comparisons run on resolved (post-merge) numbers.
- `lib/nse/bulkFetch.ts:125` `Number(...) || 0`: preceded by an
  `if (!meta?.regularMarketPrice) continue` guard and a `price < 20` ADR
  rejection — the coercion is unreachable for absent prices and garbage
  fails closed (dead defensive default).
- `lib/ai/evidence.ts` regex `m.index ?? 0`: match-index fallback — not data.
- `lib/quoteCache.ts` `ttl ?? 0` on the claim retry path: TTL 0 → row
  immediately stale → correct semantics (documented in the U2 round).
- UI/lab chart components (`CompareTab`, `OverviewTab`, `WorldMarketsGrid`,
  `TechnicalIndicators*`, `DashboardClient`, …): render-time baselines for
  bars/scores; the DATA values render through `<DataValue>` (null → "—").
  The CompareTab mktcap divide was null-hardened in this round.
- `app/api/pulse/breadth/route.ts` `(percentChange ?? 0) > 0`: a missing
  change classifies a row as "unchanged" in sector breadth — a known
  conflation (unavailable ≠ unchanged), lower severity because the bucket is
  a breadth histogram, not a quoted value. Recorded for a future scoped fix.
- `app/api/pulse/blocks/route.ts` `qty ?? 0 / price ?? 0`: display-level
  zero-fill on rarely-absent NSE block fields — recorded for a future scoped
  fix with a fail-first test, not bundled here (scope discipline).

## Gate

- RED→GREEN evidence: `docs/evidence/round8/failfirst-{coingecko,fundamentals,currency}-raw.txt`
- Suite at commit time: 902/902 vitest, tsc 0, eslint 0 errors (≤ 305 ratchet).
