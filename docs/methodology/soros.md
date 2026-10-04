# George Soros — Reflexivity Macro (George Soros)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/soros.ts`

The contrarian-momentum pair: is the crowd wrong about value, and is the
macro confirming?

## Inputs

- `ca`, `tl`, `sh` — current assets, total liabilities, shares
- `price` — share price
- `revcagr`, `epscagr` — growth (%)
- `de` — debt-to-equity

## Formula

```
ncav   = (ca - tl) / sh
reflexS = ncav <= 0 ? 0 : clamp(130 - (price / ncav) * 20)
macroS = clamp(revcagr * 5)
deS    = clamp(100 - max(0, de - 0.5) * 50)
momS   = clamp(epscagr * 4)
liqS   = tl <= 0 ? 0 : clamp(50 + ((ca / tl) - 1) * 50)
score  = round(0.30*reflexS + 0.25*macroS + 0.15*deS + 0.20*momS + 0.10*liqS)
```

## Thresholds

- Reflexivity saturates at Price/NCAV ≤ 1.5 (130 − 20×1.5 clamps at 100);
  0 for Price/NCAV ≥ 6.5.
- Macro: revenue CAGR ×5 (0 at 0, 100 at 20%).
- Leverage: full marks at D/E ≤ 0.5; 0 at 2.5.
- Momentum: EPS CAGR ×4 (0 at 0, 100 at 25%).
- Liquidity: current ratio 1 → 50, 2 → 100; `tl <= 0` is nonsensical
  balance-sheet data → 0 with an honest detail string.

## Rationale

Reflexivity is measured against a POSITIVE net current asset value only:
when no asset anchor exists, the premise is unavailable and the component
says so (rule 3) — the pre-W4 code masked this behind `max(1, ncav)` and
fabricated a ratio. The momentum pillar is the trend-confirmation leg of
the reflexivity pair.

## Known failure modes

- 37 of 916 seed rows (4.0%) hit the NCAV ≤ 0 branch — the component
  scores 0 and the detail says why (pinned by scorerBoundaries).
- Reflexivity against NCAV is meaningless for asset-light businesses.

## Sectors where it does not apply

Services and IP-driven businesses with negligible current-asset anchors.
