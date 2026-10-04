# Pabrai — Dhandho Cloner (Mohnish Pabrai)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/pabrai.ts`

Cloning with owner alignment, low risk, and an uncertainty discount.

## Inputs

- `promo` — promoter holding (%)
- `de` — debt-to-equity
- `fcf` — free cash flow (Cr)
- `pe` — price-to-earnings

## Formula

```
cloneS    = clamp(35 + (promo - 35) * (100 / 35))
ownerS    = clamp((promo - 20) * 2.5)
lowRiskS  = clamp(clamp(100 - de * 45) * (fcf > 0 ? 1 : 0.6))
uncertS   = clamp(100 - max(0, pe - 10) * (100 / 30))
score     = round(0.30*cloneS + 0.25*ownerS + 0.25*lowRiskS + 0.20*uncertS)
```

## Thresholds

- Clone: 35 at promoter 35%, 100 from 57.75% (the ramp's exact clamp point).
- Owner: 0 at 20% promoter, 100 from 60%.
- Low risk: the D/E ramp is multiplied by 0.6 when FCF is negative.
- Uncertainty: P/E ≤ 10 saturates; 40+ decays to 0 (×100/30 per point).

## Rationale

Two pillars read the same field (promoter) from different angles — cloning
quality of the reference point and alignment of the operator — which is
deliberate: Dhandho weights WHO is at the helm heavily. The 0.6 haircut
prices "low risk" claims that fail to produce cash.

## Known failure modes

- W4 re-rated the ramps from binary thresholds to graded quantiles (the
  original flat-100 zones compressed 35.6% of the universe at ≥ 95);
  boundaries pinned by test/scorerBoundaries.test.ts.
- Promoter holdings change with pledges/QIPs; the seed's static values age.

## Sectors where it does not apply

Widely-held professional firms where low promoter % is structural, not a
misalignment signal.
