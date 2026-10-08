// lib/intelligence/materiality.ts (INT-A4, roadmap item A4) — THE DETERMINISTIC
// MATERIALITY ENGINE: A3 event in, fixed rules, material / non-material out.
//
// Founder-confirmed threshold set (in-session 2026-10-08, statistical rules
// verbatim; pre-registered in docs/INTELLIGENCE_ROADMAP.md section 5):
//   price:     >= 3 sigma of 20-day daily returns OR >= 4% intraday
//   volume:    >= 3x 20-day median
//   technical: regime change confirmed over 2 sessions
//   portfolio: exposure change >= 2 percentage points
// The set is pinned by test (MATERIALITY_THRESHOLDS deep-equal) — a silent
// threshold change breaks the build, never drifts.
//
// What this module is:
//   - the ONE materiality verdict (rule 14): every intelligence consumer
//     asks THIS engine whether an event is material; no feature invents
//     its own "should the AI loop run?" heuristic;
//   - pure functions only — no I/O, no clocks, no randomness, no AI path.
//     The caller supplies the clock (`asOf`); staleness is a deterministic
//     comparison against the caller-stated SLO, never a module constant;
//   - the mechanical economic gate: aiSpendAllowed() is false for every
//     non-material verdict, so a non-material event means ZERO AI spend.
//
// What this module is NOT:
//   - a history system (A2's observation_state_log), an event projector
//     (A3), a thesis store (A5), a cache (A7), or an API (A10);
//   - an AI path: it never selects, invokes, or steers synthesis — it
//     classifies already-observed transitions against fixed numbers;
//   - a persistence layer: verdicts are returned, never stored.
//
// Honesty rules embodied here:
//   - fail closed everywhere: missing baselines, short history (< 20),
//     degenerate zero-variance baselines, corrupt numerics, seed-derived
//     and unavailable rows, stale rows, and categories with no registered
//     threshold are all NON-MATERIAL with a named reason — never guessed;
//   - below-threshold is reported ONLY when every applicable leg evaluated
//     and none fired; a leg that could not run names its missing input;
//   - leg priority is fixed and documented (sigma before intraday); the
//     first firing leg owns the verdict's thresholdId.

import type { EventCategory, IntelligenceEvent } from "./events";

// ── the pre-registered threshold set (founder-confirmed 2026-10-08) ─────────

export const MATERIALITY_THRESHOLDS = {
  /** Sigma multiple for the 20-day-returns leg. */
  priceSigmaMult: 3,
  /** Intraday percent leg (absolute percent points). */
  priceIntradayPct: 4,
  /** Required daily-returns history length. */
  returnsWindow: 20,
  /** Volume multiple of the 20-day median. */
  volumeMedianMult: 3,
  /** Required daily-volume history length. */
  volumeWindow: 20,
  /** Required confirmation sessions for a technical regime change. */
  technicalConfirmSessions: 2,
  /** Portfolio exposure move, absolute percentage points. */
  portfolioPp: 2,
} as const;

export const MATERIALITY_THRESHOLD_IDS = {
  priceSigma: "price-sigma-3x20d",
  priceIntraday: "price-intraday-4pct",
  volumeSurge: "volume-median-3x20d",
  technicalRegime: "technical-regime-2sessions",
  portfolioShift: "portfolio-shift-2pp",
} as const;

// ── verdict ──────────────────────────────────────────────────────────────────

export const MATERIAL_VERDICTS = ["material", "non-material"] as const;
export type MaterialVerdict = (typeof MATERIAL_VERDICTS)[number];

export const MATERIALITY_REASONS = [
  "price-sigma",
  "price-intraday",
  "volume-surge",
  "technical-regime",
  "portfolio-shift",
  "below-threshold",
  "missing-input",
  "insufficient-history",
  "invalid-input",
  "seed-derived",
  "unavailable-input",
  "non-comparable",
  "stale",
  "no-threshold-for-category",
] as const;
export type MaterialityReason = (typeof MATERIALITY_REASONS)[number];

