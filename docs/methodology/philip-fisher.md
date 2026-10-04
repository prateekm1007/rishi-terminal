# Philip Fisher — Scuttlebutt Growth (Philip Fisher)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/philipfisher.ts`

Growth worth holding long: insiders with skin, real reinvestment, EPS
compounding, and a market big enough to matter.

## Inputs

- `promo` — promoter holding (%)
- `capex`, `rev` — capital expenditure, revenue (Cr)
- `epscagr` — EPS CAGR (%)
- `mktcap` — market capitalisation (Cr)

## Formula

```
mgmtS  = promo >= 50 ? 100 : clamp(promo * 2)
rndS   = capex >= 0.08 * rev ? 100 : clamp((capex / rev) * 100 * 12.5)
growS  = epscagr >= 20 ? 100 : clamp(epscagr * 5)
mktS   = 50000 <= mktcap <= 500000 ? 100 : mktcap < 50000 ? 70 : clamp(100 - (mktcap - 500000) / 100000)
score  = round(0.25*mgmtS + 0.25*rndS + 0.25*growS + 0.25*mktS)
```

## Thresholds

- Management: promoter ≥ 50% saturates (×2 below).
- Reinvestment: capex ≥ 8% of revenue saturates (×12.5 per % of capex/revenue).
- Growth: EPS CAGR ≥ 20% saturates (×5 below).
- Market: the 50k-5 lakh Cr band saturates; below it 70; above, −1 per
  additional lakh Cr.

## Rationale

Equal 25% weights: Fisher's framework refuses to trade one leg for
another — insiders, reinvestment, compounding and runway must all be
present. Capex intensity stands in for R&D, which the seed does not carry
as a separate field (documented substitution).

## Known failure modes

- Capex-as-R&D substitute flatters capital-heavy non-R&D businesses and
  undercounts expensed R&D.
- Seed capex placeholders distort the reinvestment pillar (FD-1 pending).

## Sectors where it does not apply

Asset-light R&D businesses (the capex proxy reads them as non-investors),
and mature capital-intensive utilities.
