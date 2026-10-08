// lib/intelligence/thesis.ts (INT-A5, roadmap item A5) — THE THESIS-STATE
// MODEL: the deterministic evidence ledger.
//
// Founder direction (verbatim semantics): supports[], weakens[],
// conflicts[], invalidators[], a deterministic state (IMPROVING, MIXED,
// DETERIORATING, UNCLEAR) from weighted material evidence and freshness.
// The model never chooses the state — this module accepts no state input
// and ignores any extra field riding on its inputs (pinned by test).
//
// Pre-registration: docs/intelligence/thesis.md (committed before any
// evaluation). The state rule, the direction rules, and the fail-closed
// table are pinned by test — a silent change breaks the build.
//
// What this module is:
//   - the ONE thesis-state computation (rule 14): (A3 event, A4 verdict)
//     pairs in, the closed four-state trajectory out. It consumes the
//     ONE materiality engine's verdicts and never re-decides
//     materiality;
//   - pure functions only — no I/O, no clocks (asOf is caller-supplied),
//     no randomness, no AI path. Same inputs -> byte-stable output.
//
// What this module is NOT:
//   - an AI path: nothing here selects, invokes, or steers synthesis —
//     the state is a deterministic function of evidence;
//   - a persistence layer: the state is returned, never stored;
//   - a second materiality engine: a non-material verdict contributes
//     nothing (the economic gate holds at thesis level too).

import type { EventCategory, IntelligenceEvent } from "./events";
import type { FreshnessPolicy, MaterialityVerdict } from "./materiality";

// ── the closed state vocabulary (founder direction — exact) ─────────────────

export const THESIS_STATES = [
  "IMPROVING",
  "MIXED",
  "DETERIORATING",
  "UNCLEAR",
] as const;
export type ThesisStateName = (typeof THESIS_STATES)[number];

/**
 * Categories with a pre-registered direction rule (the signed
 * company-performance family; see the pre-registration table). Evidence
 * from every other category is DIRECTIONLESS by default — no invented
 * semantics; a direction rule is added only as a future
 * pre-registered extension.
 */
export const THESIS_DIRECTION_CATEGORIES: ReadonlySet<EventCategory> = new Set([
  "PRICE",
  "FUNDAMENTAL",
  "GUIDANCE",
  "EARNINGS",
] as const);

/**
 * (category:field) pairs whose fresh material evidence INVALIDATES the
 * tracked premise. Intentionally EMPTY: no invalidator semantics have
 * been confirmed, so no event can invalidate — the handling below is
 * the documented-unreachable totality branch (A3's seed->low
 * confidence precedent). Never improvised.
 */
export const THESIS_INVALIDATOR_RULES: ReadonlySet<string> = new Set<string>([]);

// ── shapes (closed key sets, pinned by test) ────────────────────────────────

export type ThesisDirection = "positive" | "negative";

export interface ThesisEvidenceItem {
  eventId: string;
  category: EventCategory;
  field: string;
  direction: ThesisDirection;
  /** The upstream's own observation clock, carried verbatim (null when
   *  the upstream disclosed none — never fabricated). */
  observedAt: string | null;
}

export interface ThesisConflict {
  category: EventCategory;
  positiveEventId: string;
  negativeEventId: string;
}

export interface ThesisState {
  /** The tracked subject (the events' shared entity), null when the
   *  input is empty or refused fail-closed. */
  entity: string | null;
  state: ThesisStateName;
  supports: ThesisEvidenceItem[];
  weakens: ThesisEvidenceItem[];
  conflicts: ThesisConflict[];
  invalidators: ThesisEvidenceItem[];
  /** One deterministic line: the ledger counts behind the state. */
  detail: string;
}

/** One evidence unit: an A3 event paired with ITS A4 verdict. */
export interface ThesisInput {
  event: IntelligenceEvent;
  materiality: MaterialityVerdict;
}

export interface ThesisContext {
  /** Caller clock (ISO). Used only when `freshness` is stated. */
  asOf: string;
  /** Caller-stated freshness policy — the module keeps no clock. */
  freshness?: FreshnessPolicy;
}

// ── direction derivation (mirrors the A4 move convention) ───────────────────

function signOf(x: number): ThesisDirection | null {
  if (x > 0) return "positive";
  if (x < 0) return "negative";
  return null; // a zero move carries no direction
}

/**
 * The event's thesis direction, or null when it cannot carry one:
 *   - `change` fields: the carried percent datum's own sign;
 *   - `price` fields: the sign of new -> old (null old, zero old, and
 *     non-numeric values abstain — never an Infinity direction);
 *   - other fields: the sign of new - old when both are numeric; a
 *     percent datum with no oldValue carries its own sign; anything
 *     else abstains (directionless, never guessed).
 */
