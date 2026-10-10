// lib/intelligence/chain.ts (INT-A10, roadmap item A10) — THE CHAIN RUNNER:
// the ONE server-side composition of the intelligence substrate.
//
// Pre-registration: docs/intelligence/intelligenceApi.md (committed BEFORE
// any evaluation). The fail-closed table, the A4 generation gate and the
// no-second-path pins are enforced by test.
//
// What this module is:
//   - ONE composition of the substrate engines, each invoked exactly once
//     per request: A2 readStateHistory (per tracked field) → A3
//     projectEvents → A4 classifyEvents → A5 buildThesisState → A6
//     computeChangeSince → A7 changeKeyOf (+ the persistent cache read for
//     the "insight" capability). There is no second projection,
//     classification, thesis, delta or key implementation anywhere;
//   - pure with respect to the world: the caller injects the clock
//     (`nowMs`); every timestamp in the output derives from it or from the
//     rows. No I/O except through the substrate's own readers;
//   - the deterministic artifact composer: the "thesis" capability returns
//     a fully deterministic A1 artifact (zero AI by construction — no
//     model surface exists in this module, pinned by test); the "insight"
//     capability returns the deterministic scaffold the ROUTE fills with
//     model prose through the ONE bounded loop (the route is the only
//     caller of the router — this module never touches it);
//   - the pure prose assembler for the generation path: model output in,
//     A1-contract candidate out (parse-or-null — the boundary refuses).
//
// What this module is NOT:
//   - not a synthesis engine: no provider, no prompt, no router (static
//     pins scan this file);
//   - not a second materiality engine: A4's verdicts are consumed
//     verbatim; `aiSpendAllowed` is the ONLY economic gate;
//   - not a cache: A7's reader/writer are the ONE persistence; this module
//     calls them, never re-implements them;
//   - not a materiality heuristic holder: whether the model runs is A4's
//     decision alone (direction 11).
//
// Baseline derivation (deterministic, from the SAME history rows): A4's
// statistical legs need 20-day baselines; the chain derives them from the
// entity's own rows — per UTC calendar day of recordedAt, the last finite
// non-negative new_value is the day's close; consecutive closes give the
// price return series and the volume series. Short or degenerate history
// therefore yields NO baseline, and A4's own fail-closed legs abstain —
// the known Phase-A state (non-material until baselines accumulate), never
// a guessed verdict.
//
// Freshness: no SLO is pre-registered for this surface, so the chain
// states NO freshness policy — staleness stays un-evaluated rather than
// invented. A4 still refuses seed/unavailable rows on its own.

import { readStateHistory, type StateLogRow } from "./stateLog";
import { projectEvents, type IntelligenceEvent } from "./events";
import {
  MATERIALITY_THRESHOLDS,
  aiSpendAllowed,
  classifyEvents,
  type MaterialityContext,
  type MaterialityVerdict,
  type PriceBaseline,
  type VolumeBaseline,
} from "./materiality";
import { buildThesisState, type ThesisState } from "./thesis";
import { computeChangeSince, type ChangeSinceResult } from "./changeSince";
import { changeKeyOf, readCachedInsight } from "./insightCache";
import {
  deriveInsightConfidence,
  parseRishiInsight,
  type InsightContradiction,
  type InsightConfidence,
  type InsightFeature,
  type InsightMateriality,
  type InsightModelStatus,
  type InsightProvenance,
  type InsightStatus,
  type RishiInsight,
} from "./types";
import type { IntelligenceCapability } from "./capabilities";

/**
 * The closed order of A4's non-material REFUSAL reasons (INT-A8-PRES) —
 * the reasons a transition is refused fail-closed by the materiality
 * engine, in MATERIALITY_REASONS' declaration order. The ONE remaining
 * non-material reason, "below-threshold" (evaluated, not qualified), is
 * emitted separately by the deterministic breakdown — below-threshold
 * and the refusals are different facts and the interface says so.
 * Mechanically bound to A4's vocabulary by the suite's static pin (the
 * 9+1 <= 10 A1 bound): any drift on either side fails there.
 */
export const NON_MATERIAL_REFUSAL_ORDER = [
  "missing-input",
  "insufficient-history",
  "invalid-input",
  "seed-derived",
  "unavailable-input",
  "non-comparable",
  "stale",
  "no-threshold-for-category",
] as const;

