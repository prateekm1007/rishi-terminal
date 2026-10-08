// lib/intelligence/events.ts (INT-A3, roadmap item A3) — THE EVENT MODEL:
// the deterministic event projection.
//
// Roadmap binding (docs/INTELLIGENCE_ROADMAP.md, founder-ratified
// 2026-10-08): one roadmap item, one PR. A3 is the CLOSED event
// vocabulary + the PURE projection of PA2's observation_state_log rows
// into typed events. The deterministic materiality ENGINE is A4
// (lib/intelligence/materiality.ts, its own PR): A3's event carries the
// transition verbatim; A4 classifies its magnitude. Events are derived
// views — never a second history system (founder direction 15):
// observation_state_log is the single temporal memory; nothing here is
// persisted, and the insight cache/change-key layer (later Phase-A items)
// derives its keys FROM these events.
//
// What this module is:
//   - the ONE event vocabulary + projection (rule 14): StateLogRow in,
//     IntelligenceEvent out; nothing else invents event categories;
//   - pure functions only — no I/O, no clocks, no randomness, no model
//     calls. `projectEvents(rows)` is a deterministic function of its
//     input;
//   - the event's observation confidence is DETERMINISTIC, derived from
//     the closed source-state vocabulary (the server decides, never the
//     model).
//
// What this module is NOT:
//   - a materiality engine (A4; an A3 event carries no magnitude
//     opinion — pinned by test);
//   - an AI path: no provider, no prompt, no synthesis. Events feed the
//     bounded loop as already-classified inputs;
//   - a persistence layer: no table, no writer, no reader.

import type { StateLogRow, StateSourceState } from "./stateLog";

// ── the closed event vocabulary (founder direction 19 — exact) ──────────────

export const EVENT_CATEGORIES = [
  "PRICE",
  "VOLUME",
  "EARNINGS",
  "GUIDANCE",
  "FILING",
  "MANAGEMENT",
  "OWNERSHIP",
  "CORPORATE_ACTION",
  "VALUATION",
  "FUNDAMENTAL",
  "TECHNICAL",
  "MACRO",
  "SECTOR",
  "PORTFOLIO",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/**
 * The field → category projection table. CLOSED: a state-log field with
 * no mapping projects to NO event (fail-closed to silence — never a
 * mis-categorized event). A3 ships the mappings for the fields PA2's
 * quote writer actually logs; fundamentals/earnings/… mappings are added
 * by the PRs that add those writers (a mapping without a producer is a
 * lie about coverage).
 */
const FIELD_CATEGORY: Readonly<Record<string, EventCategory>> = {
  price: "PRICE",
  change: "PRICE", // the intraday change datum of the price observation
  volume24h: "VOLUME",
};

// ── event confidence (deterministic, from the closed source-state
//    vocabulary — the server decides, never the model) ──────────────────────

export type EventConfidence = "high" | "moderate" | "low";

/**
 * PA2's source state → the event's observation confidence. Closed map:
 *   live → high; live-undated → moderate (real, but the upstream
 *   disclosed no observation time); derived → moderate; seed → low
 *   (reference data, may be stale); unavailable → low.
 */
export function eventConfidenceOf(sourceState: StateSourceState): EventConfidence {
  switch (sourceState) {
    case "live":
      return "high";
    case "live-undated":
    case "derived":
      return "moderate";
    case "seed":
    case "unavailable":
      return "low";
  }
}

// ── the event ──────────────────────────────────────────────────────────────

export interface IntelligenceEvent {
  /** Deterministic identity: `evt:<CATEGORY>:<changeId>` — collision-free
   *  by construction (changeId is UNIQUE in observation_state_log). */
  id: string;
  category: EventCategory;
  entity: string;
  field: string;
  unit: string;
  /** The upstream's own observation clock, carried verbatim from the
   *  state log — null when the upstream disclosed none (never
   *  fabricated, G4B). */
  observedAt: string | null;
  /** When THIS platform recorded the transition (our clock). */
  recordedAt: string;
  source: string;
  sourceState: StateSourceState;
  oldValue: unknown;
  newValue: unknown;
  confidence: EventConfidence;
  /** Evidence references: the state-log changeIds backing this event
   *  (one per projected row in A3's 1:1 projection). */
  evidenceRefs: string[];
}

/**
 * Project ONE state-log row into an event, or null when the row's field
 * has no category mapping (no event — never a mis-categorized one).
 * Pure: no I/O, no clocks, no randomness.
 */
export function projectEvent(row: StateLogRow): IntelligenceEvent | null {
  const category = FIELD_CATEGORY[row.field];
  if (!category) return null;
  return {
    id: `evt:${category}:${row.changeId}`,
    category,
    entity: row.entity,
    field: row.field,
    unit: row.unit,
    observedAt: row.observedAt,
    recordedAt: row.recordedAt,
    source: row.source,
    sourceState: row.sourceState,
    oldValue: row.oldValue,
    newValue: row.newValue,
    confidence: eventConfidenceOf(row.sourceState),
    evidenceRefs: [row.changeId],
  };
}

/** Project many rows (order preserved, unmapped fields dropped). Pure. */
export function projectEvents(rows: readonly StateLogRow[]): IntelligenceEvent[] {
  const out: IntelligenceEvent[] = [];
  for (const row of rows) {
    const evt = projectEvent(row);
    if (evt) out.push(evt);
  }
  return out;
}
