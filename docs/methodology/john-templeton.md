# John Templeton — Maximum Pessimism (John Templeton)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/templeton.ts`

Buy at the point of maximum pessimism: distress multiples, book discounts,
quality, and small size.

## Inputs

- `pe` — price-to-earnings
- `price`, `bvps` — price, book value per share
- `sector` — sector string (quality gate)
- `mktcap` — market capitalisation (Cr)

## Formula

```
pessS = pe <= 10 ? 100 : pe <= 15 ? 80 : pe <= 20 ? 60 : clamp(100 - (pe - 20) * 5)
pb    = price / bvps
discS = pb <= 1 ? 100 : pb <= 1.5 ? 80 : clamp(100 - (pb - 1.5) * 40)
globS = sector contains 'fmcg' or 'pharma' ? 100 : 70
conS  = mktcap <= 100000 ? 100 : mktcap <= 500000 ? 80 : clamp(100 - (mktcap - 500000) / 50000)
score = round(0.35*pessS + 0.30*discS + 0.20*globS + 0.15*conS)
```

## Thresholds

- Pessimism: P/E ≤ 10 → 100; ≤ 15 → 80; ≤ 20 → 60; beyond, −5 per point.
- Discount: P/B ≤ 1 → 100; ≤ 1.5 → 80; beyond, −40 per unit.
- Quality: FMCG/pharma sectors 100, everything else 70 (a sector-string
  gate, not an arithmetic ramp).
- Contrarian: ≤ 1 lakh Cr saturates; ≤ 5 lakh Cr earns 80.

## Rationale

The step discounts encode Templeton's staged buying: full position at
distress levels, partial below them. The fixed 70 for non-defensive
sectors keeps the pessimism pillars dominant.

## Known failure modes

- Negative book value saturates the discount pillar (data artefact, not an
  observation).
- Sector-string matching is literal — a differently-cased or renamed sector
  changes the quality pillar without any change in the business.

## Sectors where it does not apply

Banks (P/B regime differs), and sectors in secular decline where a cheap
multiple is the market being right.