/** The A1 evidence item shape (the contract's own element type — no
 *  second definition). */
type InsightEvidenceItem = RishiInsight["evidence"][number];

// ── closed Phase-A constants ────────────────────────────────────────────────

/** The Phase-A feature the two capabilities compose under (A1 registry). */
const CHAIN_FEATURE: InsightFeature = "stock-intelligence";

/** The fields the price writer logs (A3's mapped set, sorted for stable
 *  composition). A new field means a new entry here AND in A3's map —
 *  never a stringly call site. */
const CHAIN_FIELDS: readonly string[] = ["change", "price", "volume24h"];

/** The A2 entity namespace for registry symbols (stateLog's writer
 *  convention: buildQuoteTransitions). */
const ENTITY_PREFIX = "stock:";

// ── shapes ──────────────────────────────────────────────────────────────────

export interface IntelligenceChainRefusal {
  kind: "generation-refused";
  reason: "non-material";
}

/** The deterministic artifact skeleton the chain computes. For the thesis
 *  capability this IS the artifact (plus id); for the generation path the
 *  route fills the model prose through the pure assembler below. */
export interface ChainScaffold {
  feature: InsightFeature;
  subject: string;
  generatedAt: string;
  observationWindow: { from: string; to: string };
  status: InsightStatus;
  confidence: InsightConfidence;
  materiality: InsightMateriality;
  summary: string;
  whyItMatters: string;
  whatChanged: Array<{ field: string; change: string }>;
  invalidators: string[];
  evidence: InsightEvidenceItem[];
  contradictions: InsightContradiction[];
  uncertainty: string[];
  nextInvestigations: string[];
  modelStatus: InsightModelStatus;
  provenance: InsightProvenance;
}

/** The generation handoff: everything the ROUTE needs to run ONE bounded
 *  loop turn and assemble the artifact. No router types cross this
 *  boundary — the route owns that call. */
export interface ChainGenerationContext {
  changeKey: string;
  feature: InsightFeature;
  subject: string;
  scaffold: ChainScaffold;
}

export interface IntelligenceChainResult {
  refusal: IntelligenceChainRefusal | null;
  /** thesis: the composed deterministic artifact. insight: a cache hit
   *  (parsed through the ONE A1 parser) — never a fabricated one. */
  insight: RishiInsight | null;
  changeKey: string | null;
  cached: boolean;
  /** insight miss + A4-material: the generation handoff (null otherwise). */
  generation: ChainGenerationContext | null;
  // ── audit trail: the chain's own composition, exposed verbatim ──
  events: IntelligenceEvent[];
  verdicts: MaterialityVerdict[];
  thesis: ThesisState;
  changeSince: ChangeSinceResult;
  material: boolean;
}

// ── deterministic helpers (no clocks, no randomness) ────────────────────────

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** recordedAt ascending, ties by changeId ascending — the A6 ordering
 *  rule, reused so the chain never trusts input order. */
function orderedRows(rows: readonly StateLogRow[]): StateLogRow[] {
  return [...rows].sort((a, b) => {
    const at = a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0;
    if (at !== 0) return at;
    return a.changeId < b.changeId ? -1 : a.changeId > b.changeId ? 1 : 0;
  });
}

/**
 * Per UTC calendar day (of recordedAt), the LAST finite non-negative
 * new_value is that day's close. Days emerge in ascending order because
 * the input is ordered first. Prices and share volumes are non-negative
 * physical quantities — a negative or non-numeric value is corrupt input
 * and is skipped (the A4 legs refuse it too; never scaled into a series).
 */
function dayClosesOf(rows: readonly StateLogRow[]): number[] {
  const ordered = orderedRows(rows);
  const byDay = new Map<string, number>();
  for (const r of ordered) {
    if (!isFiniteNumber(r.newValue) || r.newValue < 0) continue;
    if (typeof r.recordedAt !== "string" || r.recordedAt.length < 10) continue;
    byDay.set(r.recordedAt.slice(0, 10), r.newValue);
  }
  return [...byDay.values()];
}

/** The 20-day decimal return series (A4's priceBaseline), or undefined
 *  when the history cannot scale one (fewer than two closes — A4's own
 *  insufficient-history abstention then holds). */
