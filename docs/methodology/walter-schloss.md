# Walter Schloss — Cigar Butt (Walter Schloss)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/schloss.ts`

Statistical cheapness on book, no debt, insider ownership, and a size band
where neglect is likely.

## Inputs

- `price`, `bvps` — price, book value per share
- `de` — debt-to-equity
- `promo` — promoter holding (%)
- `mktcap` — market capitalisation (Cr)

## Formula

```
pbS    = pb <= 1 ? 100 : pb <= 1.3 ? 80 : clamp(100 - (pb - 1.3) * 100)
debtS  = de <= 0.2 ? 100 : de <= 0.5 ? 80 : clamp(100 - de * 100)
insS   = promo >= 40 ? 100 : clamp(promo * 2.5)
sizeS  = 50000 <= mktcap <= 200000 ? 100
       : clamp(50 + (mktcap >= 30000 ? 25 : 0) + (mktcap <= 300000 ? 25 : 0))
score  = round(0.40*pbS + 0.30*debtS + 0.20*insS + 0.10*sizeS)
```

## Thresholds

- P/B ≤ 1 → 100; ≤ 1.3 → 80; beyond, −100 per unit of P/B.
- Debt: ≤ 0.2 → 100; ≤ 0.5 → 80; beyond, −100 per unit.
- Insider: promoter ≥ 40% saturates (×2.5 below).
- Size: the 50k-200k Cr band saturates; neighbouring bands half-mark.

## Rationale

Schloss's statistical discipline: a discount to book is the thesis, debt is
the mortal enemy of the bargains, and small-enough-to-be-neglected is where
mispricings survive.

## Known failure modes

- Negative book value saturates the P/B pillar (artefact).
- The size band embeds the seed's market-cap distribution; the band edges
  are regime-dependent.

## Sectors where it does not apply

Banks and asset-light platforms where book value does not represent the
operating asset base.
