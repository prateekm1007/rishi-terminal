# RP — ranked picks re-enabled (founder decision 2026-10-06)

Founder directive 4 (Coder Directions, 2026-10-06): the live UI showed
"Ranked picks are disabled" (Stock of the Day, Top Buy Signals, Short
Radar all off). The founder requires them re-enabled. This file records
the decision, the activation, and the acceptance evidence.

## What was disabled and why it was safe

The widgets are gated by `RANKINGS_ENABLED` (lib/featureFlags.ts — the
ONE flag source, fail-closed: enabled only by the exact string "true").
The flag was simply not set in the Vercel production environment — no
data-quality, provider-health, or confidence defect disabled it (verified
by reading the gate and the ranking engine below; nothing else gates the
widgets). FD-22 (founder round 7) made showing the seed-derived rankings a
product decision; the product decision is now: ON.

## What the widgets render (no gate weakened, rule 23)

- `rankTopBuy(6)` / `computeShortRadar(3)` / `pickStockOfTheDay()` — all
  pure deterministic functions over the ONE canonical consensus engine
  (`getStockScore`), `dataQuality === "OK"` only, explicit tie-breaks
  (consensus desc, market cap desc, symbol A-Z), IST-date-seeded Stock of
  the Day. No `Date.now()`/`Math.random()` in the ranking path.
- Seed provenance stays honest: every ranked value renders through
  `<DataValue sourced={{ source: "seed", asOf: null }}>` and the ranked
  section carries the mandated "Illustrative sample data" banner (pinned
  by test/smoke/smoke.spec.ts and test/rankingsFlag.test.ts).
- Live overlays unchanged: QVPS commentary, live fundamentals hydration,
  and the initial-price snapshot ride the same canonical quote path as
  before.

## Activation (autocommand-only)

```
$ curl -s -X POST "https://api.vercel.com/v9/projects/prj_vsOQe05nMx2OlmK70AII3MpfPT3Y/env" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    -d '{"key":"RANKINGS_ENABLED","value":"true","type":"plain","target":["production"]}'
{"created":{"type":"plain","value":"true","target":["production"],"id":"Yiwt3KrRIatt6dsO",...},"failed":[]}
```

A bare re-deploy of the same SHA is skipped by the ignore-build-step
(empty diff, by design), so this PR carries the deploy-relevant change
that activates the flag: `.env.example` records the new production
default (root file → production diff → real deployment).

## Acceptance (C6 live, against the deployed SHA)

Positive controls for each widget, determinism (two ISR generations
within the same IST date), the seed banner present, and the disabled
message absent — raw outputs appended below after the production deploy
of this merge.

## Determinism proof

`rankTopBuy`/`computeShortRadar`/`pickStockOfTheDay` are pure functions
of the seed dataset (+ the IST date for Stock of the Day) — pinned by
test/rankingsFlag.test.ts and the rankings unit tests. The live positive
control below fetches the homepage twice (separate ISR generations) and
asserts the same ranked symbols in the same order.

## LP post-deploy measurement (directive 7, appended after #214 merged — 64b44bb8)

Same timed browser probe, before vs after the incremental chunk delivery
(#214, deployed 2026-10-06 ~07:01 UTC, in-session):

```
BEFORE (b2d2b795): t=10..100s rows with price: 0/916 — while batch
  responses accumulated 200 x16 (all-or-nothing waterfall; raw timing
  table in the LP PR).
AFTER  (64b44bb8): TIME-TO-FIRST-PRICE: 17.4s; progressive fill
  t=22s: 43 | t=33s: 85 | t=43s: 128 | t=53s: 217 | t=63s: 259 |
  t=73s: 338 | t=83s: 376 | t=93s: 456 | t=103s: 503 rows of 916.
```

The user-visible contract is restored: prices render as each chunk lands
(the screenshot defect — dashes beside populated fundamentals — is gone).
The full-table fill rate is bounded by per-chunk server latency (each
stale chunk triggers a Yahoo sweep); the operational lever for that is
the warmer's scheduler — still FOUNDER DECISION NEEDED
(e4-scheduler-decision.md), not claimable as closed.

## LP post-deploy measurement (directive 7, appended after #214 merged — 64b44bb8)

Same timed browser probe, before vs after the incremental chunk delivery
(#214, deployed 2026-10-06 ~07:01 UTC, in-session):

```
BEFORE (b2d2b795): t=10..100s rows with price: 0/916 — while batch
  responses accumulated 200 x16 (all-or-nothing waterfall; raw timing
  table in the LP PR).
AFTER  (64b44bb8): TIME-TO-FIRST-PRICE: 17.4s; progressive fill
  t=22s: 43 | t=33s: 85 | t=43s: 128 | t=53s: 217 | t=63s: 259 |
  t=73s: 338 | t=83s: 376 | t=93s: 456 | t=103s: 503 rows of 916.
```

The user-visible contract is restored: prices render as each chunk lands
(the screenshot defect — dashes beside populated fundamentals — is gone).
The full-table fill rate is bounded by per-chunk server latency (each
stale chunk triggers a Yahoo sweep); the operational lever for that is
the warmer's scheduler — still FOUNDER DECISION NEEDED
(e4-scheduler-decision.md), not claimable as closed.