function priceBaselineOf(rows: readonly StateLogRow[]): PriceBaseline | undefined {
  const closes = dayClosesOf(rows);
  if (closes.length < 2) return undefined;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (a === 0) continue; // a zero close cannot scale a return
    returns.push((b - a) / Math.abs(a));
  }
  const window = returns.slice(-MATERIALITY_THRESHOLDS.returnsWindow);
  return window.length > 0 ? { dailyReturns: window } : undefined;
}

/** The 20-day volume series (A4's volumeBaseline), or undefined when the
 *  history cannot scale one. */
function volumeBaselineOf(rows: readonly StateLogRow[]): VolumeBaseline | undefined {
  const window = dayClosesOf(rows).slice(-MATERIALITY_THRESHOLDS.volumeWindow);
  return window.length > 0 ? { dailyVolumes: window } : undefined;
}

function formatNumber(n: number): string {
  return String(n);
}

/** The fact's source label under the A1 vocabulary. "live-undated" is a
 *  live observation whose upstream disclosed no time — the A1 fact
 *  vocabulary has no such marker, so the source label is OMITTED (never
 *  upgraded to "live"); the null observedAt carries the disclosure. */
function factSourceOf(
  sourceState: string,
): "live" | "derived" | "seed" | undefined {
  if (sourceState === "live") return "live";
  if (sourceState === "derived") return "derived";
  if (sourceState === "seed") return "seed";
  return undefined;
}

function deterministicLineFor(event: IntelligenceEvent): string {
  const head = `${event.field} (${event.category.toLowerCase()}, ${event.source})`;
  const oldV = event.oldValue;
  const newV = event.newValue;
  const newTail = isFiniteNumber(newV) ? formatNumber(newV) : String(newV);
  if (isFiniteNumber(oldV)) {
    return `${head}: ${formatNumber(oldV)} -> ${newTail} ${event.unit}`;
  }
  return `${head}: ${newTail} ${event.unit} (first observed value)`;
}

// ── the deterministic scaffold ──────────────────────────────────────────────