function directionOf(event: IntelligenceEvent): ThesisDirection | null {
  const nv = event.newValue;
  const ov = event.oldValue;
  const nvOk = typeof nv === "number" && Number.isFinite(nv);
  const ovOk = typeof ov === "number" && Number.isFinite(ov);
  if (event.field === "change") {
    return nvOk ? signOf(nv) : null;
  }
  if (event.field === "price") {
    if (!nvOk || !ovOk || ov === 0) return null;
    return signOf(nv - ov);
  }
  if (nvOk && ovOk) return signOf(nv - ov);
  if (nvOk && ov === null && event.unit === "percent") return signOf(nv);
  return null;
}

// ── exclusion reasons (fail-closed, all named) ──────────────────────────────

type Exclusion =
  | "non-material"
  | "seed-derived"
  | "unavailable-source"
  | "non-comparable"
  | "stale";

function exclusionsOf(input: ThesisInput, ctx: ThesisContext): Exclusion | null {
  if (input.materiality.verdict !== "material") return "non-material";
  if (input.event.sourceState === "seed") return "seed-derived";
  if (input.event.sourceState === "unavailable") return "unavailable-source";
  if (ctx.freshness) {
    const recordedMs = Date.parse(input.event.recordedAt);
    const asOfMs = Date.parse(ctx.asOf);
    if (!Number.isFinite(recordedMs) || !Number.isFinite(asOfMs) || asOfMs < recordedMs) {
      return "non-comparable";
    }
    if (asOfMs - recordedMs > ctx.freshness.maxAgeMs) return "stale";
  }
  return null;
}

// ── the deterministic state rule (fixed order, pre-registered) ──────────────

export function buildThesisState(
  inputs: readonly ThesisInput[],
  ctx: ThesisContext,
): ThesisState {
  if (inputs.length === 0) {
    return {
      entity: null,
      state: "UNCLEAR",
      supports: [],
      weakens: [],
      conflicts: [],
      invalidators: [],
      detail: "thesis: no evidence",
    };
  }

  // Entity uniformity across the WHOLE input (fail-closed refusal).
  const first = inputs[0]?.event.entity ?? null;
  for (const input of inputs) {
    if (input.event.entity !== first) {
      return {
        entity: null,
        state: "UNCLEAR",
        supports: [],
        weakens: [],
        conflicts: [],
        invalidators: [],
        detail: "thesis: mixed-entity input refused fail-closed",
      };
    }
  }

  const supports: ThesisEvidenceItem[] = [];
  const weakens: ThesisEvidenceItem[] = [];
  const invalidators: ThesisEvidenceItem[] = [];
  let directionless = 0;
  let excluded = 0;

  for (const input of inputs) {
    if (exclusionsOf(input, ctx) !== null) {
      excluded += 1;
      continue;
    }
    const { event } = input;
    const item: ThesisEvidenceItem = {
      eventId: event.id,
      category: event.category,
      field: event.field,
      direction: "positive",
      observedAt: event.observedAt,
    };
    if (THESIS_INVALIDATOR_RULES.has(`${event.category}:${event.field}`)) {
      invalidators.push({ ...item, direction: "positive" });
      continue;
    }
    const direction = directionOf(event);
    if (direction === null || !THESIS_DIRECTION_CATEGORIES.has(event.category)) {
      directionless += 1;
      continue;
    }
    if (direction === "positive") {
      supports.push(item);
    } else {
      weakens.push({ ...item, direction: "negative" });
    }
  }

  // Same-category opposite-direction pairs (pre-registered conflict rule).
  const conflicts: ThesisConflict[] = [];
  for (const s of supports) {
    for (const w of weakens) {
      if (s.category === w.category) {
        conflicts.push({
          category: s.category,
          positiveEventId: s.eventId,
          negativeEventId: w.eventId,
        });
      }
    }
  }

  // The state rule, in the pre-registered fixed order.
  let state: ThesisStateName;
  if (invalidators.length > 0) {
    state = "UNCLEAR"; // a broken premise supports no direction claim
  } else if (supports.length > 0 && weakens.length > 0) {
    state = "MIXED";
  } else if (supports.length > 0) {
    state = "IMPROVING";
  } else if (weakens.length > 0) {
    state = "DETERIORATING";
  } else {
    state = "UNCLEAR";
  }

  return {
    entity: first,
    state,
    supports,
    weakens,
    conflicts,
    invalidators,
    detail: `thesis: state=${state} (support=${supports.length}, weaken=${weakens.length}, conflicts=${conflicts.length}, invalidators=${invalidators.length}, directionless=${directionless}, excluded=${excluded})`,
  };
}
