import { describe, expect, it } from "vitest";
import {
  CHANGE_SINCE_STATES,
  FIELD_DIRECTIONS,
  computeChangeSince,
  type ChangeSinceResult,
  type FieldChange,
} from "@/lib/intelligence/changeSince";
import type { StateLogRow } from "@/lib/intelligence/stateLog";

/**
 * INT-A6 — the deterministic delta computation (roadmap item A6).
 *
 * Roadmap: "ChangeSince (deterministic deltas)"; consumes previous vs
 * current state (A2 rows), produces deterministic deltas. Pre-
 * registration: docs/intelligence/changeSince.md (committed BEFORE any
 * evaluation) — the boundary rule, the per-field delta rule, the state
 * rule, and the fail-closed table are all pinned here.
 *
 * Input contract: rows already fetched by A2's readers (this module is
 * pure — no I/O) for ONE entity, plus a caller-supplied `since` cutoff
 * in RECORDED time. `observedAt` is carried verbatim, never ordered by.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the A3/A4/A5 precedent for a new contract module.
 */

const SINCE = "2026-10-08T05:00:00.000Z";

const ROW = (over: Partial<StateLogRow> & { changeId: string }): StateLogRow => ({
  entity: "stock:RELIANCE",
  field: "price",
  observedAt: "2026-10-08T04:07:00.000Z",
  recordedAt: "2026-10-08T04:59:00.000Z",
  source: "nse",
  unit: "inr",
  sourceState: "live",
  oldValue: null,
  newValue: 100,
  ...over,
});

const RESULT = (rows: StateLogRow[], since = SINCE): ChangeSinceResult =>
  computeChangeSince(rows, { since });

const fieldOf = (r: ChangeSinceResult, name: string): FieldChange => {
  const f = r.fields.find((x) => x.field === name);
  if (!f) throw new Error(`no field ${name}`);
  return f;
};

// ── the closed vocabularies (pinned) ────────────────────────────────────────

describe("the pre-registered vocabularies (pinned)", () => {
  it("offers exactly the four states and four directions", () => {
    expect([...CHANGE_SINCE_STATES]).toEqual([
      "CHANGED",
      "UNCHANGED",
      "NO-DATA",
      "UNCLEAR",
    ]);
    expect([...FIELD_DIRECTIONS]).toEqual([
      "positive",
      "negative",
      "unchanged",
      "non-comparable",
    ]);
  });

  it("the result and field shapes carry the closed key sets only", () => {
    const r = RESULT([ROW({ changeId: "c1", recordedAt: "2026-10-08T05:00:01.000Z", newValue: 110 })]);
    expect(Object.keys(r).sort()).toEqual(
      ["detail", "entity", "fields", "since", "state", "totals"].sort(),
    );
    expect(Object.keys(r.fields[0] as FieldChange).sort()).toEqual(
      [
        "delta",
        "direction",
        "field",
        "firstChangeId",
        "firstRecordedAt",
        "hadBaseline",
        "from",
        "lastChangeId",
        "lastRecordedAt",
        "observedAtLast",
        "to",
        "transitionsSince",
        "unit",
      ].sort(),
    );
  });
});

// ── boundary rule (pinned) ──────────────────────────────────────────────────

describe("boundary rule: recordedAt <= since is baseline, > since is window", () => {
  it("a row exactly at `since` is BASELINE; one millisecond later is the window", () => {
    const atBoundary = ROW({ changeId: "b1", recordedAt: SINCE, newValue: 100 });
    const justAfter = ROW({
      changeId: "w1",
      recordedAt: "2026-10-08T05:00:00.001Z",
      oldValue: 100,
      newValue: 110,
    });
    const r = RESULT([atBoundary, justAfter]);
    const f = fieldOf(r, "price");
    expect(r.state).toBe("CHANGED");
    expect(f.hadBaseline).toBe(true);
    expect(f.from).toBe(100);
    expect(f.to).toBe(110);
    expect(f.delta).toBe(10);
    expect(f.direction).toBe("positive");
    expect(f.transitionsSince).toBe(1);
    expect(f.firstChangeId).toBe("w1");
    expect(f.lastChangeId).toBe("w1");
  });

  it("rows are ordered by recordedAt, ties broken by changeId ascending", () => {
    const base = ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 });
    const tieB = ROW({
      changeId: "zzz",
      recordedAt: "2026-10-08T06:00:00.000Z",
      oldValue: 110,
      newValue: 120,
    });
    const tieA = ROW({
      changeId: "aaa",
      recordedAt: "2026-10-08T06:00:00.000Z",
      oldValue: 100,
      newValue: 110,
    });
    const r = RESULT([base, tieB, tieA]);
    const f = fieldOf(r, "price");
    expect(f.firstChangeId).toBe("aaa");
    expect(f.lastChangeId).toBe("zzz");
    expect(f.from).toBe(100); // baseline, then aaa, then zzz
    expect(f.to).toBe(120);
    expect(f.delta).toBe(20);
    expect(f.transitionsSince).toBe(2);
  });
});

