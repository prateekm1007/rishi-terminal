import { describe, expect, it } from "vitest";
import {
  EVENT_CATEGORIES,
  eventConfidenceOf,
  projectEvent,
  projectEvents,
  type IntelligenceEvent,
} from "@/lib/intelligence/events";
import type { StateLogRow } from "@/lib/intelligence/stateLog";

/**
 * INT-A3 — the deterministic event projection (roadmap item A3).
 *
 * Scope of THIS module (one roadmap item, one PR — the entropy-locked
 * roadmap, docs/INTELLIGENCE_ROADMAP.md): the closed event vocabulary and
 * the PURE projection of PA2's observation_state_log rows into typed
 * events. The deterministic materiality ENGINE is roadmap item A4
 * (lib/intelligence/materiality.ts, its own PR) — A3's event carries the
 * transition verbatim; A4 classifies its magnitude.
 *
 * Founder directions (round-27, 16–19): events are DETERMINISTIC
 * PROJECTIONS of state transitions, carrying entity, timestamp, source,
 * old state, new state, confidence, and evidence references. The common
 * event vocabulary is CLOSED at 14 categories. Events are derived views,
 * never a second history system (nothing is persisted here).
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the RED proof for a new contract module (PA1
 * precedent). Every negative case below is a gate-bites proof: the
 * projection must refuse to mis-categorize, and the vocabulary must stay
 * exactly the founder's 14 categories.
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

  it("A3 scope discipline: the projected event carries NO materiality verdict (A4's engine owns it)", () => {
    // The entropy-locked roadmap separates A3 (projection) from A4
    // (materiality). A3's event must not smuggle a magnitude opinion:
    // the event's key set is CLOSED — no "materiality", no "importance",
    // no "impact", no "significance", no "magnitude", no future A4
    // semantic of any name (round-28 audit: the exact-key-set form is
    // the entropy lock; a single banned word can be spelled around).
    const evt = projectEvent(ROW()) as IntelligenceEvent;
    expect(Object.keys(evt).sort()).toEqual(
      [
        "id",
        "category",
        "entity",
        "field",
        "unit",
        "observedAt",
        "recordedAt",
        "source",
        "sourceState",
        "oldValue",
        "newValue",
        "confidence",
        "evidenceRefs",
      ].sort(),
    );
  });

  it("seed source-state projects to NO event (reference data is not an observation)", () => {
    // Founder round-28 direction 6/7: "seed-derived state → no event".
    // The state LOG may legitimately record seed-sourced transitions
    // (future fundamentals/reference writers hook it for traceability),
    // but the EVENT stream is the observation stream that A4 materiality
    // and the AI synthesis eligibility feed on. Projecting a seed row
    // would launder reference data into the intelligence stream — the
    // placeholder-as-live sin (B-04) at the substrate level.
    expect(projectEvent(ROW({ sourceState: "seed" }))).toBeNull();
    expect(
      projectEvents([
        ROW({ field: "price", changeId: "a".repeat(64) }),
        ROW({ field: "price", sourceState: "seed", changeId: "b".repeat(64) }),
        ROW({ field: "volume24h", unit: "shares", changeId: "c".repeat(64) }),
      ]).map((e) => e.id),
    ).toEqual([`evt:PRICE:${"a".repeat(64)}`, `evt:VOLUME:${"c".repeat(64)}`]);
  });

  it("same input → byte-stable output (JSON-identical across calls)", () => {
    const rows = [
      ROW({ field: "price", changeId: "a".repeat(64) }),
      ROW({ field: "volume24h", unit: "shares", changeId: "b".repeat(64) }),
    ];
    const first = JSON.stringify(projectEvents(rows));
    const second = JSON.stringify(projectEvents(rows));
    expect(first).toBe(second);
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
