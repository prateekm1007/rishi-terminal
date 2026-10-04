# Munger — Mental Models (Charlie Munger)

Tier: **Master** · consensus weight: **2.0** · code: `lib/scorers/munger.ts`

Four filters in the Munger spirit: competence circle, inversion, lollapalooza
quality convergence, and patience.

## Inputs

- `roce` — return on capital employed (%)
- `roe` — return on equity (%)
- `de` — debt-to-equity ratio
- `fcf` — free cash flow (Cr)
- `promo` — promoter holding (%)

## Formula

```
circleS    = (roce >= 25 && de <= 0.5) ? 100 : clamp(roce * 2 + (de <= 0.5 ? 50 : 0))
inversionS = (de > 2 || fcf < 0) ? 0 : 100
lollaS     = (roe >= 20 && roce >= 20) ? 100 : clamp((roe + roce) * 2)
patienceS  = (promo >= 40) ? 100 : clamp(promo * 2.5)
score      = round(0.30*circleS + 0.25*inversionS + 0.25*lollaS + 0.20*patienceS)
```

## Thresholds

- Circle: ROCE ≥ 25% with D/E ≤ 0.5 saturates; otherwise ROCE scales ×2 with
  a +50 balance bonus for low debt.
- Inversion is binary: high debt (D/E > 2) or negative FCF fails the pillar
  outright (0).
- Lollapalooza: ROE and ROCE both ≥ 20% saturate; the ramp is their sum ×2.
- Patience: promoter ≥ 40% saturates (×2.5 below).

## Rationale

Inversion ("avoid stupidity first") is deliberately binary — one disqualifying
fact zeroes a quarter of the verdict. The circle filter rewards businesses
that earn high returns on modest leverage, which is where competence is
plausible to claim from the outside.

## Known failure modes

- The seed's D/E placeholders (banks) make the inversion pillar read a
  placeholder zero — treated as unknown by the X6 provenance contract only
  for scorers that consume it as such; Munger's arithmetic still consumes the
  numeric value (revisit under FD-1).
- Binary pillars make the verdict jump near the boundaries; the score is
  honest but step-shaped there.

## Sectors where it does not apply

Banks and financials (D/E is structural, not a red flag at 2+), companies
with negative working-capital models that run persistent accounting FCF
losses by design.