function composeScaffold(args: {
  subject: string;
  nowIso: string;
  events: readonly IntelligenceEvent[];
  verdicts: readonly MaterialityVerdict[];
  thesis: ThesisState;
  changeSince: ChangeSinceResult;
  changeKey: string | null;
  rows: readonly StateLogRow[];
}): ChainScaffold {
  const { subject, nowIso, events, verdicts, thesis, changeSince, changeKey, rows } = args;

  // Window: the oldest recorded observation through the caller's clock.
  // Row timestamps arrive in the reader's verbatim form (PostgREST emits
  // "+00:00" offsets); the A1 contract's window fields demand the UTC
  // "Z" form — normalized through the caller clock here (production-shape
  // repair, 2026-10-09: an unparseable stamp degrades the window to the
  // caller clock; it never fabricates a past).
  const recordedAsc = orderedRows(rows).map((r) => r.recordedAt);
  const oldest = recordedAsc.length > 0 ? recordedAsc[0] : nowIso;
  const oldestMs = Date.parse(oldest);
  const nowMsRef = Date.parse(nowIso);
  const windowFrom =
    Number.isFinite(oldestMs) && Number.isFinite(nowMsRef) && oldestMs <= nowMsRef
      ? new Date(oldestMs).toISOString()
      : nowIso;

  // Status (deterministic mapping of the A5 ledger):
  //   conflicts -> "conflict" (the biconditional holds by construction);
  //   any ledger contribution -> "ok";
  //   an empty ledger (no observations, or none survived A4) -> "unknown"
  //   — the unknown stays unknown, never fabricated.
  const ledgerCount =
    thesis.supports.length +
    thesis.weakens.length +
    thesis.invalidators.length;
  const status: InsightStatus =
    thesis.conflicts.length > 0
      ? "conflict"
      : ledgerCount > 0
        ? "ok"
        : "unknown";

  // Materiality is set ONLY by the A4 verdict mapping: any material
  // verdict makes the artifact's materiality "high"; otherwise "low"
  // (A4's verdicts are binary — no invented middle band).
  const material = verdicts.some((v) => aiSpendAllowed(v));
  const materiality: InsightMateriality = material ? "high" : "low";

  // Evidence: the MATERIAL events (the ledger's backing), as A1 items with
  // server-owned ids. Beyond the A1 cap of 32 the most recent are kept and
  // contradictions are filtered to pairs that survive (schema-safe,
  // deterministic).
  const materialEvents = orderedRowsByEvent(
    events.filter((_, i) => aiSpendAllowed(verdicts[i])),
  );
  const kept = materialEvents.slice(-32);
  const evidence: InsightEvidenceItem[] = kept.map((event) => {
    const item: InsightEvidenceItem = {
      id: event.id,
      text: deterministicLineFor(event),
      facts: [
        {
          field: event.field,
          value: event.newValue as number,
          unit: event.unit,
          observedAt: event.observedAt,
          ...(factSourceOf(event.sourceState) !== undefined
            ? { source: factSourceOf(event.sourceState) }
            : {}),
        },
      ],
    };
    return item;
  });
  const keptIds = new Set(kept.map((e) => e.id));
  const contradictions: InsightContradiction[] = thesis.conflicts
    .filter((c) => keptIds.has(c.positiveEventId) && keptIds.has(c.negativeEventId))
    .slice(0, 8)
    .map((c) => ({
      field: c.category.toLowerCase(),
      items: [c.positiveEventId, c.negativeEventId],
      description: `Same-category (${c.category}) evidence points in opposite directions: ${c.positiveEventId} vs ${c.negativeEventId}.`,
    }));

  // whatChanged: per field (sorted), the latest material event's verbatim
  // old -> new line — the numbers come from the chain's typed facts (the
  // same facts evidence[] carries), never composed text.
  const latestMaterialByField = new Map<string, IntelligenceEvent>();
  for (const event of kept) {
    const prev = latestMaterialByField.get(event.field);
    if (!prev || !eventIsBefore(event, prev)) {
      latestMaterialByField.set(event.field, event);
    }
  }
  const whatChanged = [...latestMaterialByField.keys()]
    .sort()
    .slice(0, 24)
    .map((field) => {
      const event = latestMaterialByField.get(field) as IntelligenceEvent;
      const oldV = event.oldValue;
      const newV = event.newValue;
      const newTail = isFiniteNumber(newV) ? formatNumber(newV) : String(newV);
      const change = isFiniteNumber(oldV)
        ? `${formatNumber(oldV)} -> ${newTail} ${event.unit}`
        : `first observation: ${newTail} ${event.unit}`;
      return { field, change };
    });

  // Prose: fixed deterministic templates — one honest paragraph each, no
  // model involvement (the artifact discloses exactly what it is).
  const nonMaterial = verdicts.filter((v) => !aiSpendAllowed(v));
  const summary = `${subject}: ${thesis.detail}. ${changeSince.detail}.`;
  // INT-RECONCILE: the totals sentence states each count with its OWN
  // scope so the reader can reconcile the summary's adjacent numbers
  // (e.g. excluded=928 events vs transitionsSince=925) without composed
  // arithmetic: the in-window transitions (A6: rows strictly after the
  // window start), the window-start baseline rows (rows AT the oldest
  // recorded timestamp — the warmer's batch write shape), and the
  // projected events (A3's 1:1 non-seed projection). When nothing
  // qualified as material, the empty whatChanged/evidence ledger is
  // EXPLAINED BY VERDICT — never left to read as a projection loss.
  const boundaryRowCount =
    recordedAsc.length > 0
      ? rows.filter((r) => r.recordedAt === recordedAsc[0]).length
      : 0;
  const whyItMatters =
    `Deterministic composition of the observation chain for ${subject}: the ledger counts only transitions the materiality engine classified as material, so the state above is computed, not opined. ` +
    `Totals: ${changeSince.totals.transitionsSince} in-window transition(s) across ${changeSince.totals.fieldsTracked} tracked field(s), ${boundaryRowCount} window-start baseline row(s), ${events.length} projected event(s).` +
    (kept.length === 0 && events.length > 0
      ? ` No event qualified as material, so whatChanged and the evidence ledger are empty by A4 verdict, never by data loss — the exclusion breakdown under uncertainty accounts for every event.`
      : "");
  // INT-A8-PRES: the per-reason exclusion breakdown, derived from A4's
  // ACTUAL verdicts (verdict.reason — read verbatim, never parsed from
  // text, never invented): one total line, then one line per OBSERVED
  // non-material reason, each prefixed "Of those," so the breakdown
  // states its partition relation — the per-reason classes are a
  // disjoint, complete partition of the total line's count, never
  // additive with it (the INT-RECONCILE repair: the founder's 928/928
  // audit — two lines citing the same number read as a double-count
  // until the subset relation is explicit). Below-threshold stays
  // distinguished from the fail-closed refusals. Worst case (all 8
  // refusal reasons observed) is 1 total + 1 below-threshold + 8
  // refusal lines = 10, exactly the A1 uncertainty bound — pinned
  // statically in the suite so a future A4 vocabulary change that
  // would overflow fails there. The carrier stays string[] (the A1
  // schema is untouched; old cached artifacts remain valid).
  const byReason = new Map<string, number>();
  for (const v of nonMaterial) byReason.set(v.reason, (byReason.get(v.reason) ?? 0) + 1);
  const uncertainty: string[] = [];
  if (nonMaterial.length > 0) {
    uncertainty.push(
      `${nonMaterial.length} observed transition(s) did not qualify as material evidence in this window and are excluded from the ledger.`,
    );
    // INT-A8-REC: every breakdown line binds itself to line 1's total —
    // "Of those excluded" — so the counts read as the PARTITION they are
    // (below-threshold + the fail-closed refusals == the total) and never
    // as a second, disjoint population. The numbers are unchanged; only
    // the binding is made legible. Σ(breakdown) == total holds by
    // construction (byReason covers every non-material verdict) and is
    // pinned in the suite alongside the summary's excluded counter (A5's
    // exclusion set is exactly A4's non-material set on this path — every
    // A5 exclusion class is pre-refused by A4). Worst case stays
    // 1 total + 1 below-threshold + 8 refusal lines = 10, the A1 bound.
    const below = byReason.get("below-threshold") ?? 0;
    if (below > 0) {
      uncertainty.push(`Of those excluded: ${below} transition(s) were evaluated and fell below every pre-registered materiality threshold.`);
    }
    for (const reason of NON_MATERIAL_REFUSAL_ORDER) {
      const n = byReason.get(reason);
      if (n) uncertainty.push(`Of those excluded: ${n} transition(s) were refused fail-closed by the materiality engine (${reason}).`);
    }
  }
  const invalidators = thesis.invalidators.map(
    (item) => `${item.eventId} invalidates the tracked premise (${item.category}:${item.field}).`,
  );

  const scaffold: ChainScaffold = {
    feature: CHAIN_FEATURE,
    subject,
    generatedAt: nowIso,
    observationWindow: { from: windowFrom, to: nowIso },
    status,
    confidence: "low", // re-derived below from the final shape
    materiality,
    summary,
    whyItMatters,
    whatChanged,
    invalidators,
    evidence,
    contradictions,
    uncertainty,
    nextInvestigations: [],
    modelStatus: "deterministic",
    provenance: {
      synthesisPath: "deterministic",
      ...(changeKey ? { changeKey } : {}),
    },
  };
  scaffold.confidence = deriveInsightConfidence({
    status,
    modelStatus: scaffold.modelStatus,
    evidence,
  });
  return scaffold;
}

