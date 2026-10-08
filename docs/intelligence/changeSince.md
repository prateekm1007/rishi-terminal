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


## Substrate pre-registration: `user_visit_state` (migration 031)

Founder direction for A6 (2026-10-09, verbatim scope): "A6 ChangeSince
(includes the user_visit_state migration + coverage-registry
registration)". This section is committed BEFORE the migration or any
test of it (the A5/A6 precedent). It pins what the table is, the closed
schema, the RLS class, and the coverage contract — a silent change
breaks the build.

### What the table is

The per-user, per-symbol LAST-VISIT cursor: the moment a user last
looked at a symbol's intelligence surface. It is the honest supplier of
`computeChangeSince`'s caller-supplied `since` — a Since-Last-Visit
surface reads the cursor and passes `last_visited_at` as the cutoff.
No row = never visited = no cutoff exists, and the surface reports the
honest empty state (never fabricates a default window).

It is NOT a second history system (rule 14): history remains in A2's
append-only `observation_state_log`; the cursor is user-owned STATE
(current fact about the user), mutable by upsert, and holds exactly
one row per (user, symbol). It is not a change key (A7 owns the
deterministic change key), not an event/materiality/thesis surface
(A3/A4/A5), and has no API route yet (A10 wires consumers; Phase E
surfaces own the write path).

### Closed schema (pinned by test)

| Column | Type | Rule |
|---|---|---|
| `id` | UUID PK | `uuid_generate_v4()` (001's extension, 024's pattern) |
| `user_id` | UUID NOT NULL | inline `REFERENCES users(id) ON DELETE CASCADE` — deletion mode `cascade-via-users` (the L5-02 end-state parser sees the live clause) |
| `symbol` | TEXT NOT NULL | `CHECK (length(trim(symbol)) BETWEEN 1 AND 32)` — the 025/027 canonical-code bound; stored verbatim, normalization is the writer's job |
| `last_visited_at` | TIMESTAMPTZ NOT NULL | `DEFAULT NOW()`; the value that becomes `since` |
| `created_at` | TIMESTAMPTZ NOT NULL | `DEFAULT NOW()` |
| `updated_at` | TIMESTAMPTZ NOT NULL | `DEFAULT NOW()`; maintained by the 024 `touch_updated_at` trigger (reused — the function is defined once, in 024) |

Constraint: `UNIQUE (user_id, symbol)` — one cursor per (user, symbol);
a re-visit is an UPDATE (upsert semantics decided in code, uniqueness
decided here — the screens precedent). No separate `user_id` index:
the UNIQUE btree already leads with `user_id`, and a second index on
the same leading column is redundant weight (documented deviation from
024's `idx_screens_user`).

### RLS class (pinned by test)

This is USER-PRIVATE data — the opposite class from 030's global log.
It uses the 024 screens class exactly: `ENABLE ROW LEVEL SECURITY`
plus four policies `TO authenticated` (`SELECT/INSERT/UPDATE/DELETE`),
each `USING`/`WITH CHECK (auth.uid() = user_id)`. The application
reaches it only through the request's user-scoped client; the
behavioral proof lives in `scripts/ci/rls_invariants.sql` (a
user_visit_state block in the X3-05 style: owner CRUD works, the
other user's rows are invisible, anon is denied).

### Coverage contract (three sources, one truth)

The registration is mechanical, not aspirational (L5-02):

1. `lib/account/coverage.ts`: `{ table: 'user_visit_state',
   migration: '031_user_visit_state.sql', columns: '*',
   deletion: 'cascade-via-users' }` — export reads it (DPDP
   portability), delete erases it via the live FK cascade;
2. `scripts/ci/rls_invariants.sql`: `L5_02_EXPECTED` gains
   `'user_visit_state'` (the live information_schema enumeration must
   equal the registry — both directions enforced);
3. `scripts/ci/account_deletion_invariants.sql`: a fixture row is
   inserted before the auth-user erase and the completeness sweep must
   show zero rows after.

`test/account.delete.test.ts` already fails a migration whose table
ships unregistered; the A6 tests pin the exact entry, the exact
migration contents, and the exact CI wiring on top (fail-first: they
are committed and observed RED before the migration exists).
