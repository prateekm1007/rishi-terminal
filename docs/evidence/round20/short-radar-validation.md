# Short Radar model validation — round 20 results (2026-10-06)

Founder directions 2026-10-06 (Short Radar). Contract (pre-registered):
`docs/evidence/round20/short-radar-validation-contract.md` — criteria P1–P10
and the real-historical criterion R1 were fixed and committed (b5d6e3a)
BEFORE the first battery run; pre-run amendments A1/A2 and pre-merge A3 are
recorded there.

Verdict: **the repaired qvps-short-v2 model is honestly UNVALIDATED** —
P2/P3/P7 remain unmet on the pre-registered thresholds, so the UI renders
the contract's `unvalidated` wording. The structural defects the founder's
audit exposed (direction 3) are fixed and mechanically gated.

## 1. Battery raw output (canonical S2-02 engine; short world seed 20261006)

v1 (RED, commit 471ebbe — fail-first):

```
[short-radar-battery] gated n @shuffle date=98 | modelShortIC=0.0558 heuristicShortIC=0.0528 delayedShortIC=0.0223
[short-radar-battery] pillarIC={"overvaluation":0.0199,"fundamentalDecay":0.0585,"governanceRisk":null,"moatDestruction":null,"growthMirage":null,"catalyst":null} maxPairCorr=0.0674 | cagr base=-0.0873 survivors=-0.0542
[short-radar-battery] fixture=31.08 seedBands=["DANGEROUS_SHORT"]
Tests: 6 failed | 9 passed  (P2, P3, P7 strict-red; P10 rationale red ×2)
```

v2 (repaired):

```
[short-radar-battery] gated n @shuffle date=98 | modelShortIC=0.0803 heuristicShortIC=0.0528 delayedShortIC=0.0271
[short-radar-battery] shuffledMeanAbs=0.0814 bound=0.0914 | halves 0.0803 vs 0.0802 | epochs=[0.0836,0.0706,0.1026,0.0594]
[short-radar-battery] pillarIC={"overvaluation":0.0199,"fundamentalDecay":0.0822,"governanceRisk":0.0626,"moatDestruction":null,"growthMirage":null,"catalyst":null} maxPairCorr=0.2738 | cagr base=-0.1314 survivors=-0.0991
[short-radar-battery] fixture=100.00 seedBands=["DANGEROUS_SHORT"] meanTop3SameSector=0.5104 (dates=96)
Tests: 158 files / 1596 tests passed (P2/P3/P7 enforced via artifact truthfulness; see contract §3 note)
```

Criterion results for v2:

| Criterion | Result | Evidence |
|---|---|---|
| P1 harness validity | PASS | prophet shortIC > 0.999; shuffled meanAbs 0.0814 < 0.0914 (= 0.9/sqrt(97)) |
| P2 information ≥ 0.10 and ≥ heuristic + 0.05 | **FAIL** | 0.0803; beats heuristic by +0.0275 < 0.05 |
| P3 combination ≥ best pillar + 0.02 | **FAIL** | 0.0803 vs fundamentalDecay 0.0822 (dilution: overvaluation pillar IC 0.0199) |
| P4 stability | PASS | halves 0.0803 / 0.0802 |
| P5 look-ahead decay ≥ 0.03 | PASS | 0.0803 − 0.0271 = 0.0532 |
| P6 survivorship direction | PASS | survivor-only CAGR −0.0991 vs honest −0.1314 (+3.2 pp) |
| P7 fixture ≥ 90; seed census ≥ 2 bands | **FAIL** | fixture 100.00 PASS; seed census 1 band (no seed stock reaches TACTICAL_SHORT) |
| P8 regimes ≥ 3/4 | PASS | 4/4 epochs positive |
| P9 concentration ≤ 2/3 | PASS | mean top-3 same-sector 0.5104 over 96 dates |
| P10 rationale traceability | PASS | test/shortRadar.rationale.test.ts (5/5) |
| R1 real-historical OOS | **OPEN** | requires licensed point-in-time NSE fundamentals (D1-04/D1-05, FD-1) |