// ── per-field delta rule ────────────────────────────────────────────────────

describe("per-field delta rule", () => {
  it("numeric up/down/flat map to positive/negative/unchanged with exact deltas", () => {
    const r = RESULT([
      ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 }),
      ROW({ changeId: "w", recordedAt: "2026-10-08T05:00:01.000Z", oldValue: 100, newValue: 90 }),
    ]);
    const f = fieldOf(r, "price");
    expect(f.delta).toBe(-10);
    expect(f.direction).toBe("negative");

    const flat = RESULT([
      ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 }),
      ROW({
        changeId: "w",
        recordedAt: "2026-10-08T05:00:01.000Z",
        oldValue: 100,
        newValue: 100,
        observedAt: "2026-10-08T05:00:00.000Z", // correction, same value
      }),
    ]);
    const ff = fieldOf(flat, "price");
    expect(ff.delta).toBe(0);
    expect(ff.direction).toBe("unchanged");
  });

  it("no baseline -> hadBaseline false, delta null, direction non-comparable", () => {
    const r = RESULT([
      ROW({ changeId: "w1", recordedAt: "2026-10-08T05:00:01.000Z", oldValue: null, newValue: 105 }),
    ]);
    const f = fieldOf(r, "price");
    expect(f.hadBaseline).toBe(false);
    expect(f.from).toBeNull();
    expect(f.to).toBe(105);
    expect(f.delta).toBeNull();
    expect(f.direction).toBe("non-comparable");
    expect(r.state).toBe("CHANGED");
  });

  it("non-numeric changes are non-comparable with delta null; JSON-equal is unchanged", () => {
    const changed = RESULT([
      ROW({ changeId: "b", recordedAt: SINCE, newValue: { a: 1 } }),
      ROW({
        changeId: "w",
        recordedAt: "2026-10-08T05:00:01.000Z",
        oldValue: { a: 1 },
        newValue: { a: 2 },
      }),
    ]);
    const f = fieldOf(changed, "price");
    expect(f.delta).toBeNull();
    expect(f.direction).toBe("non-comparable");

    const same = RESULT([
      ROW({ changeId: "b", recordedAt: SINCE, newValue: { a: 1 } }),
      ROW({
        changeId: "w",
        recordedAt: "2026-10-08T05:00:01.000Z",
        oldValue: { a: 1 },
        newValue: { a: 1 },
      }),
    ]);
    expect(fieldOf(same, "price").direction).toBe("unchanged");
  });

  it("unit and observedAt come from the latest row, verbatim (null stays null)", () => {
    const r = RESULT([
      ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 }),
      ROW({
        changeId: "w",
        recordedAt: "2026-10-08T05:00:01.000Z",
        oldValue: 100,
        newValue: 110,
        unit: "paise",
        observedAt: null,
      }),
    ]);
    const f = fieldOf(r, "price");
    expect(f.unit).toBe("paise");
    expect(f.observedAtLast).toBeNull();
    expect(f.firstRecordedAt).toBe("2026-10-08T05:00:01.000Z");
    expect(f.lastRecordedAt).toBe("2026-10-08T05:00:01.000Z");
  });

  it("multi-field: fields sorted by name; totals count tracked/changed/transitions", () => {
    const r = RESULT([
      ROW({ changeId: "b-price", field: "price", recordedAt: SINCE, newValue: 100 }),
      ROW({ changeId: "b-vol", field: "volume24h", unit: "shares", recordedAt: SINCE, newValue: 50 }),
      ROW({
        changeId: "w-price",
        field: "price",
        recordedAt: "2026-10-08T05:00:01.000Z",
        oldValue: 100,
        newValue: 110,
      }),
      ROW({
        changeId: "w-price2",
        field: "price",
        recordedAt: "2026-10-08T05:00:02.000Z",
        oldValue: 110,
        newValue: 120,
      }),
    ]);
    expect(r.fields.map((f) => f.field)).toEqual(["price", "volume24h"]);
    expect(r.totals).toEqual({ fieldsTracked: 2, fieldsChanged: 1, transitionsSince: 2 });
    expect(r.state).toBe("CHANGED");
  });
});

