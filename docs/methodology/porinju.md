# Porinju Veliyath — Contrarian Deep Value (Porinju Veliyath)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/porinju.ts`

Contrarian value with a catalyst: cheap multiple, management with a stake,
asset backing, and revenue that can turn.

## Inputs

- `pe` — price-to-earnings
- `promo` — promoter holding (%)
- `price`, `bvps` — price, book value per share
- `revcagr` — revenue CAGR (%)

## Formula

```
conS   = clamp(100 - max(0, pe - 10) * 2)
mgmtS  = clamp((promo - 25) * 2.5)
undS   = bvps <= 0 ? 0 : clamp(100 - max(0, pb - 1) * (100 / 3))
catS   = revcagr >= 20 ? 80 : revcagr >= 10 ? 100 : clamp(revcagr * 10)
score  = round(0.30*conS + 0.25*mgmtS + 0.25*undS + 0.20*catS)
```

## Thresholds

- Contrarian: P/E ≤ 10 saturates, −2 per point above.
- Management: 0 below 25% promoter, 100 at 65%.
- Undervaluation: P/B ≤ 1 saturates, 0 at P/B ≥ 4 (×100/3 per unit).
- Catalyst: revenue CAGR 10-20% is the sweet band (100); ≥ 20% earns 80
  (the turn has already happened); below 10, ×10.

## Rationale

The catalyst band is deliberately non-monotone — Porinju's edge is the
turnaround, not the compounder: a stock ALREADY growing 20%+ has less
re-rating left than one crossing 10%. Negative book value scores 0 with an
honest detail string (no fabricated P/B).

## Known failure modes

- Non-monotone catalyst band surprises readers expecting "more growth is
  always more points" — the docstring and detail string state the shape.
- Negative promoter deltas (promo < 25) zero the management pillar.

## Sectors where it does not apply

Negative-equity situations (asset backing unavailable), banks (P/B regime).
