# Vijay Kedia — SMILE Formula (Vijay Kedia)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/kedia.ts`

Small, manageable debt, innovative margins, emerging growth — with a
deliberate 20% neutral reserve.

## Inputs

- `mktcap` — market capitalisation (Cr)
- `de` — debt-to-equity
- `opm` — operating margin (%)
- `revcagr` — revenue CAGR (%)

## Formula

```
smallS = mktcap <= 5000 ? 100 : clamp(100 - (mktcap - 5000) / 100)
mangS  = de <= 0.5 ? 100 : clamp(100 - de * 100)
innoS  = opm >= 12 ? 100 : clamp(opm * 8.33)
emerS  = revcagr >= 15 ? 100 : clamp(revcagr * 6.67)
score  = round(0.20*smallS + 0.20*mangS + 0.20*innoS + 0.20*emerS + 0.20*50)
```

The 0.20 term is the published **Neutral Base** (a design constant of 50) —
the SMILE reading holds a full fifth of the verdict at neutral.

## Thresholds

- Size: ≤ 5000 Cr saturates, −1 per 100 Cr above.
- Debt: D/E ≤ 0.5 saturates, −100 per unit.
- Margins: OPM ≥ 12% saturates (×8.33 below).
- Growth: revenue CAGR ≥ 15% saturates (×6.67 below).

## Rationale

Equal 20% weights plus the neutral reserve: no single SMILE leg can
dominate, and the reserve keeps the verdict conservative for records where
only some legs are knowable. The framework is a screen, not a valuation.

## Known failure modes

- The 5000 Cr cap is seed-regime dependent; inflation of the index moves
  the whole band's meaning.
- Seed D/E placeholders (banks) read as the unknown zero (X6 semantics
  apply only where a provenance-aware scorer consumes them).

## Sectors where it does not apply

Large caps (out of band by definition), banks (D/E semantics).
