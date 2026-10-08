// lib/intelligence/changeSince.ts (INT-A6, roadmap item A6) — THE
// DETERMINISTIC DELTA COMPUTATION over the temporal memory log.
//
// Roadmap: "ChangeSince (deterministic deltas)" — consumes previous vs
// current state (A2 `StateLogRow`s, already fetched by A2's readers)
// and produces the per-field previous-vs-current deltas with
// provenance. Pre-registration: docs/intelligence/changeSince.md
// (committed before any evaluation). The boundary rule, the per-field
// delta rule, the state rule, and the fail-closed table are pinned by
// test — a silent change breaks the build.
//
// What this module is:
//   - the ONE delta computation over A2 rows (rule 14): same rows +
//     same `since` -> byte-stable result; rows are ordered by the
//     pre-registered rule, never trusted in input order;
//   - pure functions only — no I/O (fetching is A2's
//     `readStateHistory`/`stateAt`), no clocks (`since` is
//     caller-supplied), no randomness, no AI path;
//   - A2-native provenance: the changeIds here are the same
//     identities A3 turns into `evt:<CATEGORY>:<changeId>` — one
//     identity system, no second one.
//
// What this module is NOT:
//   - not a reader (A2 owns the table and its queries);
//   - not an event projector (A3), materiality engine (A4), or thesis
//     state (A5) — no threshold, no thesis direction, no spend gate;
//   - not a cache (A7 owns the deterministic change key);
//   - not a writer: A2's `observation_state_log` remains the ONE
//     history system; this module never stores its result.

import type { StateLogRow } from "./stateLog";

// ── the closed vocabularies (pre-registered, pinned by test) ────────────────

export const CHANGE_SINCE_STATES = [
  "CHANGED",
  "UNCHANGED",
  "NO-DATA",
  "UNCLEAR",
] as const;
export type ChangeSinceStateName = (typeof CHANGE_SINCE_STATES)[number];

export const FIELD_DIRECTIONS = [
  "positive",
  "negative",
  "unchanged",
  "non-comparable",
] as const;
export type FieldDirection = (typeof FIELD_DIRECTIONS)[number];

// ── shapes (closed key sets, pinned by test) ────────────────────────────────

export interface FieldChange {
  field: string;
  /** The latest row's unit, carried verbatim. */
  unit: string;
  /** Baseline new_value; null + hadBaseline false when the field had no
   *  baseline row at the cutoff (honest unknown — never a zero). */
  from: unknown;
  hadBaseline: boolean;
  /** The latest row's new_value. */
  to: unknown;
  /** to - from when BOTH are finite numbers; otherwise null (rule 16). */
  delta: number | null;
  direction: FieldDirection;
  transitionsSince: number;
  /** changeIds of the first/last change-window row (null when none). */
  firstChangeId: string | null;
  lastChangeId: string | null;
  firstRecordedAt: string | null;
  lastRecordedAt: string | null;
  /** The latest row's observedAt, verbatim (null when undisclosed). */
  observedAtLast: string | null;
}

export interface ChangeSinceTotals {
  fieldsTracked: number;
  fieldsChanged: number;
  transitionsSince: number;
}

export interface ChangeSinceResult {
  entity: string | null;
  since: string;
  state: ChangeSinceStateName;
  fields: FieldChange[];
  totals: ChangeSinceTotals;
  detail: string;
}

export interface ChangeSinceOptions {
  /** Caller-supplied cutoff in RECORDED time (ISO). The module keeps
   *  no clock; an unparseable value is refused fail-closed. */
  since: string;
}

// ── internals ───────────────────────────────────────────────────────────────

const EMPTY_TOTALS: ChangeSinceTotals = {
  fieldsTracked: 0,
  fieldsChanged: 0,
  transitionsSince: 0,
};

function refused(detail: string, since: string): ChangeSinceResult {
  return {
    entity: null,
    since,
    state: "UNCLEAR",
    fields: [],
    totals: { ...EMPTY_TOTALS },
    detail: `changeSince: ${detail}`,
  };
}

