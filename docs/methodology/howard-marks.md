# Howard Marks — Risk Cycle (Howard Marks)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/howardmarks.ts`

Where in the risk cycle does this price sit: leverage and valuation vs
safety, asymmetry and size.

## Inputs

- `de` — debt-to-equity
- `pe` — price-to-earnings
- `fcf` — free cash flow (Cr)
- `roe` — return on equity (%)
- `price`, `bvps` — price, book value per share
- `mktcap` — market capitalisation (Cr)

## Formula

```
cycleS = de <= 0.5 && pe <= 20 ? 100
       : de > 2 || pe > 50 ? 20
       : clamp(50 + (de <= 1.5 ? 25 : 0) + (pe <= 30 ? 25 : 0))
safetyS = fcf > 0 && roe > 10 ? 100 : fcf > 0 ? 70 : 30
pb      = price / bvps
asymS   = pb <= 1.5 ? 100 : pb <= 3 ? 70 : clamp(100 - (pb - 3) * 20)
oppS    = 100000 <= mktcap <= 500000 ? 100
        : clamp(50 + (mktcap >= 50000 ? 25 : 0) + (mktcap <= 800000 ? 25 : 0))
score   = round(0.30*cycleS + 0.25*safetyS + 0.25*asymS + 0.20*oppS)
```

## Thresholds

- Cycle: full marks need BOTH low debt (≤ 0.5) and low P/E (≤ 20); the
  extreme bucket (debt > 2 or P/E > 50) floors at 20, not 0.
- Safety: cash-positive with ROE > 10 saturates; cash-positive alone 70;
  cash-burner 30.
- Asymmetry: P/B ≤ 1.5 saturates; ≤ 3 earns 70; beyond, −20 per unit.
- Opportunity: the 1-5 lakh Cr band saturates; half-marks from the
  neighbouring bands.

## Rationale

The scorer's centre of gravity is "no negative surprise": the cycle pillar
rewards the absence of leverage and valuation extremes simultaneously, and
the safety pillar refuses to give full marks to cash-burners regardless of
returns.

## Known failure modes

- Band pillars are step functions; scores jump at the band edges.
- `bvps <= 0` makes P/B negative — the asymmetry pillar saturates at 100
  (a value artefact of the data, not an observation; revisit under FD-1).

## Sectors where it does not apply

Banks (P/B and D/E mean something structurally different), and
negative-equity situations where P/B is not a valuation instrument.
