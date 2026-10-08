import { describe, expect, it } from "vitest";
import {
  EVENT_CATEGORIES,
  MATERIALITY_THRESHOLDS,
  assessMateriality,
  eventConfidenceOf,
  projectEvent,
  projectEvents,
  materialEventsOf,
  type IntelligenceEvent,
} from "@/lib/intelligence/events";
import type { StateLogRow, StateSourceState } from "@/lib/intelligence/stateLog";

/**
 * Phase A, item 3 — the event model + deterministic materiality
 * (founder round-27 directions 16–19).
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the RED proof for a new contract module (PA1
 * precedent). Every negative case below is a gate-bites proof: the
 * materiality engine must refuse to inflate, the projection must refuse
 * to mis-categorize, and the vocabulary must stay exactly the founder's
 * 14 categories.
 */

const ROW = (over: Partial<StateLogRow> = {}): StateLogRow => ({
  changeId: "c".repeat(64),
  entity: "stock:RELIANCE",
  field: "price",
  observedAt: "2026-10-08T04:07:00.000Z",
  recordedAt: "2026-10-08T04:07:12.000Z",
  source: "nse",
  unit: "inr",
  sourceState: "live",
  oldValue: 1000,
  newValue: 1060,
  ...over,
});

describe("the closed event vocabulary (direction 19 — exact)", () => {
  it("is exactly the founder's 14 categories, in order", () => {
    expect([...EVENT_CATEGORIES]).toEqual([
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
    ]);
  });
});

describe("the projection (deterministic, fail-closed)", () => {
  it("maps the PA2 quote fields: price and change -> PRICE, volume24h -> VOLUME", () => {
    expect(projectEvent(ROW({ field: "price" }))?.category).toBe("PRICE");
    expect(projectEvent(ROW({ field: "change", unit: "percent" }))?.category).toBe("PRICE");
    expect(projectEvent(ROW({ field: "volume24h", unit: "shares" }))?.category).toBe("VOLUME");
  });

  it("an unmapped field projects to NO event (never a mis-categorized one)", () => {
    expect(projectEvent(ROW({ field: "someFutureField" }))).toBeNull();
    expect(projectEvents([ROW({ field: "pe_ratio" })])).toEqual([]);
  });

  it("the event id is deterministic and carries the evidence reference", () => {
    const evt = projectEvent(ROW());
    expect(evt?.id).toBe(`evt:PRICE:${"c".repeat(64)}`);
    expect(evt?.evidenceRefs).toEqual(["c".repeat(64)]);
    expect(projectEvent(ROW())?.id).toBe(evt?.id);
  });

  it("the common event fields are carried verbatim (entity, clocks, source, states)", () => {
    const evt = projectEvent(
      ROW({ observedAt: null, source: "yahoo", sourceState: "live-undated", oldValue: null }),
    );
    expect(evt?.entity).toBe("stock:RELIANCE");
    expect(evt?.observedAt).toBeNull(); // honest null, never fabricated
    expect(evt?.recordedAt).toBe("2026-10-08T04:07:12.000Z");
    expect(evt?.source).toBe("yahoo");
    expect(evt?.sourceState).toBe("live-undated");
    expect(evt?.oldValue).toBeNull();
  });

  it("projection is pure: same rows in, deep-equal events out; input not mutated", () => {
    const rows = [
      ROW({ field: "price", changeId: "a".repeat(64) }),
      ROW({ field: "volume24h", unit: "shares", changeId: "b".repeat(64) }),
      ROW({ field: "nope", changeId: "d".repeat(64) }),
    ];
    const snapshot = JSON.stringify(rows);
    const first = projectEvents(rows);
    const second = projectEvents(rows);
    expect(first).toEqual(second);
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(first.map((e) => e.category)).toEqual(["PRICE", "VOLUME"]);
  });
});