/** Canonical JSON for equality of non-numeric values (deterministic). */
function canonicalOf(v: unknown): string {
  return JSON.stringify(v ?? null);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** The pre-registered ordering: recordedAt ascending, ties by changeId
 *  ascending. Pure — returns a new array; never mutates the input. */
function orderedRows(rows: readonly StateLogRow[]): StateLogRow[] {
  return [...rows].sort((a, b) => {
    const at = a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0;
    if (at !== 0) return at;
    return a.changeId < b.changeId ? -1 : a.changeId > b.changeId ? 1 : 0;
  });
}

// ── the deterministic delta computation ─────────────────────────────────────

export function computeChangeSince(
  rows: readonly StateLogRow[],
  opts: ChangeSinceOptions,
): ChangeSinceResult {
  const since = opts.since;
  if (!Number.isFinite(Date.parse(since))) {
    return refused("unparseable since — timeline cutoff is required", since);
  }

  if (rows.length === 0) {
    return {
      entity: null,
      since,
      state: "NO-DATA",
      fields: [],
      totals: { ...EMPTY_TOTALS },
      detail: "changeSince: state=NO-DATA (no rows)",
    };
  }

  // Fail-closed input guards (whole-timeline refusals).
  const entity = rows[0]?.entity ?? null;
  for (const row of rows) {
    if (row.entity !== entity) {
      return refused("mixed-entity rows refused fail-closed", since);
    }
    if (!Number.isFinite(Date.parse(row.recordedAt))) {
      return refused(`unparseable recordedAt on row ${row.changeId}`, since);
    }
    if (!row.changeId) {
      return refused("empty changeId — identity is required for provenance", since);
    }
  }

  const ordered = orderedRows(rows);
  const byField = new Map<string, StateLogRow[]>();
  for (const row of ordered) {
    const list = byField.get(row.field);
    if (list) list.push(row);
    else byField.set(row.field, [row]);
  }

  const fields: FieldChange[] = [];
  for (const field of [...byField.keys()].sort()) {
    const list = byField.get(field) as StateLogRow[];
    const baselineRows = list.filter((r) => r.recordedAt <= since);
    const windowRows = list.filter((r) => r.recordedAt > since);
    const latest = list[list.length - 1] as StateLogRow;
    const baseline = baselineRows[baselineRows.length - 1] ?? null;
    const hadBaseline = baseline !== null;
    const from = hadBaseline ? baseline.newValue : null;
    const to = latest.newValue;

    let delta: number | null = null;
    let direction: FieldDirection;
    if (!hadBaseline) {
      direction = "non-comparable";
    } else if (isFiniteNumber(from) && isFiniteNumber(to)) {
      delta = to - from;
      direction = delta > 0 ? "positive" : delta < 0 ? "negative" : "unchanged";
    } else {
      direction = canonicalOf(from) === canonicalOf(to) ? "unchanged" : "non-comparable";
    }

    const first = windowRows[0] ?? null;
    const last = windowRows[windowRows.length - 1] ?? null;
    fields.push({
      field,
      unit: latest.unit,
      from,
      hadBaseline,
      to,
      delta,
      direction,
      transitionsSince: windowRows.length,
      firstChangeId: first ? first.changeId : null,
      lastChangeId: last ? last.changeId : null,
      firstRecordedAt: first ? first.recordedAt : null,
      lastRecordedAt: last ? last.recordedAt : null,
      observedAtLast: latest.observedAt,
    });
  }

  const transitionsSince = fields.reduce((n, f) => n + f.transitionsSince, 0);
  const fieldsChanged = fields.filter((f) => f.direction !== "unchanged").length;
  const state: ChangeSinceStateName = transitionsSince > 0 ? "CHANGED" : "UNCHANGED";

  return {
    entity,
    since,
    state,
    fields,
    totals: {
      fieldsTracked: fields.length,
      fieldsChanged,
      transitionsSince,
    },
    detail: `changeSince: state=${state} (fieldsTracked=${fields.length}, fieldsChanged=${fieldsChanged}, transitionsSince=${transitionsSince})`,
  };
}
