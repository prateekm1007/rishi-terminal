# Damani — Zero-Debt Fortress (Radhakishan Damani)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/damani.ts`

Defensive quality: no leverage, sustainable returns on capital, predictable
cash conversion, and a moat that shows up in margins.

## Inputs

- `de` — debt-to-equity ratio
- `roce` — return on capital employed (%)
- `fcf`, `rev` — free cash flow, revenue (Cr)
- `opm` — operating profit margin (%)

## Formula

```
deS    = de <= 0.1 ? 100 : de <= 0.3 ? 70 : clamp(100 - de * 100)
roceS  = roce >= 25 ? 100 : clamp(roce * 4)
fcfM   = fcf / rev
cfS    = fcfM >= 10 ? 100 : clamp(fcfM * 10)
moatS  = opm >= 15 ? 100 : clamp(opm * 6.67)
score  = round(0.30*deS + 0.25*roceS + 0.20*cfS + 0.15*moatS + 0.10*50)
```

The 0.10 term is the published **Neutral Base** (a design constant of 50).
Any missing input (null via the fin/safeDiv guards) → verdict is null.

## Thresholds

- D/E ≤ 0.1 saturates; ≤ 0.3 earns 70; beyond, −100 points per unit.
- ROCE ≥ 25% saturates (×4 per point below).
- FCF margin ≥ 10% saturates (×10 per point below).
- OPM ≥ 15% saturates (×6.67 per point below).

## Rationale

The heavy debt pillar encodes the "fortress" premise: survival first. The
cash-conversion pillar checks that reported profits arrive as cash; the
margin pillar is the moat proxy.

## Known failure modes

- Banks: D/E is structurally high and is the business — the scorer nulls on
  missing inputs but a real bank D/E would misread here.
- Seed revenue placeholders make the FCF margin meaningless; those records
  null instead of scoring (T11).

## Sectors where it does not apply

Banks and leveraged financials; utilities where regulated debt is the
asset base.