/** Closed key set — asserted by test (A3 entropy-guard precedent). */
export interface MaterialityVerdict {
  verdict: MaterialVerdict;
  reason: MaterialityReason;
  /** The firing pre-registered threshold, or null when non-material. */
  thresholdId: string | null;
  category: EventCategory;
  eventId: string;
  /** Deterministic human-readable line (fixed template, no clocks). */
  detail: string;
}

// ── context (caller-supplied; the module fetches nothing) ───────────────────

export interface PriceBaseline {
  /** Daily returns as decimals (0.01 = 1%), oldest first. */
  dailyReturns: number[];
}

export interface VolumeBaseline {
  /** Daily volumes in shares, oldest first. */
  dailyVolumes: number[];
}

export interface TechnicalContext {
  regimeBefore: string;
  regimeAfter: string;
  sessionsConfirmed: number;
}

export interface PortfolioContext {
  exposureBeforePp: number;
  exposureAfterPp: number;
}

export interface FreshnessPolicy {
  maxAgeMs: number;
}

export interface MaterialityContext {
  /** Caller clock (ISO). Used only when `freshness` is stated. */
  asOf: string;
  priceBaseline?: PriceBaseline;
  volumeBaseline?: VolumeBaseline;
  technical?: TechnicalContext;
  portfolio?: PortfolioContext;
  freshness?: FreshnessPolicy;
}