/** Event ordering: recordedAt ascending, ties by event id ascending — the
 *  chain's stable rule (input array order is never trusted). */
function eventIsBefore(a: IntelligenceEvent, b: IntelligenceEvent): boolean {
  const at = a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0;
  if (at !== 0) return at < 0;
  return a.id < b.id;
}

function orderedRowsByEvent(events: readonly IntelligenceEvent[]): IntelligenceEvent[] {
  return [...events].sort((a, b) => (eventIsBefore(a, b) ? -1 : eventIsBefore(b, a) ? 1 : 0));
}

// ── the pure prose assembler (generation path) ──────────────────────────────

/** The route's model output, reduced to plain data before it crosses this
 *  boundary (the route owns the ONE router call; this module owns none). */
export interface ModelProseInput {
  /** The router's grounded answer text (claims validated against the
   *  evidence the route passed). */
  answer: string;
  provider: string;
  model: string;
  /** The route's clock at synthesis time (ISO inside). */
  synthesizedAtMs: number;
  claimsVerified: boolean;
  claimCount: number;
  uncertainties: readonly unknown[];
}

/**
 * Fill the scaffold with the model prose and validate through the ONE A1
 * parser. Parse-or-null: an artifact that fails the contract is REFUSED
 * (never served, never cached — the route maps null to the honest 404).
 *
 * Field provenance (the pre-registration, verbatim):
 *   - summary      = the model's grounded answer text (what changed/why,
 *     claim-grounded by the router's validator);
 *   - uncertainty  = the model's uncertainty lines that fit the A1 bounds
 *     (oversized/empty lines are dropped by the boundary, never edited);
 *   - whyItMatters / nextInvestigations stay DETERMINISTIC in Phase A —
 *     the deterministic layer may compute any field; the model is merely
 *     RESTRICTED to the prose families (never numbers, never materiality);
 *   - modelStatus  = "model-grounded" only under the T52 invariant
 *     (claimsVerified && claims > 0); otherwise "model-unvalidated";
 *   - confidence   = re-derived by the A1 rule (high is unreachable for
 *     unvalidated synthesis — the schema enforces the structural half).
 */
