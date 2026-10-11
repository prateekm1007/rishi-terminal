# Round-46 P0-2 — null, never 0; no_verdict on missing inputs (founder audit 2026-10-11)

**Item:** roadmap §6 **P0-2** — "Zeros are scored as facts. KWALITY (0.0x PE,
0.0% ROE) scores 76 … On SBIN, D/E 0.00 is a seed zero. Six Rishis pass on
it, while Nemish Shah returns no verdict on the same input. Fix: use null,
never 0, and return no_verdict on missing inputs."

**Branch:** `fix/p0-2-null-never-zero` · token `P0-2-NULL-NEVER-ZERO` · base
`a57fd225467c` (post-#335).

## What changed (the root fix, one contract)

1. **`lib/scorers/verdictGuards.ts` (NEW)** — the SCORER VERDICT CONTRACT:
   all 20 scorers declare, as data, the numeric fields their verdict
   REQUIRES (`SCORER_VERDICT_CONTRACT`), plus the two mechanics:
   `unknownAmong` (which required fields are placeholder unknowns for THIS
   input — the ScoringContext decides; no context = seed semantics,
   fail-closed) and `noVerdictScore` (the honest null verdict:
   attribution shell preserved, NO fabricated comps, the insight names the
   unknown fields).
2. **All 19 remaining scorers guard at the top** (Nemish already
   implemented the X6 guard in Round 13 — the P0-2 contract generalizes
   its semantics): a placeholder zero in any required field →
   `score: null` before ANY component arithmetic runs. The audit's
   SBIN case is dead: no framework can pass a record on a placeholder
   D/E "debt-free". The KWALITY case is dead: placeholder P/E + ROE
   yield no verdict.
3. **What still scores (the paired guard, C9):** observed data —
   arithmetic unchanged. A LIVE-sourced zero is a real observation (G5:
   genuinely debt-free D/E = 0) and scores; negatives are observations
   (a downturn scores, it does not vanish). Only the placeholder zero is
   refused.

## Measured effect on the seed universe (raw: `p02-population.txt`)

- **649 of 896 stocks remain evaluable** (quorum + finite engine
  consensus); 247 placeholder-heavy panels honestly refuse below the
  12-scorer quorum.
- Per-scorer honest nulls: Nemish 248 (its own X6 guard, unchanged),
  Pabrai 247, Raamdeo 242, … Greenblatt 6.
- Rendered product surfaces are UNCHANGED from P0-1 (the record-level gate
  already suppressed verdicts on the whole seed universe); P0-2 fixes the
  SUBSTRATE the audit pointed at — the per-framework verdicts that cross
  `/api/rishis/[symbol]`, the AI evidence path, and the snapshot/consensus
  engine internals — so the same input now means the same thing to all 20
  frameworks.

## Verification (fail-first, rule 21 — both raw outputs committed)

- **RED** (`red-p02-vitest.txt`): the contract module absent (import-fail)
  — watched before any implementation.
- **GREEN** (`green-p02-battery.txt`): vitest 200 files / 2229 tests PASS
  (+1 file, +10 net: the 10 new P0-2 pins); smoke 54/54 EXIT=0; tsc 0;
  eslint 0/283 ratchet EXACT; encoding/stocks(896)/parity 0;
  aiLoopAudit 8/8; build 0; ISR PASS; bundle within ratchets; `.env` only
  `.env.example`; check:branch PASS.

## Tests retired/re-pinned WITH THE FOUNDER ORDER NAMED (rule 23)

| Test | Change |
|---|---|
| `test/p02.nullNeverZero.test.ts` (NEW) | 10 pins: the contract (closed over the registry, fields exist), the SBIN de/ KWALITY pe+roe no-verdict pins, the no-fabricated-comps shell, the whole-universe "no score rests on a placeholder" property (20 × 896 checks), observed-data positive controls, live-zero observations score |
| `test/scoring.finite.test.ts` | all-zero record → ALL 20 null (stronger than the old mixed-null pin); quorum pin re-anchored on observed data |
| `test/placeholderRanking.round5.test.ts` | Graham on KWALITY → no verdict (the round-5 substance at the root); the cheap-stock P/E pin moved to an observed fixture |
| `test/scorerBoundaries.test.ts` | boundary probes exercise RAMP ARITHMETIC with a live-observed context (`LIVE`), so the provenance guard stays out of the math's way; provenance pinned by the new file |
| `test/scorerHealth.test.ts` | sd floor re-measured on each scorer's EVALUABLE population: 8 → 6 (measured honest minimum Basant 6.30 / Buffett 7.19 / Soros 7.46 — the old spread included placeholder-fabricated extremes; saturation ceilings unchanged) |
| `test/x6.consensusGates.test.ts` | quorum pin: cons = the evaluable population (measured 649 of 896; range-pinned >600) — the old pin measured placeholder-zeros-scored-as-facts |

## Rollback

`git revert` of the branch's two commits; the guards are additive and
revert cleanly to the pre-P0-2 zero-scoring behavior (which P0-1's surface
gate made invisible anyway).

## Post-merge C6 legs (2026-10-11, production serving `827c14a9bb8c`)

Deploy proof: `GET /api/version` → `{"sha":"827c14a9bb8cf4656f085eb6b07286cc68fc2a61",...}`
(poll 2, ~45 s after merge).

P0-2 is an engine-substrate fix — the rendered product surfaces are
unchanged from P0-1, and the production legs prove that regression-free:
SSR legs 15/17 (`p02-production-legs.txt` — the 2 FAILs are the SAME
disclosed flight-payload traps as P0-1's record: dictionary strings +
precomputed client-component data inside `<script>`; payload ≠ rendered)
and hydrated legs 8/8 (`p02-production-hydrated.txt`: NO VERDICT record
visible, hero/QVPS/council invisible, metrics visible, /stocks seed badge,
dashboard disabled panel + no rendered SOD). Substrate intact: thesis
200 ok:true; insight designed-404.

Cadence note: the CI cadence gate (C8) bit twice before the window opened
(runs started 07:23Z and 07:29Z vs the ~07:36Z window anchored at #334's
merge) — honored both times; the in-window rerun at 07:37Z went all-green.
A parallel session merged #336 (P0-1-SMOKE-REPIN: the post-deploy smoke
script re-pinned for the verdict trichotomy, zero file overlap) mid-flight;
#337 was rebased onto it and re-verified on the exact rebased head
(battery 200/2229 + smoke 54/54 locally, all six CI checks green on
`965a596`).

**P0-2 is CLOSED** (merged `827c14a9bb8c` + deployed + live-proven). Next
per the dependency order: P0-3 (sector gate on all 20 scorers).
