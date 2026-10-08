# A6 ChangeSince — deterministic deltas (INT-A6, pre-registration)

Roadmap item A6 (`docs/INTELLIGENCE_ROADMAP.md`: "ChangeSince
(deterministic deltas)"; fit map: `lib/intelligence/changeSince.ts`
consumes previous vs current state, produces deterministic deltas).
Dependencies: A2 (the ONE `observation_state_log` and its readers) and
A3 (the event projection over the same rows — the changeIds here are
the same identities that become `evt:<CATEGORY>:<changeId>`).

This document is committed BEFORE any evaluation (the A5 precedent).
The state rule, the boundary rule, the direction vocabulary, and the
fail-closed table are pinned by test — a silent change breaks the build.

## What this module is

The ONE deterministic delta computation over A2 transition rows: given
the (already fetched) rows for ONE entity and a caller-supplied cutoff
in RECORDED time (`since`), produce the per-field previous-vs-current
deltas with provenance. Pure functions only — no I/O, no clocks (`since`
is caller-supplied), no randomness, no AI path. Same rows + same `since`
→ byte-stable output. A6 never writes; A2's `observation_state_log`
remains the ONE history system (rule 14).

## What this module is NOT

- not a reader: fetching rows is A2's `readStateHistory`/`stateAt`
  (composition happens at A10+; this module is pure over rows);
- not an event projector (A3 owns `projectEvents`) and not a
  materiality engine (A4) or thesis state (A5) — no threshold, no
  direction-of-thesis, no spend gate;
- not a cache (A7 owns the change key).

## Boundary rule (pinned)

- rows with `recordedAt <= since` are BASELINE (they define `from`);
- rows with `recordedAt > since` are the CHANGE WINDOW;
- a row exactly at `since` is BASELINE (the A5 SLO-boundary
  convention, mirrored: boundary-inclusive to the baseline side);
- ordering is `recordedAt` ascending; ties broken by `changeId`
  ascending (deterministic, pinned).

RECORDED time (our timeline) is the axis — the same distinction A2's
readers document; `observedAt` (the upstream clock) is carried
verbatim on the latest row and never used for ordering.

## Per-field delta rule (pinned)

For every field present in the rows (sorted by field name ascending):

| Quantity | Rule |
|---|---|
| `from` | `new_value` of the last baseline row for the field; `null` + `hadBaseline: false` when no baseline row exists (honest unknown, never a zero) |
| `to` | `new_value` of the latest row overall for the field |
| `unit` | the latest row's unit, carried verbatim |
| `delta` | `to - from` when BOTH are finite numbers; otherwise `null` (never coerced — rule 16) |
| `direction` | both numeric: `positive`/`negative` by sign, `unchanged` when equal; non-numeric: `unchanged` when canonically JSON-equal, else `non-comparable`; no baseline: `non-comparable` |
| `transitionsSince` | count of change-window rows for the field |
| `firstChangeId` / `lastChangeId` | changeIds of the first/last change-window row (provenance; `null` when none) |
| `firstRecordedAt` / `lastRecordedAt` | recordedAt of the first/last change-window row (`null` when none) |
| `observedAtLast` | the latest row's `observedAt`, verbatim (`null` when undisclosed — never fabricated) |

## Summary state rule (fixed order, pinned)

1. any fail-closed refusal below -> `UNCLEAR` (empty fields, named detail);
2. zero rows -> `NO-DATA`;
3. no field has `transitionsSince > 0` -> `UNCHANGED`;
4. otherwise -> `CHANGED`.

Totals: `fieldsTracked`, `fieldsChanged` (direction ≠ `unchanged`),
`transitionsSince` (sum over fields).

## Fail-closed table (all named in `detail`, empty fields)

| Input | Treatment |
|---|---|
| empty rows | `NO-DATA` (not a refusal — the honest empty log) |
| mixed-entity rows | refused: `UNCLEAR`, entity null |
| unparseable `since` | refused: `UNCLEAR` |
| unparseable `recordedAt` on any row | refused: `UNCLEAR` (the timeline cannot be ordered) |
| empty `changeId` on any row | refused: `UNCLEAR` (identity is required for provenance) |

## Shape (closed key sets, pinned by test)

- `ChangeSinceResult`: `entity / since / state / fields / totals / detail`
- `FieldChange`: `field / unit / from / hadBaseline / to / delta /
  direction / transitionsSince / firstChangeId / lastChangeId /
  firstRecordedAt / lastRecordedAt / observedAtLast`
- `ChangeSinceTotals`: `fieldsTracked / fieldsChanged / transitionsSince`
- `direction` vocabulary: exactly `positive | negative | unchanged | non-comparable`
- `state` vocabulary: exactly `CHANGED | UNCHANGED | NO-DATA | UNCLEAR`

## Determinism and honesty pins

- same rows + same `since` → byte-stable JSON; inputs never mutated;
- no model/fetch/clock/randomness surface (`since` is caller-supplied);
- values are carried as `unknown` verbatim (jsonb in, jsonb out) —
  never stringified into the delta, never defaulted to 0;
- `delta` is `null` whenever a numeric order does not exist — the
  unknown stays unknown;
- provenance is the log's own `changeId`s (A2 identity), which A3
  already turns into event ids — one identity system, no second one.
