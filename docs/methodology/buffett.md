# Buffett — Quality Moat (Warren Buffett)

Tier: **Legend** · consensus weight: **3.0** · code: `lib/scorers/buffett.ts`

Owner-earnings quality: durable returns on equity, a wide operating moat, real
owner earnings relative to market value, and management with skin in the game.

## Inputs

- `roe` — return on equity (%)
- `opm` — operating profit margin (%)
- `np`, `dep`, `capex` — net profit, depreciation, capital expenditure (Cr)
- `mktcap` — market capitalisation (Cr)
- `promo` — promoter holding (%)

## Formula

Five pillars, each a 0-100 sub-score, combined by fixed weights:

```
roeS    = clamp(roe >= 20 ? 100 : roe * 5)
moatS   = clamp(opm >= 20 ? 100 : opm * 5)
oe      = np + dep - 0.7 * capex          (owner earnings)
oeY     = oe / mktcap                      (owner-earnings yield, %)
oeS     = oeY >= 8 ? 100 : clamp(oeY * 12.5)
mgS     = clamp(promo >= 30 ? 100 : promo * 3.33)
score   = round(0.30*roeS + 0.25*moatS + 0.20*oeS + 0.15*mgS + 0.10*50)
```

The 0.10 term is the published **Neutral Base** (a design constant of 50),
shown as a component in the breakdown since S2-05.

## Thresholds

- ROE ≥ 20% saturates its pillar (linear below, ×5 per point)
- OPM ≥ 20% saturates the moat pillar (×5 per point)
- Owner-earnings yield ≥ 8% saturates (×12.5 per point)
- Promoter ≥ 30% saturates (×3.33 per point)

## Rationale

The implementation encodes Buffett-flavoured quality: equity returns sustained
at high-teens+ imply a durable advantage; owner earnings (net profit plus
depreciation minus an assumed 70% maintenance share of capex) approximate
distributable cash; heavy insider ownership aligns management. The neutral
base caps how punitive a single missing pillar can be.

## Known failure modes

- `mktcap = 0` makes the owner-earnings yield undefined → verdict is null
  ("insufficient data"), never 0.
- On the placeholder seed (FD-1 pending), zero `np`/`dep`/`capex` fields are
  the documented unknowns, not observations — the seed caps this scorer's
  honesty until real fundamentals land.
- The 70%-of-capex maintenance assumption is a modelling constant, not a
  per-company measurement.

## Sectors where it does not apply

Banks and financials (no meaningful capex/owner-earnings split; OPM
semantics differ), pre-profit companies, and asset-light businesses whose
depreciation is small relative to true reinvestment.
