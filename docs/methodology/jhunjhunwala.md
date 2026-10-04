# Jhunjhunwala — Conviction Multibagger (Rakesh Jhunjhunwala)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/jhunjhunwala.ts`

The growth-compounder composite: a fair price for cash flow, growth that
shows up in margins, quality returns, and promoter conviction.

## Inputs

- `mktcap`, `ocf` — market cap, operating cash flow (Cr)
- `revcagr`, `epscagr`, `opm` — growth and margin (%)
- `roce`, `de`, `fcf`, `rev` — quality set
- `promo` — promoter holding (%)

## Formula

```
pcf   = mktcap / ocf
pcfS  = 25 <= pcf <= 35 ? 100 : pcf < 25 ? clamp(100 - (25 - pcf) * 2) : clamp(100 - (pcf - 35) * 3)
gS    = clamp(min(40, revcagr * 4) + min(40, epscagr * 2.67) + min(20, opm * 1.14))
fcfM  = fcf / rev
qS    = clamp(min(40, roce * 2.67) + min(40, de <= 0.5 ? 40 : max(0, 40 - de * 80)) + min(20, fcfM * 2.5))
cvS   = promo >= 45 ? 100 : clamp(promo * 2.22)
score = round(0.25*pcfS + 0.25*gS + 0.20*qS + 0.20*cvS + 0.10*50)
```

The 0.10 term is the published **Neutral Base** (a design constant of 50).
Missing core inputs → verdict is null.

## Thresholds

- P/CF has a BAND, not a ceiling: 25-35× is full marks; below 25 decays ×2
  per point, above 35 decays ×3 per point (a cheap-but-no-growth multiple is
  not automatically good).
- Growth composite caps each leg (40/40/20) so one hot CAGR cannot carry it.
- Quality: ROCE, debt and cash each capped at 40/40/20 of the pillar.
- Promoter ≥ 45% saturates (×2.22 below).

## Rationale

The band on P/CF is deliberate — the framework pays for cash generation at a
defensible multiple, not for cheapness alone. The composite caps make the
growth pillar demand breadth (revenue, EPS and margin together).

## Known failure modes

- OCF = 0 (seed placeholder) nulls the P/CF pillar and the verdict.
- The 25-35× band is calibrated to the Indian mid-cap regime of the seed;
  under a different rate regime the band itself would need re-derivation
  (a founder-visible change, not a silent one).

## Sectors where it does not apply

Banks (P/CF against operating cash flow is not how the business is read).
