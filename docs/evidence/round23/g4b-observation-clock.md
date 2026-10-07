# G4B — the observation clock can actually populate (round 23 follow-up)

Found during #235's C6 live verification (2026-10-07, ~06:30–06:40Z), after the
merge was already deployed: the deployed dashboard rendered
`LAST OBSERVED MARKET DATA | Observation time not disclosed` — while the batch
API disclosed genuine observation timestamps for the very same strip symbols.

## The live evidence that exposed it

`POST /api/prices/batch` `{"symbols":["GOLD","SILVER","WTI","SOL","BTC","ETH","NIFTY50","SPX"]}`
(2026-10-07 ~06:30Z, market open):

```
GOLD      price=4160   observedAt=2026-10-07T06:20:32.000Z
SILVER    price=60.93  observedAt=2026-10-07T06:20:18.000Z
WTI       price=90.29  observedAt=2026-10-07T06:20:33.000Z
SOL       price=118.64 observedAt=2026-10-07T06:29:20.000Z
BTC       price=84203  observedAt=2026-10-07T06:29:20.000Z
ETH       price=2616.17 observedAt=2026-10-07T06:29:20.000Z
NIFTY50   price=22688  observedAt=2026-10-07T06:30:46.000Z
SPX       price=7818.93 observedAt=2026-10-06T20:40:07.000Z
```

Hydrated production UI (browser probe, 15 s after networkidle):

```
dashboard strip: "LAST OBSERVED MARKET DATA | Observation time not disclosed"
/crypto header:  "● LIVE | Observation time not disclosed"
/commodities:    header state word renders, no "Observed …" clock
```

## Root cause (one asymmetry, three dead surfaces)

- The wire (`app/api/prices/batch/route.ts`) discloses the upstream
  observation time under **both** `observedAt` and `lastUpdated`.
- The client hook's `PriceData` (hooks/useLivePrices.ts) carries only
  `lastUpdated` — `observedAt` is dropped in `normalizeBatchEntry`.
- `latestObservedAt` (lib/pricePresentation.ts) read **only** `e.observedAt`,
  while its own `ObservedEntry` contract documents "the wire's observedAt or,
  for legacy shapes, lastUpdated" and the sibling
  `observationDateFromEntry` implemented exactly that fallback.

Net effect: `latestObservedAt(PriceData[])` could only ever return `null`, so
the `observedAt` clock state in `useLivePrices` was unreachable and the
dashboard / crypto / commodities "Observed …" clock never rendered — every
surface fell back to the honest not-disclosed wording even when every tile
disclosed a genuine timestamp.

## Fix (root cause, Rule 14/15)

One private shared extraction `observationIso(entry)` (observedAt, else
lastUpdated, non-parsable → null) now backs **both** `latestObservedAt` and
`observationDateFromEntry`, so the single-entry and multi-entry clocks cannot
disagree about what counts as a disclosed observation. No wire change, no hook
change, no formatting change — the returned string stays verbatim.

## Fail-first (C5)

```
$ npx vitest run test/g4b.observationClock.test.ts   # pre-fix main (3ef7237)
 Tests  3 failed | 5 passed (8)
   FAIL ... a lastUpdated-only entry (the hook's PriceData) discloses its observation time
   AssertionError: expected null to be '2026-10-07T06:30:46.000Z'
   FAIL ... composition — normalizeBatchEntry output feeds the page clock
   AssertionError: expected null to be '2026-10-07T06:20:32.000Z'
   FAIL ... the LATEST across mixed observedAt/lastUpdated entries wins
   AssertionError: expected null to be '2026-10-07T06:30:46.000Z'
```

## Post-fix battery (raw)

```
$ npx vitest run test/g4b.observationClock.test.ts test/uiProvenance.round9.test.ts \
    test/g4.honesty.test.ts test/livePrices.null.test.ts test/lp.chunkWaterfall.test.ts
 Test Files  5 passed (5)
      Tests  52 passed (52)
$ npx tsc --noEmit                 → exit 0
$ npx eslint .                     → 0 errors, 283 warnings (ratchet baseline 284 — unchanged by this PR)
$ npx vitest run                   → Test Files 161 passed (161); Tests 1627 passed (1627)
$ npm run validate:encoding        → ✅ no mojibake
$ npm run build                    → exit 0
$ git ls-files | grep -E "(^|/)\.env"   → .env.example   (only)
```

## Scope guard

This PR touches exactly one module (`lib/pricePresentation.ts`) plus its test.
The honest fallback wording (G4 #235, merged) is untouched — when no entry
discloses a time the UI still renders "Observation time not disclosed"; the fix
only makes the *positive* state reachable when times ARE disclosed. The
existing R9 pins (no fetch-time substitution, no fabrication, verbatim strings)
all still pass unchanged.
