# Ashish Kacholia — Whale Small-Cap Hunter (Ashish Kacholia)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/kacholia.ts`

Small-cap conviction: promoter skin, accelerating earnings, niche dominance,
and the right size band.

## Inputs

- `promo` — promoter holding (%)
- `epscagr` — EPS CAGR (%)
- `roce` — return on capital employed (%)
- `mktcap` — market capitalisation (Cr)

## Formula

```
skinS  = promo >= 50 ? 100 : clamp(promo * 2)
fcfG   = epscagr * 1.2
fcfS   = fcfG >= 25 ? 100 : clamp(fcfG * 4)
nicheS = roce >= 20 ? 100 : clamp(roce * 5)
sizeS  = 200 <= mktcap <= 3000 ? 100 : mktcap < 200 ? 50 : clamp(100 - (mktcap - 3000) / 100)
score  = round(0.30*skinS + 0.25*fcfS + 0.20*nicheS + 0.15*sizeS + 0.10*50)
```

The 0.10 term is the published **Neutral Base** (a design constant of 50).

## Thresholds

- Skin: promoter ≥ 50% saturates (×2 below).
- Acceleration: 1.2× EPS CAGR ≥ 25% saturates (×4 below) — growth must be
  fast, not merely present.
- Niche: ROCE ≥ 20% saturates (×5 below).
- Size: the 200-3000 Cr band saturates; below it 50; above, −1 per 100 Cr.

## Rationale

The size band is the framework's identity — small enough for a private
portfolio to matter, profitable enough (ROCE floor) to be a business rather
than a story. The 1.2× multiplier demands acceleration above plain EPS
growth.

## Known failure modes

- EPS-CAGR placeholders on the seed flow straight into the acceleration
  pillar (the X6 provenance contract nulls the verdict only where Nemish
  consumes them; here the seed value is consumed as-is — revisit under FD-1).
- The 200-3000 Cr band is calibrated to the seed's small-cap regime.

## Sectors where it does not apply

Large-cap compounders (out of the size band by definition) and banks.
