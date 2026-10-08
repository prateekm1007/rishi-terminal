# A4 Materiality — deterministic threshold engine (INT-A4)

Roadmap item A4 (`docs/INTELLIGENCE_ROADMAP.md` section 5). Implementation:
`lib/intelligence/materiality.ts`. Tests: `test/intelligenceMateriality.test.ts`.

## Pre-registered threshold set (founder-confirmed 2026-10-08, verbatim)

| Leg | Rule | Material when |
|---|---|---|
| price-sigma | 3x sigma of 20-day daily returns (population std, decimals) | \|return\| >= 3σ |
| price-intraday | 4% intraday (`change` datum, or derived old -> new) | \|pct\| >= 4% |
| volume-surge | 3x 20-day median (shares) | new / median >= 3 |
| technical-regime | regime change confirmed over 2 sessions | regimes differ AND sessions >= 2 |
| portfolio-shift | exposure change >= 2 percentage points | \|after - before\| >= 2 |

At-threshold counts as material (`>=`). The two legs of PRICE are an OR;
the sigma leg is evaluated first and owns a joint firing. The set is
pinned by test — a silent change breaks the build.

Baselines began accumulating 2026-10-07. Until ~20 days of history exist
the engine fails closed (see below); readiness is honest, never assumed.

## Fail-closed table (all non-material, all named)

| Input | Verdict reason |
|---|---|
| seed-derived row (defence-in-depth; A3 never emits these) | `seed-derived` |
| unavailable source state | `unavailable-input` |
| older than the caller-stated SLO (`freshness.maxAgeMs`, `asOf` supplied by the caller — the module keeps no clock) | `stale` |
| category with no registered threshold (all A3 categories except PRICE/VOLUME/TECHNICAL/PORTFOLIO) | `no-threshold-for-category` |
| baseline/history absent | `missing-input` |
| history shorter than 20 | `insufficient-history` |
| constant or zero-variance baseline (no scale) | `insufficient-history` |
| NaN / non-finite / negative-impossible baseline members | `invalid-input` |
| negative `price`- or `volume24h`-field event values (impossible domain; signed `change` declines stay legal) | `invalid-input` |
| non-numeric event values, zero old price, unorderable clocks | `non-comparable` |
| every applicable leg evaluated, none fired | `below-threshold` (and only then) |

## Economic gate (mechanical)

`aiSpendAllowed(verdict)` is true if and only if the verdict is material.
Every synthesis-eligibility check downstream MUST call it. A4 owns
materiality exclusively: no later feature adds its own spend heuristic.

## Wiring notes (for A7/A9/A10 consumers, not this PR)

- Input is the A3 `IntelligenceEvent`; context (baselines, regime,
  exposure, freshness) is caller-supplied — the engine fetches nothing.
- The verdict's closed key set is
  `verdict / reason / thresholdId / category / eventId / detail`.
  `thresholdId` is the firing pre-registered threshold, null when
  non-material.
- `classifyEvents` maps one verdict per event, order preserved.