export function assembleInsightArtifact(
  scaffold: ChainScaffold,
  prose: ModelProseInput,
): RishiInsight | null {
  const grounded = prose.claimsVerified && prose.claimCount > 0;
  const modelStatus: InsightModelStatus = grounded
    ? "model-grounded"
    : "model-unvalidated";
  const uncertainty = prose.uncertainties
    .filter(
      (u): u is string =>
        typeof u === "string" && u.trim().length >= 1 && u.trim().length <= 300,
    )
    .map((u) => u.trim())
    .slice(0, 10);
  const candidate = {
    id: `insight:${scaffold.feature}:${scaffold.subject}`,
    feature: scaffold.feature,
    subject: scaffold.subject,
    generatedAt: scaffold.generatedAt,
    observationWindow: scaffold.observationWindow,
    status: scaffold.status,
    confidence: deriveInsightConfidence({
      status: scaffold.status,
      modelStatus,
      evidence: scaffold.evidence,
    }),
    materiality: scaffold.materiality,
    summary: prose.answer.trim(),
    whyItMatters: scaffold.whyItMatters,
    whatChanged: scaffold.whatChanged,
    invalidators: scaffold.invalidators,
    evidence: scaffold.evidence,
    contradictions: scaffold.contradictions,
    uncertainty,
    nextInvestigations: scaffold.nextInvestigations,
    provenance: {
      synthesisPath: "bounded-model" as const,
      ...(scaffold.provenance.changeKey
        ? { changeKey: scaffold.provenance.changeKey }
        : {}),
      provider: prose.provider,
      model: prose.model,
      synthesizedAt: new Date(prose.synthesizedAtMs).toISOString(),
    },
    modelStatus,
  };
  return parseRishiInsight(candidate);
}

// ── the runner ──────────────────────────────────────────────────────────────

/**
 * Compose the substrate for one (capability, subject) request. Throws on
 * infrastructure failure (the A2 reader and the A7 cache reader throw —
 * the route maps throws to the honest 503); returns named refusals for
 * every fail-closed case in the pre-registration table.
 */
