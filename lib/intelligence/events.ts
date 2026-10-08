// lib/intelligence/events.ts (Phase A, item 3) — THE EVENT MODEL +
// DETERMINISTIC MATERIALITY.
//
// Founder directions (2026-10-08 round-27) 16–19:
//   - PA3 is the event model + materiality engine. No high-level feature
//     (Dashboard Brief, Stock Intelligence, …) is built first.
//   - Events are DETERMINISTIC PROJECTIONS of state transitions (PA2's
//     observation_state_log). They carry the common fields: entity,
//     timestamp, source, old state, new state, materiality/confidence
//     where applicable, and evidence references.
//   - The materiality engine is PURE DETERMINISTIC LOGIC. AI never
//     determines whether an event occurred or whether it is material;
//     the model only ever interprets an ALREADY-CLASSIFIED event.
//   - The common event vocabulary is CLOSED at 14 categories.
//
// What this module is:
//   - the ONE event vocabulary + projection (rule 14): StateLogRow in,
//     IntelligenceEvent out; nothing else invents event categories;
//   - pure functions only — no I/O, no clocks, no randomness, no model
//     calls. `projectEvents(rows)` is a deterministic function of its
//     input;
//   - materiality from DECLARED v1 thresholds (below) — chosen as
//     standard materiality anchors BEFORE any distribution was measured
//     against them and never tuned post-hoc (the Short Radar honesty
//     rule). Changing a threshold is a founder-visible decision, not a
//     knob.
//
// What this module is NOT:
//   - a second history system (founder direction 15): events are NOT
//     persisted. observation_state_log is the single temporal memory;
//     events are computed views over it. The insight cache/change-key
//     layer (later Phase-A item) derives its keys FROM these events;
//   - an AI path: no provider, no prompt, no synthesis. Events feed the
//     bounded loop as already-classified inputs.

import type { StateLogRow, StateSourceState } from "./stateLog";

// ── the closed event vocabulary (founder direction 19 — exact) ─────────────

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
 * mis-categorized event). PA3 ships the mappings for the fields PA2's
 * quote writer actually logs; fundamentals/earnings/… mappings are added
 * by the PRs that add those writers (a mapping without a producer is a
 * lie about coverage).
 */
const FIELD_CATEGORY: Readonly<Record<string, EventCategory>> = {
  price: "PRICE",
  change: "PRICE", // the intraday change datum of the price observation
  volume24h: "VOLUME",
};

// ── materiality (pure, deterministic, declared thresholds) ─────────────────

export type MaterialityLevel = "high" | "medium" | "low";

/** One deterministic reason line — closed forms, never free text. */
export type MaterialityReason =
  | "relative magnitude"
  | "absolute magnitude"
  | "first observation (no prior value — an honest beginning, not a move)"
  | "no comparable prior value (prior is null, non-numeric or non-positive)"
  | "non-live source caps materiality at medium"
  | "below every declared threshold";

/**
 * The DECLARED v1 thresholds. Standard materiality anchors, fixed before
 * any measurement was run against them; NOT tuned to an observed
 * distribution (changing them is a founder-visible decision recorded in
 * the PR that changes them).
 *  - price: relative move of the observed level — 5% / 2%
 *  - change: the day-change datum itself, in percentage points — 5pp / 2pp
 *  - volume24h: relative swing — 50% / 20% (volume is the noisiest field)
 */
export const MATERIALITY_THRESHOLDS: Readonly<{
  price: { high: number; medium: number };
  change: { high: number; medium: number };
  volume24h: { high: number; medium: number };
}> = {
  price: { high: 0.05, medium: 0.02 },
  change: { high: 5, medium: 2 },
  volume24h: { high: 0.5, medium: 0.2 },
};

export interface MaterialityAssessment {
  level: MaterialityLevel;
  reasons: MaterialityReason[];
}

/** The magnitude inputs the engine understands (numbers or nothing). */
function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * The deterministic materiality verdict for one event-shaped transition.
 * Pure: same inputs, same verdict — in tests, in CI, in production.
 *
 * Rules (in order, first match wins):
 *   1. no prior value (null)            → low  + "first observation …"
 *   2. prior not comparable (non-numeric
 *      or <= 0)                          → low  + "no comparable prior …"
 *   3. magnitude vs the field's declared thresholds (relative for
 *      price/volume24h, absolute in points for change)
 *        ≥ high  → high  + magnitude reason
 *        ≥ medium → medium + magnitude reason
 *        else     → low   + "below every declared threshold"
 *   4. non-live sources (seed/derived/unavailable) cap at MEDIUM —
 *      a non-live observation can never carry a high-materiality
 *      verdict, however large the printed move (provenance first).
 */
export function assessMateriality(input: {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  sourceState: StateSourceState;
}): MaterialityAssessment {
  const oldV = asFiniteNumber(input.oldValue);
  const newV = asFiniteNumber(input.newValue);

  if (oldV === null && input.oldValue === null) {
    return {
      level: "low",
      reasons: ["first observation (no prior value — an honest beginning, not a move)"],
    };
  }
  if (oldV === null || oldV <= 0 || newV === null) {
    return {
      level: "low",
      reasons: ["no comparable prior value (prior is null, non-numeric or non-positive)"],
    };
  }

  const relative = Math.abs(newV - oldV) / Math.abs(oldV);
  const field = input.field as keyof typeof MATERIALITY_THRESHOLDS;
  const thresholds = MATERIALITY_THRESHOLDS[field];
  if (!thresholds) {
    // A mapped category whose field has no declared thresholds yet —
    // impossible for the PA3 mappings (pinned by test); kept fail-safe.
    return { level: "low", reasons: ["below every declared threshold"] };
  }
  const magnitude = field === "change" ? Math.abs(newV) : relative;
  const basis: MaterialityReason = field === "change" ? "absolute magnitude" : "relative magnitude";

  let level: MaterialityLevel;
  let reasons: MaterialityReason[];
  if (magnitude >= thresholds.high) {
    level = "high";
    reasons = [basis];
  } else if (magnitude >= thresholds.medium) {
    level = "medium";
    reasons = [basis];
  } else {
    level = "low";
    reasons = ["below every declared threshold"];
  }

  if (
    level === "high" &&
    input.sourceState !== "live" &&
    input.sourceState !== "live-undated"
  ) {
    return { level: "medium", reasons: [...reasons, "non-live source caps materiality at medium"] };
  }
  return { level, reasons };
}

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
  materiality: MaterialityAssessment;
  confidence: EventConfidence;
  /** Evidence references: the state-log changeIds backing this event
   *  (one per projected row in PA3's 1:1 projection). */
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
  const materiality = assessMateriality({
    field: row.field,
    oldValue: row.oldValue,
    newValue: row.newValue,
    sourceState: row.sourceState,
  });
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
    materiality,
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

/**
 * The material events of a projection — the ONLY set the bounded loop
 * ever interprets (non-material events spend zero model tokens by
 * construction: nothing schedules synthesis for them).
 */
export function materialEventsOf(events: readonly IntelligenceEvent[]): IntelligenceEvent[] {
  return events.filter((e) => e.materiality.level !== "low");
}
