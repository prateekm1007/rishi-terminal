# Raamdeo Agrawal — QGLP Framework (Raamdeo Agrawal)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/raamdeo.ts`

Quality, Growth, Longevity, Price — the QGLP screen in equal spirit.

## Inputs

- `roce`, `roe` — returns (%)
- `revcagr`, `epscagr` — growth (%)
- `de` — debt-to-equity
- `pe` — price-to-earnings

## Formula

```
qualS  = clamp((roce >= 20 ? 100 : roce * 5) * 0.5 + (roe >= 20 ? 100 : roe * 5) * 0.5)
growS  = clamp(min(50, revcagr * 6.25) + min(50, epscagr * 5.56))
longS  = de <= 0.5 ? 100 : de <= 1.5 ? 70 : clamp(100 - de * 40)
priceS = pe <= 25 ? 100 : pe <= 40 ? 60 : clamp(100 - (pe - 40) * 2)
score  = round(0.30*qualS + 0.25*growS + 0.25*longS + 0.20*priceS)
```

## Thresholds

- Quality: the ROCE and ROE ramps (×5 below 20%) average, clamped — the
  S2-05 gate caught this pillar missing its clamp (negative ROCE/ROE drove
  it to −60/−35 on 2 of 916 seed stocks); it is clamped like every other
  pillar now.
- Growth: two legs capped at 50 each (revenue ×6.25, EPS ×5.56).
- Longevity: D/E ≤ 0.5 → 100; ≤ 1.5 → 70; beyond, −40 per unit.
- Price: P/E ≤ 25 → 100; ≤ 40 → 60; beyond, −2 per point.

## Rationale

Quality carries the most weight (30%) — QGLP's premise is that longevity of
a quality franchise is where compounding lives; price is deliberately the
smallest leg (20%) because QGLP pays for quality rather than for cheapness.

## Known failure modes

- The two-leg growth cap means revenue growth above 8% stops contributing
  once its leg caps — the shape is pinned, not accidental.
- Pre-clamp history: the unclamped quality pillar is documented in
  DATA_SOURCES and in the scorer header (S2-05).

## Sectors where it does not apply

Banks (ROCE/ROE/D/E semantics differ structurally).
