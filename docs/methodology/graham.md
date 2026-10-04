# Graham — Deep Value (Benjamin Graham)

Tier: **Legend** · consensus weight: **2.5** · code: `lib/scorers/graham.ts`

Balance-sheet-first value: net-current-asset discount, a cheap earnings
multiple, current-ratio safety and low leverage.

## Inputs

- `ca`, `tl` — current assets, total liabilities (Cr)
- `sh` — shares outstanding (Cr)
- `price` — share price
- `pe` — price-to-earnings
- `de` — debt-to-equity

## Formula

```
ncav     = (ca - tl) / sh
ncavDisc = ((ncav - price) / price) * 100
ncavS    = ncavDisc >= 30 ? 100 : ncavDisc > 0 ? ncavDisc * 3.33 : clamp(50 + ncavDisc)
peS      = pe > 0 ? (pe <= 15 ? 100 : clamp(100 - (pe - 15) * 5)) : 0
cr       = ca / max(1, tl)
crS      = clamp(cr * 50)
deS      = clamp(de <= 0.5 ? 100 : 100 - de * 100)
score    = round(0.40*ncavS + 0.25*peS + 0.15*crS + 0.20*deS)
```

## Thresholds

- NCAV discount ≥ 30% saturates (×3.33 per point of positive discount);
  below a zero discount the pillar decays from 50.
- P/E ≤ 15 saturates, −5 points per P/E point above; a non-positive P/E
  earns 0 (the provider sentinel for "no meaningful earnings").
- Current ratio 2.0 saturates (×50 per unit).
- D/E ≤ 0.5 saturates, −100 points per unit above.

## Rationale

The Graham arithmetic is deliberately mechanical: price measured against
net current assets first, earnings second, leverage and liquidity as
safety. The NCAV pillar's 40% weight is the deepest-value signal the
panel carries.

## Known failure modes

- Companies with negative book equity or negative current assets make
  NCAV meaningless; the pillar decays toward 0 but the verdict still
  scores on the other pillars — read the detail, not just the number.
- `tl <= 0` is degenerate data; the current-ratio pillar floors its
  denominator at 1 to avoid division blowups.

## Sectors where it does not apply

Asset-light services (NCAV is structurally small), banks (the
current-asset/liability split is the business itself), and companies
running negative working capital by design (retail).
