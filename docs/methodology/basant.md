# Basant Maheshwari — Consumption Growth (Basant Maheshwari)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/basant.ts`

Consumer-franchise growth: the sector trend, visible margins, and a
valuation you can hold through.

## Inputs

- `sector` — sector string (consumer gate)
- `revcagr` — revenue CAGR (%)
- `opm` — operating margin (%)
- `pe` — price-to-earnings

## Formula

```
consS  = sector contains 'fmcg' or 'retail' ? 100 : 50
trendS = revcagr >= 15 ? 100 : clamp(revcagr * 6.67)
visS   = opm >= 15 ? 100 : clamp(opm * 6.67)
peS    = pe <= 40 ? 100 : pe <= 60 ? 70 : clamp(100 - (pe - 60) * 2)
score  = round(0.30*consS + 0.25*trendS + 0.25*visS + 0.20*peS)
```

## Thresholds

- Consumer gate: FMCG/retail sectors 100, everything else 50 (half the
  pillar for non-consumer names — the framework still scores them, it just
  refuses to pretend they are consumer franchises).
- Trend: revenue CAGR ≥ 15% saturates (×6.67 below).
- Visibility: OPM ≥ 15% saturates (×6.67 below).
- Valuation: P/E ≤ 40 → 100; ≤ 60 → 70; beyond, −2 per point.

## Rationale

The generous P/E band (40-60) is the framework's identity: consumption
franchises are bought for the duration, and Basant Maheshwari's writing
accepts paying up for visibility. The 40-weight valuation leg is the
smallest of the four.

## Known failure modes

- Sector-string matching is literal — sector renames move scores without
  any business change (same caveat as Templeton's quality gate).
- A 60+ P/E decays slowly (−2/point) — in a de-rating regime this pillar
  flatters expensive consumer names.

## Sectors where it does not apply

Non-consumer cyclical peaks (the framework will still score them ~50 on
the consumer leg — read the detail), banks.
