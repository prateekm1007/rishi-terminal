import { describe, expect, it } from "vitest";
import {
  THESIS_DIRECTION_CATEGORIES,
  THESIS_INVALIDATOR_RULES,
  THESIS_STATES,
  buildThesisState,
  type ThesisConflict,
  type ThesisContext,
  type ThesisEvidenceItem,
  type ThesisInput,
} from "@/lib/intelligence/thesis";
import { classifyEvent, type MaterialityVerdict } from "@/lib/intelligence/materiality";
import type { IntelligenceEvent } from "@/lib/intelligence/events";

/**
 * INT-A5 — the deterministic thesis-state model (roadmap item A5).
 *
 * Founder direction (verbatim): `lib/intelligence/thesis.ts`:
 * supports[], weakens[], conflicts[], invalidators[], a deterministic
 * state (IMPROVING, MIXED, DETERIORATING, UNCLEAR) from weighted
 * material evidence and freshness. The model never chooses the state.
 *
 * Acceptance (founder): the synthetic-world cases (growth up, margin
 * down, price up -> MIXED), plus a test that a model-supplied state is
 * ignored.
 *
 * Input contract: (A3 event, A4 verdict) pairs. The module NEVER
 * re-decides materiality — it consumes the ONE engine's verdicts. The
 * synthetic fundamental fixtures below carry material verdicts as the
 * documented stand-in for a future founder-confirmed A4 fundamentals
 * extension (A4 has no FUNDAMENTAL thresholds today, by design); the
 * PRICE verdicts are produced by the REAL A4 engine.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the A3/A4 precedent for a new contract module.
 */

const ASOF = "2026-10-08T05:00:00.000Z";

const EVT = (over: Partial<IntelligenceEvent> & { id: string }): IntelligenceEvent => ({
  category: "PRICE",
  entity: "stock:RELIANCE",
  field: "change",
  unit: "percent",
  observedAt: "2026-10-08T04:07:00.000Z",
  recordedAt: "2026-10-08T04:59:00.000Z",
  source: "nse",
  sourceState: "live",
  oldValue: null,
  newValue: 8,
  confidence: "high",
  evidenceRefs: [over.id.slice(-4)],
  ...over,
});

/** A material A4 verdict for `event` from the REAL engine (PRICE legs). */
const realMaterial = (event: IntelligenceEvent): MaterialityVerdict =>
  classifyEvent(event, { asOf: ASOF });

/**
 * A synthetic material verdict for categories A4 does not rule yet
 * (FUNDAMENTAL / GUIDANCE / EARNINGS). Documented stand-in for the
 * future founder-confirmed extension — the thesis module consumes the
 * verdict as given and never re-decides materiality.
 */
const syntheticMaterial = (event: IntelligenceEvent): MaterialityVerdict => ({
  verdict: "material",
  reason: "price-intraday",
  thresholdId: "price-intraday-4pct",
  category: event.category,
  eventId: event.id,
  detail: "synthetic fixture verdict (future A4 extension stand-in)",
});

const MATERIAL = (event: IntelligenceEvent): MaterialityVerdict =>
  event.category === "PRICE" ? realMaterial(event) : syntheticMaterial(event);

const INPUT = (event: IntelligenceEvent): ThesisInput => ({
  event,
  materiality: MATERIAL(event),
});

const CTX = (over: Partial<ThesisContext> = {}): ThesisContext => ({
  asOf: ASOF,
  ...over,
});

// ── the closed vocabulary (pinned) ──────────────────────────────────────────

describe("the pre-registered thesis vocabulary (founder direction, pinned)", () => {
  it("offers exactly the founder's four states, in order", () => {
    expect([...THESIS_STATES]).toEqual(["IMPROVING", "MIXED", "DETERIORATING", "UNCLEAR"]);
  });

  it("direction rules cover exactly the four signed performance categories", () => {
    expect([...THESIS_DIRECTION_CATEGORIES].sort()).toEqual(
      ["EARNINGS", "FUNDAMENTAL", "GUIDANCE", "PRICE"].sort(),
    );
  });

  it("invalidator rules are intentionally empty (never improvised)", () => {
    expect(THESIS_INVALIDATOR_RULES.size).toBe(0);
  });
});

// ── the founder's synthetic-world case ──────────────────────────────────────

