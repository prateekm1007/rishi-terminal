# Lynch — GARP (Peter Lynch)

Tier: **Legend** · consensus weight: **2.5** · code: `lib/scorers/lynch.ts`

Growth at a reasonable price: the PEG discipline with growth, cash generation
and revenue follow-through.

## Inputs

- `pe` — price-to-earnings ratio
- `epscagr` — EPS CAGR (%)
- `fcf` — free cash flow (Cr)
- `revcagr` — revenue CAGR (%)

## Formula

```
peg   = pe / max(1, epscagr)
pegS  = peg <= 1 ? 100 : peg <= 1.5 ? 70 : clamp(100 - (peg - 1) * 50)
gS    = clamp(epscagr >= 15 ? 100 : epscagr * 6.67)
cfS   = fcf > 0 ? 100 : 0
stS   = clamp(revcagr >= 12 ? 100 : revcagr * 8.33)
score = round(0.30*pegS + 0.25*gS + 0.20*cfS + 0.15*stS + 0.10*50)
```

The 0.10 term is the published **Neutral Base** (a design constant of 50).

## Thresholds

- PEG ≤ 1.0 saturates; ≤ 1.5 earns 70; beyond, −50 points per PEG point.
- EPS CAGR ≥ 15% saturates (×6.67 per point below).
- Free cash flow is binary (positive or not).
- Revenue CAGR ≥ 12% saturates (×8.33 per point below).

## Rationale

Lynch's dictum — the P/E should be paid for by the growth rate — is the PEG
pillar; the binary FCF pillar encodes "companies that burn cash are stories,
not investments"; the revenue pillar checks that earnings growth is not
margin magic alone.

## Known failure modes

- `epscagr` placeholders (0 on the seed) push PEG toward the P/E itself —
  the pillar then prices a no-growth story, which is honest arithmetic but
  not a real observation (revisit under FD-1).
- Cyclical peaks make trailing EPS CAGR flatter the PEG.

## Sectors where it does not apply

Banks (no comparable EPS-CAGR/PEG relationship to capex cycles), deep
turnarounds where trailing growth is negative by construction.