Reading of P3: the overvaluation pillar contributes almost no incremental
information on the pre-registered world (IC 0.0199) and dilutes the
combination below its best pillar. Whether that is a world-range artifact
(the DGP's PE dispersion is narrower than the model's cutoffs were designed
for) or a genuine model defect is exactly what R1 on real licensed data
must adjudicate. Per direction 7, weights were NOT tuned to improve it.

## 2. Product-path before/after (the founder's screenshot)

BEFORE (v1, main @ 25dec82) — `scripts/shortRadarProbe.ts`:

```
DELHIVERY  score=15.76  reason="Negative FCF (...); Low promoter skin-in-game (promoter holding 22.6%)"
GMRAIRPORT score=15.75  reason="High leverage (D/E 3.00x above 2x); Negative FCF (...)"
NAZARA     score=15.55  reason="Overvaluation (P/E 85.0x above 40x); Low promoter skin-in-game (promoter holding 0.0%)"
```

Defects proven: DELHIVERY's "promoter skin-in-game" and GMRAIRPORT's "D/E"
contributed 0.00 to their scores (dead pillars); NAZARA's "0.0%" was a seed
PLACEHOLDER rendered as a fact; catalyst was a constant +1.00 for everyone;
max reachable score 48/100 (all conviction bands unreachable).

AFTER (v2):

```
CDSL      score=42.19  flags=2  reason="Overvaluation (P/E 55.0x above 40x); Low promoter skin-in-game (promoter holding 20.1%)"
MAXHEALTH score=40.25  flags=2  reason="Overvaluation (P/E 72.0x above 40x); Low promoter skin-in-game (promoter holding 23.2%)"
NTPCGREEN score=39.25  flags=2  reason="Overvaluation (P/E 85.0x above 40x); High leverage (D/E 4.50x above 2x)"
```

Every displayed flag now maps to a scoring feature with exactly traceable
contributions (CDSL: overvaluation 29.75 + governance 12.44 = 42.19;
NTPCGREEN: 19.25 + 20.00 = 39.25). The P10 test enforces this mechanically
(leave-one-field-out must strictly reduce the score).

## 3. Status contract and wording (directions 9–12, 15)

- `lib/shortRadarValidation.ts` — checked-in claims (current: P10 true,
  P2/P3/P7 false, R1 open) re-verified against a fresh battery run on every
  CI pass; a false claim was shown to fail the suite (gate-bite proof in
  the PR).
- `lib/modelStatus.ts` — claims → status → EXACT copy. Current rendered
  banner suffix: "Research signal — QVPS short screen v2 — model not
  validated; inputs seed-derived. Not investment advice."
- The old hardcoded "ranked by QVPS short screen (unvalidated model) from
  actual trigger flags" is deleted; the direction-15 source pin fails if it
  (or any hardcoded status wording) returns. Fail-first: the pin ran red
  against the pre-fix component (2 failed), green after the fix.

## 4. Latency (direction 17)

```
v1: median cold 19.56 ms | median warm 17.97 ms   (npx tsx --conditions react-server scripts/shortRadarTiming.ts)
v2: median cold 24.11 ms | median warm 21.38 ms
```

Pure computation, no new provider or model call; Δ ≈ +4.5 ms cold for the
whole 916-symbol path — inside the existing performance floor (the QVPS
memo cache still serves the warm path).

## 5. Gates run before merge

- `npx tsc --noEmit` → 0
- `npx eslint .` → 0 errors; `npm run lint:ratchet` → 284 = baseline
  (one pre-existing unused-import warning on main removed to satisfy the
  ratchet — test/x7.challenge.test.ts)
- `npx vitest run` → 158 files / 1596 tests passed
- `npm run validate:encoding` → pass; `scripts/validateStocks.ts` → 916 OK;
  `scripts/scoreParity.ts` → 0 mismatches
- `npm run build` → exit 0 (ISR manifest + bundle budget gates pass)

## 6. What would change the status

The status rises to `structure-evaluated` (and the wording with it) only
when P2/P3/P7 pass a fresh battery run — for P2/P3 that most plausibly
requires REAL data: R1 (licensed point-in-time NSE fundamentals, FD-1) is
pre-registered and open. Until then the radar remains what its banner says:
a research signal ranked by a model that has not been validated against
historical outcomes, on seed-derived inputs — not investment advice.