describe("the founder's synthetic case: growth up, margin down, price up -> MIXED", () => {
  it("classifies MIXED with the ledgers populated and the fundamental conflict recorded", () => {
    const growthUp = EVT({
      id: "evt:FUNDAMENTAL:growth1",
      category: "FUNDAMENTAL",
      field: "revenueGrowth",
      unit: "percent",
      newValue: 20,
    });
    const marginDown = EVT({
      id: "evt:FUNDAMENTAL:margin1",
      category: "FUNDAMENTAL",
      field: "marginBp",
      unit: "percent",
      newValue: -3,
    });
    const priceUp = EVT({ id: "evt:PRICE:price1", newValue: 8 });

    const state = buildThesisState(
      [INPUT(growthUp), INPUT(marginDown), INPUT(priceUp)],
      CTX(),
    );

    expect(state.state).toBe("MIXED");
    expect(state.supports.map((s) => s.eventId)).toEqual([
      "evt:FUNDAMENTAL:growth1",
      "evt:PRICE:price1",
    ]);
    expect(state.weakens.map((s) => s.eventId)).toEqual(["evt:FUNDAMENTAL:margin1"]);
    expect(state.conflicts).toEqual([
      { category: "FUNDAMENTAL", positiveEventId: "evt:FUNDAMENTAL:growth1", negativeEventId: "evt:FUNDAMENTAL:margin1" },
    ] satisfies ThesisConflict[]);
    expect(state.invalidators).toEqual([]);
    expect(state.entity).toBe("stock:RELIANCE");
  });
});

// ── the state rule (fixed order) ────────────────────────────────────────────

describe("the deterministic state rule", () => {
  it("only support evidence -> IMPROVING", () => {
    const state = buildThesisState([INPUT(EVT({ id: "evt:PRICE:up1", newValue: 8 }))], CTX());
    expect(state.state).toBe("IMPROVING");
    expect(state.supports).toHaveLength(1);
    expect(state.weakens).toEqual([]);
    expect(state.conflicts).toEqual([]);
  });

  it("only weaken evidence -> DETERIORATING (price-field negative move)", () => {
    const down = EVT({
      id: "evt:PRICE:down1",
      field: "price",
      unit: "inr",
      oldValue: 1000,
      newValue: 900,
    });
    const state = buildThesisState([INPUT(down)], CTX());
    expect(realMaterial(down).verdict).toBe("material"); // real A4 engine agrees
    expect(state.state).toBe("DETERIORATING");
    expect(state.weakens.map((s) => s.eventId)).toEqual(["evt:PRICE:down1"]);
  });

  it("no evidence -> UNCLEAR with entity null", () => {
    const state = buildThesisState([], CTX());
    expect(state.state).toBe("UNCLEAR");
    expect(state.entity).toBeNull();
    expect(state.supports).toEqual([]);
    expect(state.weakens).toEqual([]);
    expect(state.conflicts).toEqual([]);
    expect(state.invalidators).toEqual([]);
  });
});

// ── fail-closed exclusions (all named, never guessed) ───────────────────────

