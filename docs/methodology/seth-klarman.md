# Seth Klarman — Asymmetric Safety (Seth Klarman)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/sethklarman.ts`

Downside first, then asymmetric upside: protection of capital before the
size of the payoff.

## Inputs

- `de` — debt-to-equity
- `fcf` — free cash flow (Cr)
- `pe` — price-to-earnings
- `price`, `bvps` — price, book value per share
- `opm` — operating margin (%)
- `revcagr` — revenue CAGR (%)

## Formula

```
downS  = de <= 0.5 && fcf > 0 ? 100
       : de > 2 || fcf <= 0 ? 20
       : clamp(50 + (de <= 1 ? 25 : 0) + (fcf > 0 ? 25 : 0))
pb     = price / bvps
asymS  = pe <= 15 && pb <= 1.5 ? 100
       : pe > 40 || pb > 3 ? 20
       : clamp(50 + (pe <= 25 ? 25 : 0) + (pb <= 2 ? 25 : 0))
margS  = opm >= 20 ? 100 : clamp(opm * 5)
catS   = revcagr >= 12 ? 100 : clamp(revcagr * 8.33)
score  = round(0.40*downS + 0.30*asymS + 0.15*margS + 0.15*catS)
```

## Thresholds

- Downside (40%): full marks need BOTH low leverage and positive FCF; the
  worst bucket floors at 20.
- Asymmetry (30%): full marks need a cheap earnings multiple AND a cheap
  book multiple; the expensive bucket floors at 20.
- Margin (15%): OPM ≥ 20% saturates (×5 below).
- Catalyst (15%): revenue CAGR ≥ 12% saturates (×8.33 below).

## Rationale

The 40% downside weight is the thesis: Klarman's margin-of-safety framing
puts capital preservation ahead of payoff size. The asymmetry pillar
demands BOTH multiples be undemanding — cheap on earnings alone is not
enough.

## Known failure modes

- Step bands jump at their edges (documented, pinned shapes).
- Negative book value makes the P/B leg of asymmetry saturate — a data
  artefact, not an observation (same caveat as Howard Marks).

## Sectors where it does not apply

Banks and financials (D/E is the business model), negative-equity
situations.
