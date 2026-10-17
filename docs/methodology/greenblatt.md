# Greenblatt — Magic Formula (Joel Greenblatt)

Tier: **Specialist** · consensus weight: **1.0**

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
book-equity detail is unavailable. It is a PROXY, and its direction must
be stated honestly (founder audit 2026-10-11): dividing by 0.6 × mktcap
reads the ROC ~1.67× HIGHER than a plain earnings yield on the same
numerator — it INFLATES the ROC pillar, it does not keep it
conservative. The saturation threshold (25%) partially absorbs the lift,
and the proxy is disclosed as a proxy on every surface that renders it.
Both pillars derive from the same numerator (net profit) — the formula
is intentionally two views of one quantity, which is exactly why the
ROC view cannot claim more precision than the yield view it rescales.
The honest reading of the combined score: a smoothed earnings-yield
rank with a steeper ramp, not a measured return on invested capital.

## Known failure modes

- **Placeholder net profits yield no verdict:** on the sample dataset,
  unobserved net-profit values null the verdict rather than flooring both
  pillars — a missing number is never scored as a bad one. That pile of
  no-verdicts is the shape of the placeholder data, NOT a verified claim
  about Indian small-cap earnings; re-examine when real fundamentals
  land. Re-tuning thresholds to cosmeticise the pile is the "blind
  re-tune" the founder's direction forbids.
- `mktcap = 0` makes both yields undefined → the verdict is null.
- Net profit of exactly 0 with a positive market cap is computed (both
  yields 0): for live data that is a real observation of a zero-profit
  year; on the placeholder dataset such rows yield no verdict instead.

## Sectors where it does not apply

Banks (no meaningful invested-capital proxy from market cap), companies
mid-restructuring, and any record whose net profit is a placeholder.
