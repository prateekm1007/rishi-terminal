# Round-46 P0-1 — the dataQuality verdict gate (founder audit 2026-10-11)

**Item:** roadmap §6 **P0-1** — "Verdicts run on placeholder data the site
itself calls illustrative … Fix: add dataQuality (live, delayed, seed,
missing). Seed rows show no verdict, and the badge reads from that field."

**Branch:** `fix/p0-1-data-quality` · token `P0-1-DATA-QUALITY` · base
`0ca256ef711f` (post-#333 intake).

## What changed (the root fix, one gate)

1. **`lib/dataQuality.ts` (NEW, client-safe — no server-only directive, the
   `freshness.ts` precedent):** the closed vocabulary
   `live | delayed | seed | missing`, the two pure derivations
   (`dataQualityFromSeedStock` — the bare-record path, folding the former
   `assessDataQuality` T11.4 + round-5 impossibility rules verbatim;
   `dataQualityFromResolvedFields` — the per-field-provenance path with a
   caller-injected clock), the gate `verdictsAllowed` (live|delayed →
   verdicts; seed|missing → none), `noVerdictCategory`, and
   `describeDataQuality` (the badge copy).
2. **`getStockScore` (lib/scoring/index.ts) is THE verdict gate:** it
   derives the quality mechanically and, when blocked, returns
   `consensus: null` + the no-verdict category. Nothing can render a stock
   verdict without passing through the ONE scoring surface, so nothing can
   render a verdict on seed data. The per-framework `scores` substrate is
   untouched (P0-2/P0-3/P0-4 operate on it).
3. **The engine (buildConsensus) labels its input honestly** (ctx-declared
   or bare-derived dataQuality) but does not gate — engine math tests stay
   intact; the parity barrel path compares through the same gate.
4. **Surfaces:** stock page (consensus line, hero, QVPS tile, top-scores
   card, wisdom tab, knowledge-graph button/modal, sidebar scores, council
   mount) suppressed on seed data and replaced by the new
   `NoVerdictRecord`; the whole-page `InsufficientDataRecord` now keys on
   `missing` only (preserved semantics); metadata titles honest per state.
5. **/stocks:** the row badge reads `dataQuality` ("seed · no verdict" /
   "no data · no verdict" chip); stat pills count verdict-allowed rows
   only (honestly 0 today); the screener parser label names the new
   vocabulary; CSV export columns unchanged (values flow).
6. **Dashboard:** rankTopBuy/computeShortRadar pools are verdict-allowed
   only; `pickStockOfTheDay` returns the honest null (no more throw) — the
   ranked trio renders the existing disabled panel; SOD commentary flow
   null-safe. Nightly snapshots (rishiMemory) snapshot through
   `getStockScore` — the historical series can never again receive a seed
   verdict.
7. **The badge lie (rule 2):** QVPS `RishiScoreResult.dataQuality`
   ("HIGH/MEDIUM/LOW" — actually a field-coverage ratio, rendered as
   "v2.0 · HIGH Data" beside "illustrative seed inputs") renamed to
   `coverage` (`getCoverage`); the badge now renders
   "v2.0 · coverage <grade> · <describeDataQuality>" from the canonical
   field. The audit's named defect ("v2.0 · HIGH Data beside illustrative
   seed inputs") is dead at the root.
8. **Slim wire:** rows carry the closed vocabulary; topBull/topBear/
   summaryScores are withheld at the payload boundary for blocked records
   (lab tabs and the chat picker render honest nulls via existing
   fallbacks).

## Verification (fail-first, rule 21 — both raw outputs committed)

- **RED** (`docs/evidence/round46/red-p01-vitest.txt`): module absent
  (3 import-fails) + 4 behavioral failures — SBIN ranked top-buy, CDSL
  short radar, HGINFRA Stock-of-the-Day at 78, all fabricated from seed
  data. `Test Files 4 failed | 2 passed (6)` / `Tests 4 failed | 56 passed
  (60)` / VITEST_EXIT=1.
- **GREEN** (`docs/evidence/round46/green-p01-battery.txt`): vitest 199
  files / 2219 tests PASS (base 2218 → +1 net: the new dataQuality pins
  minus the named re-pins); smoke 54/54 EXIT=0; tsc 0; eslint 0 errors /
  283 warnings = baseline EXACT; encoding/stocks(896)/parity
  ("0 mismatches / 0 non-finite of 896") clean; build 0; ISR PASS; bundle
  within ratchets; `.env` only `.env.example`; check:branch PASS.

## Tests retired/re-pinned WITH THE FOUNDER ORDER NAMED (rule 23)

Every change below names the order ("P0-1: seed rows show no verdict,
founder audit 2026-10-11") in its file:

| Test | Change |
|---|---|
| `test/dataQuality.test.ts` (NEW) | 18 pins: vocabulary, gate, derivations (seed/missing/live/delayed/mixed), engine label, whole-universe verdict-block, client-safety |
| `test/rankings.test.ts` | re-pinned: empty ranked pools, deterministic nulls, SOD null (was: 6 candidates + throw) |
| `test/scoring.finite.test.ts` | INCOMPLETE → missing/seed vocabulary (engine math pins untouched) |
| `test/placeholderRanking.round5.test.ts` | impossibility rules → "missing"; ranking-exclusion pins → the honest-empty form; SBIN coherence pin → no-verdict category |
| `test/scoring.parity.test.ts` | barrel path compared through the SAME gate + a whole-universe null-parity pin |
| `test/c5.wireIndex.test.ts` | transport pins re-derived: legend honestly empty, lossless round-trip, no-payload-blowup bound (measured +21 B on ~273 kB) |
| `test/screener.parser.test.ts` | fixture value 'OK' → 'seed' |
| `test/rishiMemory.batch.test.ts` | NEW load-bearing pin: ZERO writes on the seed universe (history never corrupted); batching/idempotency/error pins conditional (exercised in NS1's round, reactivate with verdict-allowed data) |
| `test/shortRadar.rationale.test.ts` | radar honestly empty; flag-mechanics honesty pins stay live |
| smoke: `smoke.spec.ts` (×2), `ssr-content.spec.ts`, `b1-panel-removed.spec.ts`, `dossier-removed.spec.ts`, `dashboard-brief-removed.spec.ts` | positive controls moved to the honest states (NO VERDICT record / "Ranked picks are disabled"); verdict-tile sections pinned ABSENT from the seed page's first byte; council smoke controls re-pinned (the council is verdict content) |

## Escalations recorded (rule 31, unchanged)

P0-6 counsel review and P0-8 data licensing remain FOUNDER DECISION NEEDED
(`docs/evidence/round46/audit-intake.md` §4); unblocked work continued.

## Rollback

`git revert` of the branch's two commits (RED pins + the gate); the gate
additive-reverts to the previous OK|INCOMPLETE behavior.

## Post-merge C6 legs (2026-10-11, production serving `3c1f096bf92b`)

Deploy proof: `GET /api/version` → `{"sha":"3c1f096bf92ba981e551e01b139a1ec4be13931c",...}`
(poll 2, ~45 s after merge; the first poll still served the prior build `d824ed9c…`).

SSR legs (`p01-production-legs.txt`, 15/17 PASS): NO VERDICT record + dataQuality
disclosure IN the first byte of /stock/RELIANCE; consensus hero / QVPS
commentary / pillar breakdown ABSENT; MetricsPanel + peers still render;
KWALITY serves the whole-page INSUFFICIENT DATA record; /stocks carries 845
"seed · no verdict" chips (the remaining 51 rows are the "missing" records —
all-zero/impossible — with their own "no data · no verdict" chip; 845 + 51 =
896); dashboard renders the disabled ranked-picks panel; substrate intact
(capability=thesis 200 ok:true; capability=insight the designed 404 — zero spend).

The two raw byte-grep FAILs are the flight-payload trap, disclosed: the RSC
payload inside `<script>` carries (a) the i18n dictionary ("TOP BUY SIGNALS",
"STOCK OF THE DAY") and (b) precomputed data for suppressed client components
(PhilosophyRadar's philosophyDivergence, QVPS dual results). Payload ≠ rendered
content — the hydrated legs are the user-facing truth.

Hydrated legs (`p01-production-hydrated.txt`, 8/8 PASS, screenshots in
`screens/`): NO VERDICT record VISIBLE; consensus hero / QVPS tile / council
NOT visible; labelled metrics visible; "seed · no verdict" badge visible on
/stocks; the disabled ranked-picks panel visible and NO rendered
Stock-of-the-Day section on the dashboard. Screenshots:
`p01-stock-reliance.png`, `p01-stocks.png`, `p01-dashboard.png`.

Follow-up recorded (NOT this item's scope, queued for the next relevant PR):
the payload trim — when a record is verdict-blocked the server could pass
`qvpsDual`/`eliteGraph` as null so the suppressed components' data never
crosses the wire (bytes + consistency; zero rendering impact — the components
already gate on `allowed`).

**P0-1 is CLOSED** (merged `3c1f096b` + deployed + live-proven). Next per the
dependency order: P0-2 (null-never-0 + no_verdict on missing inputs).