// ── the summary state rule (fixed order) ────────────────────────────────────

describe("the summary state rule", () => {
  it("zero rows -> NO-DATA with entity null", () => {
    const r = RESULT([]);
    expect(r.state).toBe("NO-DATA");
    expect(r.entity).toBeNull();
    expect(r.fields).toEqual([]);
    expect(r.totals).toEqual({ fieldsTracked: 0, fieldsChanged: 0, transitionsSince: 0 });
  });

  it("rows exist but none since the cutoff -> UNCHANGED (the honest nothing-new)", () => {
    const r = RESULT([ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 })]);
    expect(r.state).toBe("UNCHANGED");
    const f = fieldOf(r, "price");
    expect(f.transitionsSince).toBe(0);
    expect(f.hadBaseline).toBe(true);
    expect(f.from).toBe(100);
    expect(f.to).toBe(100);
    expect(f.firstChangeId).toBeNull();
    expect(f.lastChangeId).toBeNull();
  });
});

// ── fail-closed refusals (all named) ────────────────────────────────────────

describe("fail-closed refusals", () => {
  it("mixed-entity rows are refused", () => {
    const r = RESULT([
      ROW({ changeId: "a", entity: "stock:RELIANCE" }),
      ROW({ changeId: "b", entity: "stock:TCS" }),
    ]);
    expect(r.state).toBe("UNCLEAR");
    expect(r.entity).toBeNull();
    expect(r.fields).toEqual([]);
    expect(r.detail).toContain("mixed-entity");
  });

  it("an unparseable `since` is refused", () => {
    const r = computeChangeSince([ROW({ changeId: "a" })], { since: "not-a-time" });
    expect(r.state).toBe("UNCLEAR");
    expect(r.detail).toContain("since");
  });

  it("an unparseable recordedAt on any row is refused", () => {
    const r = RESULT([ROW({ changeId: "a", recordedAt: "yesterday-ish" })]);
    expect(r.state).toBe("UNCLEAR");
    expect(r.detail).toContain("recordedAt");
  });

  it("an empty changeId on any row is refused (identity is provenance)", () => {
    const r = RESULT([ROW({ changeId: "" })]);
    expect(r.state).toBe("UNCLEAR");
    expect(r.detail).toContain("changeId");
  });
});

// ── determinism, provenance, honesty ────────────────────────────────────────

describe("determinism and closed behaviour", () => {
  it("same rows + same since -> byte-stable result; inputs never mutated", () => {
    const rows = [
      ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 }),
      ROW({ changeId: "w", recordedAt: "2026-10-08T05:00:01.000Z", oldValue: 100, newValue: 110 }),
    ];
    const snapshot = JSON.stringify(rows);
    const first = RESULT(rows);
    const second = RESULT(rows);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it("shuffled input order yields the identical result (order comes from the rule)", () => {
    const a = ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 });
    const b = ROW({ changeId: "w1", recordedAt: "2026-10-08T05:00:01.000Z", oldValue: 100, newValue: 105 });
    const c = ROW({ changeId: "w2", recordedAt: "2026-10-08T05:00:02.000Z", oldValue: 105, newValue: 110 });
    expect(JSON.stringify(RESULT([c, a, b]))).toBe(JSON.stringify(RESULT([a, b, c])));
  });

  it("detail is one deterministic line naming the state and counts", () => {
    const r = RESULT([
      ROW({ changeId: "b", recordedAt: SINCE, newValue: 100 }),
      ROW({ changeId: "w", recordedAt: "2026-10-08T05:00:01.000Z", oldValue: 100, newValue: 110 }),
    ]);
    expect(r.detail).toContain("state=CHANGED");
    expect(r.detail).toContain("fieldsChanged=1");
    expect(r.entity).toBe("stock:RELIANCE");
    expect(r.since).toBe(SINCE);
  });

  it("the module contains no model, fetch, clock, or randomness surface", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("lib/intelligence/changeSince.ts", "utf8");
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
