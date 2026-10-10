// lib/intelligence/stateLog.ts (Phase A, item 2) — TEMPORAL MEMORY: the
// append-only observation-state log behind migration 030.
//
// Founder direction 12 (2026-10-07): "Add an append-only/traceable
// observation-state model… It must preserve: entity, observation
// timestamp, source, old state, new state, provenance, confidence/status,
// change identifier. The design must support ChangeSince, Watchtower,
// Management Truth Tracker, and Since-Last-Visit without creating
// separate history systems."
//
// What this module is:
//   - the ONE writer/reader for `observation_state_log` (rule 14: one
//     source of truth per concept — quoteCache hooks THIS, future
//     fundamentals/thesis writers hook THIS, nothing else touches the
//     table);
//   - pure, testable transition construction (buildQuoteTransitions +
//     changeIdOf) — deterministic identity, no clocks, no randomness;
//   - idempotent appends: the same transition re-appended by a retry is
//     ONE row (UNIQUE change_id + ON CONFLICT DO NOTHING — rule 11).
//
// Honesty rules embodied here:
//   - a re-observation with an UNCHANGED value is not a transition (the
//     DB rejects it too — defense in depth);
//   - the FIRST observation has old_value = null — an honest beginning,
//     never a zero (rule 16);
//   - observed_at is the UPSTREAM's own clock, carried verbatim (G4B);
//     null when the upstream disclosed none — never fabricated;
//   - source_state is the CLOSED vocabulary shared with the evidence
//     layer (lib/ai/schemas AiSourceState) — no second provenance
//     vocabulary (direction 8).
//
// Failure semantics: appends are BEST-EFFORT from the price path's
// perspective — a log failure is logged server-side and NEVER breaks
// quote serving (the cache path is latency-critical, G7). A lost append
// is a DETECTABLE gap (the next row's old_value no longer chains), never
// a fabricated transition; the DB constraints make a dishonest row
// unrepresentable.

import { createHash } from "node:crypto";
import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import type { CachedQuote } from "@/lib/quoteCache";

// ── types ──────────────────────────────────────────────────────────────────

export type StateSourceState =
  | "live"
  | "live-undated"
  | "derived"
  | "seed"
  | "unavailable";

/** One value transition of one field of one entity (migration 030's row,
 *  before persistence). */
export interface StateTransition {
  entity: string;
  field: string;
  /** The upstream's own observation time; null when undisclosed. */
  observedAt: string | null;
  source: string;
  unit: string;
  sourceState: StateSourceState;
  oldValue: unknown;
  newValue: unknown;
}

/** A persisted row, as the readers return it. */
export interface StateLogRow extends StateTransition {
  changeId: string;
  recordedAt: string;
}

// ── pure helpers ───────────────────────────────────────────────────────────

/**
 * The deterministic transition identity: sha256 over
 * entity|field|observedAt-or-null|canonical-new-value. The SAME
 * observation re-appended (retry, warmer replay) yields the SAME id —
 * the UNIQUE constraint collapses it to one row. A value change with the
 * same observation clock (an intraday correction the provider stamped
 * identically) also yields a distinct id — corrections are appendable,
 * which is the point of an append-only log.
 */
export function changeIdOf(t: {
  entity: string;
  field: string;
  observedAt: string | null;
  newValue: unknown;
}): string {
  const canonical =
    typeof t.newValue === "number"
      ? Number.isInteger(t.newValue)
        ? String(t.newValue)
        : String(t.newValue)
      : JSON.stringify(t.newValue ?? null);
  return createHash("sha256")
    .update(`${t.entity}|${t.field}|${t.observedAt ?? "null"}|${canonical}`)
    .digest("hex");
}

/**
 * Decode a jsonb value at the read boundary (INT-RECONCILE).
 *
 * Legacy rows (the pre-2026-10-10 writer) store the JSON TEXT of the
 * value (the retired write encoding was JSON.stringify(value)): numbers
 * arrive back as strings, and A4's legs refuse to scale a string
 * (fail-closed, correct per their own contract — the all-non-comparable
 * production degradation this decode repairs; 160,200 rows verified
 * string-typed read-only on 2026-10-10). The decode is the EXACT
 * inverse of that encoding — a string that parses as JSON decodes to
 * its value; anything else passes through verbatim (native jsonb
 * numbers/objects/booleans from the repaired writer, and genuine text
 * values from future writers that are not valid JSON).
 *
 * Residual ambiguity (documented, bounded): a future NATIVE text value
 * that happens to be valid JSON of another type (e.g. the text "123")
 * would decode to that type. The quote-path fields are numbers or SQL
 * NULL by construction, so the ambiguity cannot touch the intelligence
 * chain; a text-field writer that cares names its values unambiguously.
 *
 * Deterministic and total; never guesses, never throws.
 */
function decodeLegacyJsonbValue(v: unknown): unknown {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v) as unknown;
  } catch {
    return v;
  }
}

/** The quote path's closed field/unit map — the ONLY fields the price
 *  writer logs (Rule 2: names describe behavior; a new field needs a new
 *  map entry, not a stringly call). */
const QUOTE_FIELDS: Array<{
  field: "price" | "change" | "volume24h";
  unit: string;
  read: (q: CachedQuote) => number | null;
}> = [
  { field: "price", unit: "inr", read: (q) => q.price },
  { field: "change", unit: "percent", read: (q) => q.change },
  { field: "volume24h", unit: "shares", read: (q) => q.volume24h },
];

/** The provider observation's source state: a disclosed observation time
 *  is "live"; no disclosed time is "live-undated" (the CLOSED vocabulary
 *  from lib/ai/schemas — quote-path rows are observations, never seed). */
