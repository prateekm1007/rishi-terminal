# Greenblatt — Magic Formula (Joel Greenblatt)

Tier: **Specialist** · consensus weight: **1.0** · code: `lib/scorers/greenblatt.ts`

The Magic Formula: high return on capital bought cheaply, equal-weighted.

## Inputs

- `np` — net profit (Cr)
- `mktcap` — market capitalisation (Cr)

## Formula

```
rocPct = (np / (0.6 * mktcap)) * 100        (return on capital)
eyPct  = (np / mktcap) * 100                (earnings yield)
rocS   = rocPct >= 25 ? 100 : clamp(rocPct * 4)
eyS    = eyPct  >= 10 ? 100 : clamp(eyPct * 10)
score  = round(0.50*rocS + 0.50*eyS)
```

## Thresholds

- ROC ≥ 25% saturates (×4 per point below)
- Earnings yield ≥ 10% saturates (×10 per point below)
- Both pillars 50/50 — no priority between cheap and good.

## Rationale

The 0.6 multiplier on market cap approximates invested capital when
book-equity detail is unavailable, keeping the ROC proxy conservative.
Both pillars derive from the same numerator (net profit) — the formula
is intentionally two views of one quantity.

## Known failure modes

- **The documented low-pile allow-list (scorerHealth):** 26.9% of the seed
  universe scores ≤ 5. That pile is the shape of the PLACEHOLDER SEED —
  many June net-profit placeholders are 0 (the Y4 unknown), which floors
  BOTH pillars by the formula's own arithmetic. It is NOT a verified claim
  about Indian small-cap earnings; re-examine when real fundamentals land
  (FD-1). Re-tuning thresholds to cosmeticise the pile is the "blind
  re-tune" the founder direction forbids.
- `mktcap = 0` makes both yields undefined → the verdict is null.
- 7 of the 246 low-end stocks have np = 0 with a positive mktcap (the
  safeDiv guard does not fire): a known asymmetry, recorded for triage.

## Sectors where it does not apply

Banks (no meaningful invested-capital proxy from market cap), companies
mid-restructuring, and any record whose net profit is a placeholder.