describe("the materiality engine (direction 18 — pure deterministic logic)", () => {
  it("first observation (no prior value) is LOW — an honest beginning, not a move", () => {
    const m = assessMateriality({ field: "price", oldValue: null, newValue: 5000, sourceState: "live" });
    expect(m.level).toBe("low");
    expect(m.reasons).toContain(
      "first observation (no prior value — an honest beginning, not a move)",
    );
  });

  it("a non-comparable prior (non-numeric or <= 0) is LOW, never an inflated percentage", () => {
    for (const oldV of [0, -5, "1,000" as unknown, undefined]) {
      const m = assessMateriality({ field: "price", oldValue: oldV, newValue: 100, sourceState: "live" });
      expect(m.level).toBe("low");
      expect(m.reasons).toEqual([
        "no comparable prior value (prior is null, non-numeric or non-positive)",
      ]);
    }
  });

  it("price: relative thresholds 5% -> high, 2% -> medium, below -> low", () => {
    expect(
      assessMateriality({ field: "price", oldValue: 1000, newValue: 1060, sourceState: "live" }).level,
    ).toBe("high");
    expect(
      assessMateriality({ field: "price", oldValue: 1000, newValue: 1025, sourceState: "live" }).level,
    ).toBe("medium");
    expect(
      assessMateriality({ field: "price", oldValue: 1000, newValue: 1005, sourceState: "live" }).level,
    ).toBe("low");
    // downward moves are symmetric (magnitude, not direction)
    expect(
      assessMateriality({ field: "price", oldValue: 1000, newValue: 940, sourceState: "live" }).level,
    ).toBe("high");
  });

  it("change: ABSOLUTE thresholds in percentage points (5 -> high, 2 -> medium)", () => {
    expect(
      assessMateriality({ field: "change", oldValue: 0.5, newValue: 5.5, sourceState: "live" }).level,
    ).toBe("high");
    expect(
      assessMateriality({ field: "change", oldValue: 0.5, newValue: -5.5, sourceState: "live" }).level,
    ).toBe("high");
    expect(
      assessMateriality({ field: "change", oldValue: 0.5, newValue: 2.5, sourceState: "live" }).level,
    ).toBe("medium");
    expect(
      assessMateriality({ field: "change", oldValue: 0.5, newValue: 1.2, sourceState: "live" }).level,
    ).toBe("low");
  });

  it("volume24h: relative thresholds 50% -> high, 20% -> medium", () => {
    expect(
      assessMateriality({ field: "volume24h", oldValue: 1_000_000, newValue: 1_600_000, sourceState: "live" }).level,
    ).toBe("high");
    expect(
      assessMateriality({ field: "volume24h", oldValue: 1_000_000, newValue: 1_250_000, sourceState: "live" }).level,
    ).toBe("medium");
    expect(
      assessMateriality({ field: "volume24h", oldValue: 1_000_000, newValue: 1_050_000, sourceState: "live" }).level,
    ).toBe("low");
  });

  it("a non-live source CAPS materiality at medium — provenance first (direction 24)", () => {
    const m = assessMateriality({
      field: "price",
      oldValue: 1000,
      newValue: 1200, // +20% — would be high on live data
      sourceState: "seed",
    });
    expect(m.level).toBe("medium");
    expect(m.reasons).toContain("non-live source caps materiality at medium");
    // live and live-undated are NOT capped
    expect(
      assessMateriality({ field: "price", oldValue: 1000, newValue: 1200, sourceState: "live" }).level,
    ).toBe("high");
    expect(
      assessMateriality({ field: "price", oldValue: 1000, newValue: 1200, sourceState: "live-undated" }).level,
    ).toBe("high");
  });

  it("the declared v1 thresholds are the constants the engine uses (no hidden numbers)", () => {
    expect(MATERIALITY_THRESHOLDS).toEqual({
      price: { high: 0.05, medium: 0.02 },
      change: { high: 5, medium: 2 },
      volume24h: { high: 0.5, medium: 0.2 },
    });
  });

  it("the verdict is pure: same inputs, same verdict", () => {
    const input = { field: "price", oldValue: 1000, newValue: 1030, sourceState: "live" as StateSourceState };
    expect(assessMateriality(input)).toEqual(assessMateriality(input));
  });
});

describe("event confidence (deterministic, closed map)", () => {
  it("maps every source state exactly once", () => {
    expect(eventConfidenceOf("live")).toBe("high");
    expect(eventConfidenceOf("live-undated")).toBe("moderate");
    expect(eventConfidenceOf("derived")).toBe("moderate");
    expect(eventConfidenceOf("seed")).toBe("low");
    expect(eventConfidenceOf("unavailable")).toBe("low");
  });
});

describe("the material set (what the bounded loop may ever interpret)", () => {
  it("filters low-materiality events; only medium/high remain", () => {
    const events: IntelligenceEvent[] = projectEvents([
      ROW({ field: "price", oldValue: 1000, newValue: 1060, changeId: "a".repeat(64) }), // high
      ROW({ field: "price", oldValue: 1000, newValue: 1005, changeId: "b".repeat(64) }), // low
      ROW({ field: "volume24h", unit: "shares", oldValue: 1_000_000, newValue: 1_250_000, changeId: "c".repeat(64) }), // medium
      ROW({ field: "price", oldValue: null, newValue: 2000, changeId: "e".repeat(64) }), // first obs -> low
    ]);
    const material = materialEventsOf(events);
    expect(material.map((e) => e.id)).toEqual([
      `evt:PRICE:${"a".repeat(64)}`,
      `evt:VOLUME:${"c".repeat(64)}`,
    ]);
  });
});