export async function runIntelligenceChain(input: {
  capability: IntelligenceCapability;
  subject: string;
  nowMs: number;
}): Promise<IntelligenceChainResult> {
  const capability = input.capability;
  const subject = input.subject.trim();
  const nowMs = input.nowMs;
  const nowIso = new Date(nowMs).toISOString();

  // Subject shape guard (the registry gate already ran in the route; the
  // chain refuses a shape that cannot anchor an artifact or a key).
  if (subject.length === 0 || subject.length > 80) {
    return {
      refusal: { kind: "generation-refused", reason: "non-material" },
      insight: null,
      changeKey: null,
      cached: false,
      generation: null,
      events: [],
      verdicts: [],
      thesis: {
        entity: null,
        state: "UNCLEAR",
        supports: [],
        weakens: [],
        conflicts: [],
        invalidators: [],
        detail: "thesis: no evidence",
      },
      changeSince: computeChangeSince([], { since: nowIso }),
      material: false,
    };
  }

  // A2 — the ONE history reader, one call per tracked field.
  const entity = `${ENTITY_PREFIX}${subject}`;
  const perField: StateLogRow[][] = [];
  for (const field of CHAIN_FIELDS) {
    perField.push(await readStateHistory(entity, field, { limit: 500 }));
  }
  const rows = perField.flat();

  // A3 — the ONE event projection.
  const events = projectEvents(rows);

  // A4 — the ONE materiality engine (baselines derived from the SAME
  // rows; no freshness policy — see the header note).
  const ctx: MaterialityContext = {
    asOf: nowIso,
    priceBaseline: priceBaselineOf(perField[CHAIN_FIELDS.indexOf("price")] ?? []),
    volumeBaseline: volumeBaselineOf(
      perField[CHAIN_FIELDS.indexOf("volume24h")] ?? [],
    ),
  };
  const verdicts = classifyEvents(events, ctx);
  const material = verdicts.some((v) => aiSpendAllowed(v));

  // A5 — the ONE thesis state.
  const thesis = buildThesisState(
    events.map((event, i) => ({ event, materiality: verdicts[i] })),
    { asOf: nowIso },
  );

  // A6 — the ONE delta computation (window = oldest recorded observation
  // through now; exposed for audit and the deterministic prose).
  const recordedAsc = orderedRows(rows).map((r) => r.recordedAt);
  const windowFrom = recordedAsc.length > 0 ? recordedAsc[0] : nowIso;
  const since = windowFrom <= nowIso ? windowFrom : nowIso;
  const changeSince = computeChangeSince(rows, { since });

  // A7 — the ONE change key (over the event changeIds).
  const changeIds = events.flatMap((e) => e.evidenceRefs);
  const changeKey = changeKeyOf({
    feature: CHAIN_FEATURE,
    subject,
    changeIds,
  });

  const chainAudit = { events, verdicts, thesis, changeSince, material };

  if (capability === "thesis") {
    // Deterministic artifact — zero AI by construction (no model surface
    // exists in this module). A contract refusal here is a bug, not a
    // serving state: it throws and the route answers 503.
    const scaffold = composeScaffold({
      subject,
      nowIso,
      events,
      verdicts,
      thesis,
      changeSince,
      changeKey,
      rows,
    });
    const insight = parseRishiInsight({
      id: `insight:${CHAIN_FEATURE}:${subject}`,
      feature: scaffold.feature,
      subject: scaffold.subject,
      generatedAt: scaffold.generatedAt,
      observationWindow: scaffold.observationWindow,
      status: scaffold.status,
      confidence: scaffold.confidence,
      materiality: scaffold.materiality,
      summary: scaffold.summary,
      whyItMatters: scaffold.whyItMatters,
      whatChanged: scaffold.whatChanged,
      invalidators: scaffold.invalidators,
      evidence: scaffold.evidence,
      contradictions: scaffold.contradictions,
      uncertainty: scaffold.uncertainty,
      nextInvestigations: scaffold.nextInvestigations,
      provenance: scaffold.provenance,
      modelStatus: scaffold.modelStatus,
    });
    if (!insight) {
      throw new Error(
        "intelligence chain: deterministic artifact refused by the A1 contract",
      );
    }
    return {
      refusal: null,
      insight,
      changeKey,
      cached: false,
      generation: null,
      ...chainAudit,
    };
  }

  // capability === "insight" — the persistent insight.
  // The A4 economic gate runs BEFORE any cache read or spend: a
  // non-material chain refuses generation with ZERO AI cost (the test
  // pins the order — the cache is never consulted on this path).
  if (!material || !changeKey) {
    return {
      refusal: { kind: "generation-refused", reason: "non-material" },
      insight: null,
      changeKey,
      cached: false,
      generation: null,
      ...chainAudit,
    };
  }

  // Cache hit: parse-or-serve through the ONE A1 parser. A malformed
  // stored payload is treated as a miss (the cache is corrupt for this
  // key; regeneration is the honest recovery) — never served raw.
  const cachedRecord = await readCachedInsight(changeKey);
  if (cachedRecord) {
    const parsed = parseRishiInsight(cachedRecord.payload);
    if (parsed) {
      return {
        refusal: null,
        insight: parsed,
        changeKey,
        cached: true,
        generation: null,
        ...chainAudit,
      };
    }
  }

  // Cache miss on a material chain: hand the deterministic scaffold to the
  // route for ONE bounded-loop generation. The scaffold's prose is
  // deterministic; the route may fill ONLY the model prose families
  // through the pure assembler above.
  const scaffold = composeScaffold({
    subject,
    nowIso,
    events,
    verdicts,
    thesis,
    changeSince,
    changeKey,
    rows,
  });
  return {
    refusal: null,
    insight: null,
    changeKey,
    cached: false,
    generation: { changeKey, feature: CHAIN_FEATURE, subject, scaffold },
    ...chainAudit,
  };
}