describe("fail-closed exclusions", () => {
  it("non-material verdicts are excluded (the economic gate holds at thesis level)", () => {
    const small = EVT({ id: "evt:PRICE:small", newValue: 1 }); // 1% < 4% and no baseline
    const big = EVT({ id: "evt:PRICE:big", newValue: 8 });
    expect(realMaterial(small).verdict).toBe("non-material");
    const state = buildThesisState(
      [
        { event: small, materiality: realMaterial(small) },
        { event: big, materiality: realMaterial(big) },
      ],
      CTX(),
    );
    expect(state.state).toBe("IMPROVING");
    expect(state.supports.map((s) => s.eventId)).toEqual(["evt:PRICE:big"]);
    expect(state.detail).toContain("excluded=1");
  });

  it("all-non-material input -> UNCLEAR", () => {
    const small = EVT({ id: "evt:PRICE:small", newValue: 1 });
    const state = buildThesisState([{ event: small, materiality: realMaterial(small) }], CTX());
    expect(state.state).toBe("UNCLEAR");
    expect(state.detail).toContain("excluded=1");
  });

  it("stale events are excluded past the caller-stated SLO; age exactly at the SLO is fresh", () => {
    // asOf = 05:00:00Z; maxAgeMs = 300 000 (5 min).
    const atBoundary = EVT({
      id: "evt:PRICE:atboundary",
      newValue: 8,
      recordedAt: "2026-10-08T04:55:00.000Z", // age exactly 300 000 ms -> fresh
    });
    const tooOld = EVT({
      id: "evt:PRICE:tooold",
      newValue: 6,
      recordedAt: "2026-10-08T04:54:59.999Z", // age 300 001 ms -> stale
    });
    const onlyBoundary = buildThesisState(
      [{ event: atBoundary, materiality: realMaterial(atBoundary) }],
      CTX({ freshness: { maxAgeMs: 300_000 } }),
    );
    expect(onlyBoundary.state).toBe("IMPROVING");
    expect(onlyBoundary.supports.map((s) => s.eventId)).toEqual(["evt:PRICE:atboundary"]);

    const onlyStale = buildThesisState(
      [{ event: tooOld, materiality: realMaterial(tooOld) }],
      CTX({ freshness: { maxAgeMs: 300_000 } }),
    );
    expect(onlyStale.state).toBe("UNCLEAR");
    expect(onlyStale.detail).toContain("excluded=1");

    const both = buildThesisState(
      [
        { event: tooOld, materiality: realMaterial(tooOld) },
        { event: atBoundary, materiality: realMaterial(atBoundary) },
      ],
      CTX({ freshness: { maxAgeMs: 300_000 } }),
    );
    expect(both.state).toBe("IMPROVING");
    expect(both.supports.map((s) => s.eventId)).toEqual(["evt:PRICE:atboundary"]);
    expect(both.detail).toContain("excluded=1");
  });

  it("unorderable clocks are excluded under a stated freshness policy", () => {
    const future = EVT({
      id: "evt:PRICE:future",
      newValue: 8,
      recordedAt: "2026-10-08T06:00:00.000Z", // recorded after the evaluation clock
    });
    const state = buildThesisState(
      [{ event: future, materiality: realMaterial(future) }],
      CTX({ freshness: { maxAgeMs: 3_600_000 } }),
    );
    expect(state.state).toBe("UNCLEAR");
    expect(state.detail).toContain("excluded=1");
  });

  it("seed-derived and unavailable source states are excluded defence-in-depth", () => {
    const seed = EVT({ id: "evt:PRICE:seed", newValue: 8, sourceState: "seed" });
    const unavailable = EVT({ id: "evt:PRICE:unavail", newValue: 8, sourceState: "unavailable" });
    const state = buildThesisState(
      [
        { event: seed, materiality: syntheticMaterial(seed) },
        { event: unavailable, materiality: syntheticMaterial(unavailable) },
      ],
      CTX(),
    );
    expect(state.state).toBe("UNCLEAR");
    expect(state.supports).toEqual([]);
  });

  it("directionless categories contribute to no ledger (VOLUME material event)", () => {
    const vol = EVT({
      id: "evt:VOLUME:vol1",
      category: "VOLUME",
      field: "volume24h",
      unit: "shares",
      oldValue: 100,
      newValue: 300,
    });
    const verdict = classifyEvent(vol, {
      asOf: ASOF,
      volumeBaseline: { dailyVolumes: Array.from({ length: 20 }, () => 100) },
    });
    expect(verdict.verdict).toBe("material"); // real A4 engine: 3x median fires
    const state = buildThesisState([{ event: vol, materiality: verdict }], CTX());
    expect(state.state).toBe("UNCLEAR");
    expect(state.supports).toEqual([]);
    expect(state.weakens).toEqual([]);
    expect(state.detail).toContain("directionless=1");
  });

  it("mixed-entity input is refused fail-closed", () => {
    const a = EVT({ id: "evt:PRICE:a1", entity: "stock:RELIANCE", newValue: 8 });
    const b = EVT({ id: "evt:PRICE:b1", entity: "stock:TCS", newValue: 8 });
    const state = buildThesisState([INPUT(a), INPUT(b)], CTX());
    expect(state.state).toBe("UNCLEAR");
    expect(state.entity).toBeNull();
    expect(state.supports).toEqual([]);
    expect(state.detail).toContain("mixed-entity");
  });
});

// ── conflict pairing ────────────────────────────────────────────────────────

describe("conflict pairing (same-category opposite directions)", () => {
  it("cross-category opposition is ledger opposition, not a conflict pair", () => {
    const priceUp = EVT({ id: "evt:PRICE:p1", newValue: 8 });
    const marginDown = EVT({
      id: "evt:FUNDAMENTAL:m1",
      category: "FUNDAMENTAL",
      field: "marginBp",
      unit: "percent",
      newValue: -3,
    });
    const state = buildThesisState([INPUT(priceUp), INPUT(marginDown)], CTX());
    expect(state.state).toBe("MIXED");
    expect(state.conflicts).toEqual([]);
  });

  it("same-category same-direction pairs create no conflict", () => {
    const g1 = EVT({
      id: "evt:FUNDAMENTAL:g1",
      category: "FUNDAMENTAL",
      field: "revenueGrowth",
      unit: "percent",
      newValue: 20,
    });
    const g2 = EVT({
      id: "evt:FUNDAMENTAL:g2",
      category: "FUNDAMENTAL",
      field: "ebitdaGrowth",
      unit: "percent",
      newValue: 12,
    });
    const state = buildThesisState([INPUT(g1), INPUT(g2)], CTX());
    expect(state.state).toBe("IMPROVING");
    expect(state.conflicts).toEqual([]);
  });
});

// ── direction derivation (mirrors the A4 move convention) ───────────────────

