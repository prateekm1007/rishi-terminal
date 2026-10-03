# X3 evidence — prices in the first byte (Round 11, item 3)

Date: 2026-10-03 (UTC) · Task: X3 · PR: #117 (`fix/x3-first-byte-prices`,
commit `f646579`) · Merged as `d90557eaad7aa540839c560f405828926df16c50`.

## Deployment + identity chain

```
Merge of PR #117 → d90557eaad7aa540839c560f405828926df16c50
Deployment: dpl_667zj4rmmCoPN7H5uUtMqKsbHiHF (READY, production, 20:25:36Z)

$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"d90557eaad7aa540839c560f405828926df16c50","now":"2026-10-03T20:27:17.666Z","node":"v24.21.0"}

$ git rev-parse origin/main
d90557eaad7aa540839c560f405828926df16c50
```

## Acceptance 1 — the founder's curl greps (live, post-deploy)

```
$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -c "FETCHING"
0
$ curl -s https://rishi-terminal.vercel.app/ | grep -c "Connecting\|RANKINGS_ENABLED"
0
```

Pre-fix RED on the same commands (production still serving the W5-defect
tree, 20:0xZ): `1` and `1`.

The SBIN tile now renders its cached observation in the first byte
(SBIN is one of the cached symbols):

```
$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -o "PRICE\|CACHED · [A-Z-]*\|Observed [0-9:]*"
PRICE
CACHED · YAHOO-BULK
Observed
```

## Acceptance 2 — live `quote_cache` row count

```
GET /rest/v1/quote_cache (service role, read-only)
content-range: 0-15/16        → 16 rows
sample: RELIANCE 1167.7 (yahoo-bulk, 09:01:36Z) · SBIN 954.1 (09:33:05Z) ·
        AUBANK 987 · AXISBANK 1217.1 · TCS 2075 …
```

16 rows (the W5 audit observed 1). Meaning: the symbols above render a
price in the stock-page first byte today; every other symbol renders the
honest `UNAVAILABLE` state until its first client fetch warms the cache.
Non-equity classes (index/crypto/gold stat cards) are not in the equity
cache by design and fill client-side post-mount — recorded as a follow-up
decision (extending the shared cache to other classes = schema +
classification change), not silently smuggled in.

## Acceptance 3 — warm latency

`npx tsx scripts/phase6Battery.ts` (against production, this session):

```
A  cold single TCS: 1403ms, status=CACHED
B  sequential repeats (cache-busted origin-forcing): walls=[724,543,531,523,660] → p95 724ms
C  burst: identical p50=838ms distinct p50=808ms (n=10)
D  batch 26 (real homepage population): 200 in 3208ms, returned=26/26
E  repeated batch: observedAtEqual=true; serving-layer attribution NOT claimed
   (counter evidence unavailable from this sandbox — CRON_SECRET is a Vercel
   v2 envelope in the probe store; decrypt path not exercised this session)
T59.4 unresolved counter defects: 0
```

Warm p95 across the exact 26-symbol homepage population (single-symbol
route, warm pass measured after a warm-up pass — the natural client path):

```
population=26  min=58  p50=65  p95=114  max=137   (ms)
```

**114 ms ≤ 800 ms** — acceptance met with margin. (The battery's B-scenario
walls are higher by design: distinct cache busters force the origin and
exclude CDN/cache serving; the natural warm path is what a real client
experiences.)

Note on "32 symbols": the battery's homepage population is 26 after
de-duplication (`TICKER_SYMS` 15 + rotating 6 + shorts 3 + world markets +
top crypto + stock-of-day). The battery previously measured a DRIFTED
hand-mirrored population (removed symbols like MATIC/N225/VIX) which the
batch route correctly rejected with 400 — fixed in this PR by importing
`lib/dashboardSymbols` (Rule 14, one source of truth).

## What the fix was (summary)

- Home + 916 stock pages render dynamically; the first byte is a READ-ONLY
  peek of the shared quote cache (`peekCachedQuote(s)` /
  `serveCachedQuote(s)`): no refresh claims, no upstream fetches, no
  writes; failure → honest miss.
- `⟳ FETCHING` only ever appears for post-hydration refetches of an
  already-rendered tile; the SSR first byte renders the cached observation
  (with its own `Observed` clock) or `UNAVAILABLE`.
- `Connecting…` → `priceUnavailable`; hero loses the static "Live prices"
  claim; the rankings banner no longer names `RANKINGS_ENABLED` — all 7
  locales.
- A durable smoke gate pins the founder's curl acceptance in CI
  (`test/smoke/smoke.spec.ts` — "first byte honesty", raw SSR HTML via
  `page.request`).
