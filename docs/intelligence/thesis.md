# A5 Thesis-state model — deterministic evidence ledger (INT-A5)

Roadmap item A5 (`docs/INTELLIGENCE_ROADMAP.md` section 5; founder
direction "A5 Thesis-state model"). Implementation:
`lib/intelligence/thesis.ts`. Tests: `test/intelligenceThesis.test.ts`.

## Pre-registered contract (founder direction, verbatim semantics)

`lib/intelligence/thesis.ts`: `supports[]`, `weakens[]`, `conflicts[]`,
`invalidators[]`, a deterministic state (`IMPROVING`, `MIXED`,
`DETERIORATING`, `UNCLEAR`) from weighted material evidence and
freshness. **The model never chooses the state** — the module accepts no
state input and ignores any model-supplied field riding on its inputs.

## Pre-registered state rule (fixed order, pinned by test)

Given the fresh, material, direction-bearing evidence ledgers:

1. any fresh invalidator present -> `UNCLEAR` (a broken premise supports
   no direction claim). Unreachable until the founder confirms
   invalidator rules — `THESIS_INVALIDATOR_RULES` is intentionally EMPTY
   (same totality pattern as A3's `seed -> low` confidence branch);
2. both support and weaken evidence present -> `MIXED`
   (the founder's synthetic case: growth up + margin down + price up
   -> MIXED);
3. only support evidence -> `IMPROVING`;
4. only weaken evidence -> `DETERIORATING`;
5. neither -> `UNCLEAR` (fail-closed empty state).

Conflicts are recorded as same-category opposite-direction pairs (fresh,
material). Opposite directions across DIFFERENT categories are ledger
opposition, not a conflict pair.

## Pre-registered direction rules (category -> ledger)

| Category | Rule |
|---|---|
| PRICE | sign of the carried move: positive -> support, negative -> weaken, zero/unscalable -> directionless |
| FUNDAMENTAL | same sign rule (the synthetic world's growth/margin evidence) |
| GUIDANCE | same sign rule |
| EARNINGS | same sign rule |
| every other A3 category | DIRECTIONLESS by default — no invented semantics; a direction rule is added only as a future pre-registered extension |

Directionless and unclassifiable evidence contributes to NO ledger
(weight 0) and never blocks other evidence. Magnitude weighting is NOT
pre-registered: the weight axis is exactly materiality (1/0), freshness
(1/0), direction (+/-/0) with uniform weight 1 per qualifying item — no
founder numbers exist for magnitude weights, so none is invented.

## Fail-closed table (all excluded from ledgers, all named in `detail`)

| Input | Treatment |
|---|---|
| non-material A4 verdict | excluded (the economic gate: no AI-eligible evidence) |
| seed-derived source state | excluded, defence-in-depth (A3 already refuses) |
| unavailable source state | excluded |
| stale event (caller-stated `freshness.maxAgeMs`, caller clock `asOf`) | excluded |
| unorderable clocks | excluded (`non-comparable`) |
| mixed-entity input | refused fail-closed: `UNCLEAR`, entity null, empty ledgers |
| empty input | `UNCLEAR`, entity null |

## Shape (closed key sets, pinned by test)

- `ThesisState`: `entity / state / supports / weakens / conflicts / invalidators / detail`
- `ThesisEvidenceItem`: `eventId / category / field / direction / observedAt`
- `ThesisConflict`: `category / positiveEventId / negativeEventId`

Input is `(A3 event, A4 verdict)` pairs — the module consumes the ONE
materiality engine's verdicts and never re-decides materiality. No I/O,
no clocks (`asOf` is caller-supplied), no randomness, no model surface;
pure functions only; same inputs -> byte-stable output.
