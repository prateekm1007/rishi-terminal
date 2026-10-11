# P0-2 — placeholder zeros are never facts (2026-10-11)

## Founder order (audit 2026-10-11, verbatim)

> "Zeros are scored as facts. KWALITY (0.0x PE, 0.0% ROE) scores 76.
> DFL scores 73, EASEMYTRIP 72, DISH 71, and ESAFSFB, HCC, NSLNISP,
> RENUKA, UTKARSHBNK and WATERBASE score 69. On SBIN, D/E 0.00 is a seed
> zero. Six Rishis pass on it, while Nemish Shah returns no verdict on
> the same input. Fix: use null, never 0, and return no_verdict on
> missing inputs."

## What changed

**Data layer** (147 field rewrites in `data/stocks/index.ts`, via the
persisted surgery script):
- `pe: 0` → `null` (68 rows) — P/E zero is impossible for profit-makers
  (51 rows have np > 0) and undefined for loss-makers (17 rows).
- `roe: 0` → `null` (53 rows) — same placeholder class.
- Banking `de: 0` → `null` (22 rows) — deposits are not corporate debt;
  the concept does not apply (the stock page itself hides D/E for banks).
- Banking `opm: 0` → `null` (4 rows) — interest-income structure makes
  OPM inapplicable (the page hides OPM for banks).
- **Plausible zeros preserved**: non-bank `de: 0` (debt-free is real,
  e.g. ABBOTINDIA), `promo: 0` (professionally managed is real, e.g.
  APOLLOHOSP).

**Types**: `Stock.pe/roe/opm/de` → `number | null`; `StockMetrics`
pe/roe/opm/debtToEquity/pb nullable; `SlimStockRow`/`ScreenerPickerRow`/
`RankedStock`/`AiPeerRow`/`ResolvedFieldLike` null-native end to end.
The compiler enumerated every consumer (162 errors → 0).

**Scorers** — all 20 now honor the no-verdict contract through ONE
shared helper (`lib/scorers/unknownInputs.ts`, `inputMissing`):
- null → missing, always;
- `pe <= 0` → missing regardless of provenance (the X6 rule: no input
  set in which a zero/negative P/E is a valuation observation);
- `0` with seed semantics → missing (Y4: the June placeholder); a
  LIVE-sourced 0 IS an observation (G5: debt-free D/E, promoter 0,
  stagnant CAGR) and still scores.
A verdict with a missing required pillar input is `score: null` with
the insufficiency named in the comps and insight — the nemish X6
semantics extended to the whole panel. The founder's named defect ("six
Rishis pass on SBIN's D/E 0.00 while Nemish returns no verdict") is
gone: every D/E consumer nulls on SBIN. Observed-data arithmetic is
byte-unchanged (W4: no cosmetic re-tuning).

**Munger's Inversion Check** can no longer say "PASS: No red flags" on
a D/E nobody observed — missing inputs render NOT ASSESSED.

**Resolver** (`lib/scoring/index.ts`): `pick` genericized (a null seed
resolves to null, never a fabricated 0); the X6 unknownFields builder
treats null seed values as unknown; P/B from an unobserved book is null
(was a typed 0).

**dataQuality**: null is UNKNOWN, not missing — KWALITY (real
opm/roce/de beside the nulls) classifies `seed`; the round-5
impossibility rules still bite on TYPED zeros (synthetic regression
catch).

**AI evidence**: null values emit NO typed fact — nothing downstream
can cite a number that was never observed.

**Validator**: the four fields may be null; the census line pins the
surgery (`pe: 68, roe: 53, de (banking): 22, opm (banking): 4`).

## Fail-first proof (rule 21)

RED on the mounted pre-fix tree — `docs/evidence/round46/red-p02-vitest.txt`:
`npx vitest run test/placeholderZero.noVerdict.test.ts` → **10 failed /
3 passed, EXIT=1** (pe 0 on 68 rows; roe 0 on 53; Banking de 0 on 22;
Banking opm 0 on 4; KWALITY/SBIN/AUBANK probes; the six-Rishi SBIN D/E
pass; the wire serving `pe: 0`; KWALITY classifying missing).

GREEN on the fixed tree: **13/13 passed, EXIT=0**.

## Full Tier-2 battery (GREEN)

See `green-p02-battery.txt` (raw): tsc 0 · vitest **2236/2236** ·
eslint 0 errors / ratchet 283 exact · encoding PASS · validateStocks
all gates + the null census · scoreParity 0/896 · build 1019 pages ·
ISR PASS (896 baked routes) · bundle 159.4/163.4/170.4 kB all OK.

## Rule-23 re-pins (each names the founder order)

| File | Superseded contract | Re-pin |
|---|---|---|
| test/dataQuality.test.ts | KWALITY (pe 0) is missing | KWALITY (pe null) is seed; synthetic typed-zero still missing |
| test/placeholderRanking.round5.test.ts | pe===0 census; Graham zero-points on KWALITY | null census; synthetic typed-zero coverage; null-P/E = no Graham verdict |
| test/registry.aliases.test.ts | all numeric fields finite | finite, or null in the four P0-2 classes |
| test/scorerBoundaries.test.ts | boundary math on ctx-free calls (seed semantics) | observed ctx (empty unknownFields) for boundary math; placeholder behavior pinned in the P0-2 file |
| test/scorerHealth.test.ts | sd >= 8 floors | Basant 6.30 / Buffett 7.49 / Soros 7.46 added to the sanctioned allowlist with measured, dated rationale (floor NOT weakened) |
| test/scoring.admissibility.test.ts | negative BVPS → pb 0 + derived | negative BVPS → pb null (unknown), still derived |
| test/scoring.finite.test.ts | all-zero record keeps 15 valid scorers | all-zero → every scorer nulls, consensus null; RELIANCE keeps the quorum |
| test/x6.consensusGates.test.ts | every seed stock keeps finite consensus | observed slice keeps consensus; placeholder classes null with reason |
| test/x6.nemishPlaceholders.test.ts | SBIN de === 0 | SBIN de === null (same verdict); typed-zero branch pinned synthetically |

## Risk

The wire now serves `pe: null` on 68 records — every consumer was
compiler-enumerated (162 → 0) and the screener/stock/dashboard surfaces
render the em dash through the existing Sourced/DataValue null path
(Y4). The P0-1 gate already suppresses verdict display on seed rows, so
the user-facing delta is the honest `—` where `0.0x` used to render.

## Rollback

`git revert <merge commit>` — the surgery, types and re-pins are one
self-contained range.
