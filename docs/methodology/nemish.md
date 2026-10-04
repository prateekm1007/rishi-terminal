# Nemish Shah — Steady Compounder (Nemish Shah)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/nemish.ts`

The steady compounder: consistent EPS, no debt, honest management stakes,
and a sane multiple. The first scorer with the FULL X6 provenance contract.

## Inputs

- `epscagr` — EPS CAGR (%)
- `de` — debt-to-equity
- `promo` — promoter holding (%)
- `pe` — price-to-earnings

## Formula

```
consS  = epscagr >= 12 ? 100 : clamp(epscagr * 8.33)
debtS  = de <= 0.3 ? 100 : de <= 0.6 ? 80 : clamp(100 - de * 100)
mgmtS  = promo >= 35 ? 100 : clamp(promo * 2.86)
valS   = pe <= 25 ? 100 : pe <= 35 ? 70 : clamp(100 - (pe - 35) * 3)
score  = round(0.35*consS + 0.30*debtS + 0.20*mgmtS + 0.15*valS)
```

## Thresholds

- EPS CAGR ≥ 12% saturates (×8.33 per point below).
- Debt: ≤ 0.3 → 100; ≤ 0.6 → 80; beyond, −100 per unit.
- Management: promoter ≥ 35% saturates (×2.86 below).
- Valuation: P/E ≤ 25 → 100; ≤ 35 → 70; beyond, −3 per point.

## Rationale

The weights put consistency first (35%) — the Steady Compounder premise is
that boring reliability compounds. Negative observations are REAL and
score: an EPS CAGR of −8% earns 0 consistency points (a downturn is an
observation of a downturn, not missing data).

## Known failure modes

- **Provenance-aware insufficiency (X6):** a seed-placeholder zero in any
  pillar input (EPS growth / D/E / promoter) makes that pillar insufficient
  and a four-pillar verdict with a missing pillar is NULL (T11 semantics).
  On the current seed this nulls 259 of 916 verdicts — including every bank
  D/E placeholder. A LIVE-sourced zero is a real observation (G5: a
  genuinely debt-free D/E = 0, a stagnant EPS CAGR = 0) and scores.
- **P/E ≤ 0 is always insufficient** regardless of provenance: a live P/E
  must be strictly positive to be admissible (0/negative is the provider
  sentinel for "no meaningful earnings"). No input set makes a zero P/E a
  valuation observation.

## Sectors where it does not apply

Banks on the placeholder seed (D/E placeholders null the verdict — honest
but empty until FD-1 lands real fundamentals).
