# A1 bundle accounting (measurement, stubs, verdict)

All numbers gzip kB of first-load JS (script tags in the served HTML of a
production build — same ground truth as scripts/bundleBudget.ts).
Method: each content component was stubbed out of StockPageClient, the app
rebuilt, and the route total re-measured (scripts/measureStockRoute.sh).

## Final state (A1 implementation as proposed)

```
route                first-load   budget   ratchet   verdict
(gate exit 0 after re-anchor — see baseline note)
/                       197.4 kB    200 kB   197.7 kB   OK  (9 scripts)
/screener               199.0 kB    200 kB   199.3 kB   OK  (9 scripts)
/stock/[symbol]         206.8 kB    200 kB   206.8 kB   over proposed budget, ratchet re-anchored  (11 scripts)
```

## Per-module cost on /stock/[symbol] (stub-measured)

```
RishiScoreDual (static import)      3.8 kB   (mode toggle + count-up + all styling)
MetricsPanel (static import)        2.1 kB   (live-fundamentals overlay hook)
PeerComparison (static import)      1.4 kB   (live price/bulk-fundamentals overlay)
WisdomSidebar (static import)       0.8 kB   (mode toggle + chat pane)
ConsensusHero (already client)      0.6 kB   (display-only, zero hooks)
A1 dataset move (already applied)  -1.3 kB   (HISTORICAL_PARALLELS + detectArchetype
                                             now server-only: lib/wisdom/historicalParallels)
```

## Why 200 kB is not reachable this round without a deep refactor

- Shared framework floor, identical for ALL routes (react-dom 69.3, Next
  router/runtime chunks, core-js polyfill chunk 38.6): 191.1 kB
- Stock-route headroom under the 200 kB budget: 200 - 191.1 = 8.9 kB
- Pre-A1 shell (StockPageClient, LivePriceWidget, hooks, banner): 8.6 kB
- Restored content that MUST ship JS to hydrate: 8.1 kB

`next/dynamic` without ssr:false was measured NOT to server-render into a
static prerender (skeletons baked, content absent — see
a1-fail-first-smoke.md), so lazy boundaries cannot carry first-byte content
at all. Server-component conversion of all four content components (with
client islands for the toggles/overlays) is the only path under 200 kB; it
rewrites three components whose internals are pinned by
test/y4.nullNotZero.test.ts source assertions and carries Y2/Y3/Y4
behavior risk. Flagged as FOUNDER DECISION NEEDED in the A1 PR.