describe("direction derivation", () => {
  it("change-field events derive direction from the carried datum", () => {
    const negative = EVT({ id: "evt:PRICE:neg", newValue: -6 });
    const state = buildThesisState([INPUT(negative)], CTX());
    expect(state.state).toBe("DETERIORATING");
    expect(state.weakens[0]?.direction).toBe("negative");
  });

  it("price-field events derive direction from old -> new", () => {
    const down = EVT({
      id: "evt:PRICE:pdown",
      field: "price",
      unit: "inr",
      oldValue: 1000,
      newValue: 900,
    });
    const state = buildThesisState([INPUT(down)], CTX());
    expect(state.weakens[0]?.direction).toBe("negative");
  });

  it("percent datums with no oldValue carry their own sign; level datums abstain", () => {
    const pct = EVT({
      id: "evt:FUNDAMENTAL:pct1",
      category: "FUNDAMENTAL",
      field: "revenueGrowth",
      unit: "percent",
      oldValue: null,
      newValue: 20,
    });
    const levelNoOld = EVT({
      id: "evt:FUNDAMENTAL:lvl1",
      category: "FUNDAMENTAL",
      field: "revenue",
      unit: "inr_crore",
      oldValue: null,
      newValue: 1200,
    });
    const state = buildThesisState([INPUT(pct), INPUT(levelNoOld)], CTX());
    expect(state.supports.map((s) => s.eventId)).toEqual(["evt:FUNDAMENTAL:pct1"]);
    expect(state.detail).toContain("directionless=1");
  });

  it("a zero move is directionless even when marked material", () => {
    const flat = EVT({
      id: "evt:PRICE:flat",
      field: "price",
      unit: "inr",
      oldValue: 100,
      newValue: 100,
    });
    const state = buildThesisState(
      [{ event: flat, materiality: syntheticMaterial(flat) }],
      CTX(),
    );
    expect(state.state).toBe("UNCLEAR");
    expect(state.detail).toContain("directionless=1");
  });
});

// ── the model never chooses the state ───────────────────────────────────────

describe("a model-supplied state is ignored (founder acceptance)", () => {
  it("extra model-supplied fields on the input change nothing, byte for byte", () => {
    const event = EVT({ id: "evt:PRICE:m1", newValue: 8 });
    const verdict = realMaterial(event);
    const clean: ThesisInput[] = [{ event, materiality: verdict }];
    const poisoned = [
      { event, materiality: verdict, modelSuggestedState: "IMPROVING" },
    ] as unknown as ThesisInput[];
    const poisoned2 = [
      { event, materiality: verdict, modelSuggestedState: "DETERIORATING", promptInjection: true },
    ] as unknown as ThesisInput[];

    const a = buildThesisState(clean, CTX());
    const b = buildThesisState(poisoned, CTX());
    const c = buildThesisState(poisoned2, CTX());
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(c)).toBe(JSON.stringify(a));
    expect(a.state).toBe("IMPROVING"); // computed from evidence, not echoed
  });
});

// ── determinism and shape closure ───────────────────────────────────────────

describe("determinism and closed shapes", () => {
  it("same inputs -> byte-stable state; input not mutated", () => {
    const inputs = [
      INPUT(EVT({ id: "evt:FUNDAMENTAL:g1", category: "FUNDAMENTAL", field: "revenueGrowth", unit: "percent", newValue: 20 })),
      INPUT(EVT({ id: "evt:FUNDAMENTAL:m1", category: "FUNDAMENTAL", field: "marginBp", unit: "percent", newValue: -3 })),
      INPUT(EVT({ id: "evt:PRICE:p1", newValue: 8 })),
    ];
    const snapshot = JSON.stringify(inputs);
    const first = buildThesisState(inputs, CTX());
    const second = buildThesisState(inputs, CTX());
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(inputs)).toBe(snapshot);
  });

  it("the state object carries the closed key set only", () => {
    const state = buildThesisState([INPUT(EVT({ id: "evt:PRICE:k1", newValue: 8 }))], CTX());
    expect(Object.keys(state).sort()).toEqual(
      ["conflicts", "detail", "entity", "invalidators", "state", "supports", "weakens"].sort(),
    );
    const item: ThesisEvidenceItem = state.supports[0] as ThesisEvidenceItem;
    expect(Object.keys(item).sort()).toEqual(
      ["category", "direction", "eventId", "field", "observedAt"].sort(),
    );
  });

  it("the module contains no model, fetch, clock, or randomness surface", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("lib/intelligence/thesis.ts", "utf8");
    for (const forbidden of [
      "lib/ai",
      "fetch(",
      "Model",
      "provider",
      "prompt",
      "Date.now(",
      "new Date(",
      "Math.random(",
    ]) {
      expect(src, `forbidden surface: ${forbidden}`).not.toContain(forbidden);
    }
  });
});