// ── pure helpers ─────────────────────────────────────────────────────────────

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function mean(values: number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Population standard deviation (divide by N — the bands convention). */
function populationStd(values: number[]): number {
  const m = mean(values);
  let acc = 0;
  for (const v of values) {
    const d = v - m;
    acc += d * d;
  }
  return Math.sqrt(acc / values.length);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 1
    ? sorted[Math.floor(mid)]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The event's intraday percent move, or null when it cannot be scaled:
 * `change`-field events carry the datum verbatim; `price`-field events
 * derive it from old -> new (null old, zero old, and non-numeric values
 * abstain — never an Infinity verdict).
 */
function intradayPctOf(event: IntelligenceEvent): number | null {
  if (event.field === "change") {
    return isFiniteNumber(event.newValue) ? event.newValue : null;
  }
  if (event.field === "price") {
    if (!isFiniteNumber(event.oldValue) || !isFiniteNumber(event.newValue)) return null;
    if (event.oldValue === 0) return null;
    return ((event.newValue - event.oldValue) / Math.abs(event.oldValue)) * 100;
  }
  return null;
}

/** The event's decimal daily return, or null when it cannot be scaled. */
function decimalReturnOf(event: IntelligenceEvent): number | null {
  if (event.field === "change") {
    return isFiniteNumber(event.newValue) ? event.newValue / 100 : null;
  }
  if (event.field === "price") {
    if (!isFiniteNumber(event.oldValue) || !isFiniteNumber(event.newValue)) return null;
    if (event.oldValue === 0) return null;
    return (event.newValue - event.oldValue) / Math.abs(event.oldValue);
  }
  return null;
}

// ── legs ─────────────────────────────────────────────────────────────────────

type AbstainCause =
  | "missing-input"
  | "insufficient-history"
  | "invalid-input"
  | "non-comparable";

interface FiredLeg {
  fired: true;
  thresholdId: string;
  observed: string;
  threshold: string;
}

interface AbstainedLeg {
  fired: false;
  thresholdId: string;
  cause: AbstainCause;
  note: string;
}

interface BelowLeg {
  fired: false;
  thresholdId: string;
  observed: string;
  threshold: string;
}

type LegOutcome = FiredLeg | AbstainedLeg | BelowLeg;

function priceSigmaLeg(
  event: IntelligenceEvent,
  ctx: MaterialityContext,
): LegOutcome {
  const thresholdId = MATERIALITY_THRESHOLD_IDS.priceSigma;
  const r = decimalReturnOf(event);
  if (r === null || !Number.isFinite(r)) {
    return { fired: false, thresholdId, cause: "non-comparable", note: "return not scalable" };
  }
  const baseline = ctx.priceBaseline;
  if (!baseline) {
    return { fired: false, thresholdId, cause: "missing-input", note: "no 20-day returns" };
  }
  const returns = baseline.dailyReturns;
  if (!Array.isArray(returns) || returns.length < MATERIALITY_THRESHOLDS.returnsWindow) {
    return {
      fired: false,
      thresholdId,
      cause: "insufficient-history",
      note: `has ${Array.isArray(returns) ? returns.length : 0}/${MATERIALITY_THRESHOLDS.returnsWindow} returns`,
    };
  }
  if (!returns.every(isFiniteNumber)) {
    return { fired: false, thresholdId, cause: "invalid-input", note: "returns failed validation" };
  }
  if (returns.every((v) => v === returns[0])) {
    return { fired: false, thresholdId, cause: "insufficient-history", note: "constant baseline has no scale" };
  }
  const sigma = populationStd(returns);
  if (!Number.isFinite(sigma) || sigma <= 0) {
    return { fired: false, thresholdId, cause: "insufficient-history", note: "zero-variance baseline has no scale" };
  }
  const bar = MATERIALITY_THRESHOLDS.priceSigmaMult * sigma;
  const observed = `|return|=${String(Math.abs(r))}`;
  const threshold = `${String(MATERIALITY_THRESHOLDS.priceSigmaMult)}*sigma=${String(bar)}`;
  if (Math.abs(r) >= bar) {
    return { fired: true, thresholdId, observed, threshold };
  }
  return { fired: false, thresholdId, observed, threshold };
}

function priceIntradayLeg(event: IntelligenceEvent): LegOutcome {
  const thresholdId = MATERIALITY_THRESHOLD_IDS.priceIntraday;
  const pct = intradayPctOf(event);
  if (pct === null || !Number.isFinite(pct)) {
    return { fired: false, thresholdId, cause: "non-comparable", note: "intraday pct not scalable" };
  }
  const observed = `|intraday|=${String(Math.abs(pct))}%`;
  const threshold = `>=${String(MATERIALITY_THRESHOLDS.priceIntradayPct)}%`;
  if (Math.abs(pct) >= MATERIALITY_THRESHOLDS.priceIntradayPct) {
    return { fired: true, thresholdId, observed, threshold };
  }
  return { fired: false, thresholdId, observed, threshold };
}

function volumeLeg(
  event: IntelligenceEvent,
  ctx: MaterialityContext,
): LegOutcome {
  const thresholdId = MATERIALITY_THRESHOLD_IDS.volumeSurge;
  if (!isFiniteNumber(event.newValue)) {
    return { fired: false, thresholdId, cause: "non-comparable", note: "volume not numeric" };
  }
  const baseline = ctx.volumeBaseline;
  if (!baseline) {
    return { fired: false, thresholdId, cause: "missing-input", note: "no 20-day volumes" };
  }
  const volumes = baseline.dailyVolumes;
  if (!Array.isArray(volumes) || volumes.length < MATERIALITY_THRESHOLDS.volumeWindow) {
    return {
      fired: false,
      thresholdId,
      cause: "insufficient-history",
      note: `has ${Array.isArray(volumes) ? volumes.length : 0}/${MATERIALITY_THRESHOLDS.volumeWindow} volumes`,
    };
  }
  if (!volumes.every(isFiniteNumber) || volumes.some((v) => v < 0)) {
    return { fired: false, thresholdId, cause: "invalid-input", note: "volumes failed validation" };
  }
  const med = median(volumes);
  if (!Number.isFinite(med) || med <= 0) {
    return { fired: false, thresholdId, cause: "invalid-input", note: "non-positive median has no scale" };
  }
  const ratio = event.newValue / med;
  const observed = `ratio=${String(ratio)}`;
  const threshold = `>=${String(MATERIALITY_THRESHOLDS.volumeMedianMult)}x median=${String(med)}`;
  if (ratio >= MATERIALITY_THRESHOLDS.volumeMedianMult) {
    return { fired: true, thresholdId, observed, threshold };
  }
  return { fired: false, thresholdId, observed, threshold };
}

function technicalLeg(
  _event: IntelligenceEvent,
  ctx: MaterialityContext,
): LegOutcome {
  const thresholdId = MATERIALITY_THRESHOLD_IDS.technicalRegime;
  const t = ctx.technical;
  if (!t) {
    return { fired: false, thresholdId, cause: "missing-input", note: "no regime context" };
  }
  if (
    typeof t.regimeBefore !== "string" ||
    typeof t.regimeAfter !== "string" ||
    t.regimeBefore.length === 0 ||
    t.regimeAfter.length === 0 ||
    !isFiniteNumber(t.sessionsConfirmed)
  ) {
    return { fired: false, thresholdId, cause: "invalid-input", note: "regime context failed validation" };
  }
  const observed = `${t.regimeBefore}->${t.regimeAfter} over ${String(t.sessionsConfirmed)} sessions`;
  const threshold = `change confirmed over >=${String(MATERIALITY_THRESHOLDS.technicalConfirmSessions)} sessions`;
  if (
    t.regimeBefore !== t.regimeAfter &&
    t.sessionsConfirmed >= MATERIALITY_THRESHOLDS.technicalConfirmSessions
  ) {
    return { fired: true, thresholdId, observed, threshold };
  }
  return { fired: false, thresholdId, observed, threshold };
}

function portfolioLeg(
  _event: IntelligenceEvent,
  ctx: MaterialityContext,
): LegOutcome {
  const thresholdId = MATERIALITY_THRESHOLD_IDS.portfolioShift;
  const p = ctx.portfolio;
  if (!p) {
    return { fired: false, thresholdId, cause: "missing-input", note: "no exposure context" };
  }
  if (!isFiniteNumber(p.exposureBeforePp) || !isFiniteNumber(p.exposureAfterPp)) {
    return { fired: false, thresholdId, cause: "invalid-input", note: "exposure failed validation" };
  }
  const move = Math.abs(p.exposureAfterPp - p.exposureBeforePp);
  const observed = `|move|=${String(move)}pp`;
  const threshold = `>=${String(MATERIALITY_THRESHOLDS.portfolioPp)}pp`;
  if (move >= MATERIALITY_THRESHOLDS.portfolioPp) {
    return { fired: true, thresholdId, observed, threshold };
  }
  return { fired: false, thresholdId, observed, threshold };
}

// ── combination (fixed priority, documented) ─────────────────────────────────

/** Abstain-cause priority when no leg fires: corrupt input outranks shape
 *  problems, which outrank short history, which outranks absent input. */
const CAUSE_PRIORITY: AbstainCause[] = [
  "invalid-input",
  "non-comparable",
  "insufficient-history",
  "missing-input",
];

function combineLegs(
  category: EventCategory,
  eventId: string,
  legs: LegOutcome[],
): MaterialityVerdict {
  const base = { category, eventId } as const;
  const fired = legs.find((l): l is FiredLeg => l.fired);
  if (fired) {
    return {
      ...base,
      verdict: "material",
      reason: reasonOf(fired.thresholdId),
      thresholdId: fired.thresholdId,
      detail: `${fired.thresholdId} fired (observed ${fired.observed} vs ${fired.threshold})`,
    };
  }
  const abstains = legs.filter((l): l is AbstainedLeg => !l.fired && "cause" in l);
  if (abstains.length === 0) {
    const ids = legs.map((l) => l.thresholdId).join(" and ");
    return {
      ...base,
      verdict: "non-material",
      reason: "below-threshold",
      thresholdId: null,
      detail: `below ${ids}`,
    };
  }
  abstains.sort(
    (a, b) => CAUSE_PRIORITY.indexOf(a.cause) - CAUSE_PRIORITY.indexOf(b.cause),
  );
  const top = abstains[0];
  return {
    ...base,
    verdict: "non-material",
    reason: top.cause,
    thresholdId: null,
    detail: `${top.cause}: ${top.thresholdId} ${top.note}`,
  };
}

function reasonOf(thresholdId: string): MaterialityReason {
  switch (thresholdId) {
    case MATERIALITY_THRESHOLD_IDS.priceSigma:
      return "price-sigma";
    case MATERIALITY_THRESHOLD_IDS.priceIntraday:
      return "price-intraday";
    case MATERIALITY_THRESHOLD_IDS.volumeSurge:
      return "volume-surge";
    case MATERIALITY_THRESHOLD_IDS.technicalRegime:
      return "technical-regime";
    default:
      return "portfolio-shift";
  }
}

// ── entry points ─────────────────────────────────────────────────────────────

/**
 * Classify one A3 event. Pure: same event + context in, same verdict out.
 * Check order is fixed: seed refusal, unavailable refusal, caller-stated
 * staleness, then the category's registered legs.
 */
export function classifyEvent(
  event: IntelligenceEvent,
  ctx: MaterialityContext,
): MaterialityVerdict {
  const base = { category: event.category, eventId: event.id } as const;
  if (event.sourceState === "seed") {
    return {
      ...base,
      verdict: "non-material",
      reason: "seed-derived",
      thresholdId: null,
      detail: "seed-derived: reference rows never classify",
    };
  }
  if (event.sourceState === "unavailable") {
    return {
      ...base,
      verdict: "non-material",
      reason: "unavailable-input",
      thresholdId: null,
      detail: "unavailable-input: source disclosed no observation",
    };
  }
  if (ctx.freshness) {
    const recordedMs = Date.parse(event.recordedAt);
    const asOfMs = Date.parse(ctx.asOf);
    if (!Number.isFinite(recordedMs) || !Number.isFinite(asOfMs) || asOfMs < recordedMs) {
      return {
        ...base,
        verdict: "non-material",
        reason: "non-comparable",
        thresholdId: null,
        detail: "non-comparable: evaluation clock cannot be ordered",
      };
    }
    const ageMs = asOfMs - recordedMs;
    if (ageMs > ctx.freshness.maxAgeMs) {
      return {
        ...base,
        verdict: "non-material",
        reason: "stale",
        thresholdId: null,
        detail: `stale: age ${String(ageMs)}ms exceeds maxAge ${String(ctx.freshness.maxAgeMs)}ms`,
      };
    }
  }
  switch (event.category) {
    case "PRICE":
      // Fixed leg priority: sigma before intraday (documented above).
      return combineLegs(event.category, event.id, [
        priceSigmaLeg(event, ctx),
        priceIntradayLeg(event),
      ]);
    case "VOLUME":
      return combineLegs(event.category, event.id, [volumeLeg(event, ctx)]);
    case "TECHNICAL":
      return combineLegs(event.category, event.id, [technicalLeg(event, ctx)]);
    case "PORTFOLIO":
      return combineLegs(event.category, event.id, [portfolioLeg(event, ctx)]);
    default:
      return {
        ...base,
        verdict: "non-material",
        reason: "no-threshold-for-category",
        thresholdId: null,
        detail: `no-threshold-for-category: ${event.category} has no registered threshold`,
      };
  }
}

/** Classify many events (order preserved, one verdict per event). Pure. */
export function classifyEvents(
  events: readonly IntelligenceEvent[],
  ctx: MaterialityContext,
): MaterialityVerdict[] {
  return events.map((event) => classifyEvent(event, ctx));
}

/**
 * THE mechanical economic gate: a non-material verdict disallows AI
 * spend, full stop. Every synthesis-eligibility check downstream MUST
 * call this — A4 owns materiality exclusively, and no later feature
 * may add its own spend heuristic.
 */
export function aiSpendAllowed(verdict: MaterialityVerdict): boolean {
  return verdict.verdict === "material";
}