function quoteSourceState(observedAt: string | null): StateSourceState {
  return observedAt ? "live" : "live-undated";
}

/**
 * Build the transitions for one quote write: for every mapped field, the
 * old value (previous cache row) -> new value (the fetched observation).
 * Fields whose value did not change produce NO transition; a first
 * observation (no previous row) carries old = null. Pure — same inputs,
 * same outputs, no I/O.
 */
export function buildQuoteTransitions(
  symbol: string,
  previous: CachedQuote | null,
  next: CachedQuote,
): StateTransition[] {
  const entity = `stock:${symbol}`;
  const out: StateTransition[] = [];
  for (const { field, unit, read } of QUOTE_FIELDS) {
    const oldV = previous ? read(previous) : null;
    const newV = read(next);
    const oldKnown = previous !== null && oldV !== null && oldV !== undefined;
    const newKnown = newV !== null && newV !== undefined;
    if (!newKnown) continue; // the writer only appends real values
    if (oldKnown && oldV === newV) continue; // unchanged: not a transition
    out.push({
      entity,
      field,
      observedAt: next.observedAt,
      source: next.source,
      unit,
      sourceState: quoteSourceState(next.observedAt),
      oldValue: oldKnown ? oldV : null,
      newValue: newV,
    });
  }
  return out;
}

// ── writer ─────────────────────────────────────────────────────────────────

export interface AppendResult {
  attempted: number;
  appended: number;
  error: string | null;
}

/**
 * Append transitions (idempotent). Called ONLY from server canonical
 * write paths (the quote cache hook; later: fundamentals, thesis state).
 * Failures are returned, never thrown — the caller decides how loudly to
 * log (the price path logs and continues; nothing fabricated either way).
 */
export async function appendStateTransitions(
  transitions: StateTransition[],
): Promise<AppendResult> {
  if (transitions.length === 0) return { attempted: 0, appended: 0, error: null };
  const rows = transitions.map((t) => ({
    change_id: changeIdOf(t),
    entity: t.entity,
    field: t.field,
    observed_at: t.observedAt,
    source: t.source,
    unit: t.unit,
    source_state: t.sourceState,
    // INT-RECONCILE: values cross the JSONB boundary NATIVELY — numbers
    // as jsonb numbers, objects as jsonb objects, null old_value as SQL
    // NULL. The pre-repair writer stringified every value (jsonOf),
    // which the reader's legacy decode now reverses for old rows.
    old_value: t.oldValue ?? null,
    new_value: t.newValue ?? null,
  }));
  const { data, error } = await getAdminSupabase()
    .from("observation_state_log")
    .upsert(rows, {
      onConflict: "change_id",
      ignoreDuplicates: true,
      count: "exact",
    })
    .select("change_id");
  if (error) {
    return { attempted: rows.length, appended: 0, error: error.message };
  }
  return { attempted: rows.length, appended: (data ?? []).length, error: null };
}

// ── readers (the consumer surfaces: ChangeSince, Since-Last-Visit,
//    Watchtower, Truth Tracker — all read, none write) ─────────────────────

export interface HistoryOptions {
  from?: string;
  to?: string;
  limit?: number;
}

/**
 * Ascending (oldest-first) transition history for one (entity, field),
 * optionally bounded by RECORDED time. The bound is recorded_at (when
 * this platform observed it), not observed_at (the upstream's own clock)
 * — a Since-Last-Visit query is about OUR timeline; ChangeSince's value
 * semantics come from the rows themselves.
 */
export async function readStateHistory(
  entity: string,
  field: string,
  opts: HistoryOptions = {},
): Promise<StateLogRow[]> {
  let q = getAdminSupabase()
    .from("observation_state_log")
    .select("change_id, entity, field, observed_at, recorded_at, source, unit, source_state, old_value, new_value")
    .eq("entity", entity)
    .eq("field", field)
    .order("recorded_at", { ascending: true })
    .limit(opts.limit ?? 500);
  if (opts.from) q = q.gte("recorded_at", opts.from);
  if (opts.to) q = q.lte("recorded_at", opts.to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToStateLogRow);
}

function rowToStateLogRow(r: Record<string, unknown>): StateLogRow {
  return {
    changeId: String(r.change_id),
    entity: String(r.entity),
    field: String(r.field),
    observedAt: r.observed_at == null ? null : String(r.observed_at),
    recordedAt: String(r.recorded_at),
    source: String(r.source),
    unit: String(r.unit),
    sourceState: String(r.source_state) as StateSourceState,
    // INT-RECONCILE: legacy string-encoded values decode here; native
    // values pass through verbatim (see decodeLegacyJsonbValue).
    oldValue: r.old_value == null ? null : decodeLegacyJsonbValue(r.old_value),
    newValue: decodeLegacyJsonbValue(r.new_value),
  };
}

/**
 * The state of one (entity, field) as of a moment in RECORDED time: the
 * new_value of the last transition recorded at or before `asOf`, or null
 * when nothing was recorded yet (the honest unknown — never a guess).
 */
export async function stateAt(
  entity: string,
  field: string,
  asOf: string,
): Promise<{ value: unknown; at: StateLogRow } | null> {
  const { data, error } = await getAdminSupabase()
    .from("observation_state_log")
    .select("change_id, entity, field, observed_at, recorded_at, source, unit, source_state, old_value, new_value")
    .eq("entity", entity)
    .eq("field", field)
    .lte("recorded_at", asOf)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = rowToStateLogRow(data as Record<string, unknown>);
  return { value: row.newValue, at: row };
}
