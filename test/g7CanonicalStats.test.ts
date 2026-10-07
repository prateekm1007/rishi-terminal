import { describe, expect, it } from "vitest";
import { computeCanonical, canonicalSlice } from "../scripts/g7CanonicalStats.mjs";

/**
 * G7 Direction-13 (2026-10-07): pins for the ONE canonical battery
 * calculation. Fail-first lesson embedded: the round-23 artifact carried
 * narrative numbers that its own rows contradicted (refusal counts, PoW
 * treatment, an empty per-class aggregate block). These pins fail on a
 * calculator that trusts precomputed aggregates, drops refusals silently,
 * or hides the PoW treatment — the exact defects the round-23 evidence
 * exhibited.
 */

// Hand-computable fixture: 3 usable rows + 2 refusals.
const ROWS = [
  {
    status: 200,
    wallMs: 10_000,
    powMs: 1_000,
    completionStages: { initial: { count: 1, msTotal: 4_000 }, "post-tool": { count: 1, msTotal: 4_000 } },
    toolExecutions: [{ tool: "getPrices", status: "ok", ms: 100 }],
    repairs: [],
    validationMs: 10,
  },
  { status: 200, wallMs: 5_000, powMs: 0, completionStages: { initial: { count: 1, msTotal: 4_500 } }, toolExecutions: [], repairs: [], validationMs: 5 },
  { status: 200, wallMs: 6_000, powMs: 500, completionStages: { initial: { count: 1, msTotal: 5_000 } }, toolExecutions: [], repairs: [], validationMs: 5 },
  { status: 429, wallMs: 120_000, powMs: 0 },
  { status: 413, wallMs: 50, powMs: 0 },
];

describe("canonicalSlice", () => {
  const c = canonicalSlice(ROWS);

  it("counts usable rows as status-200 only and never drops refusals silently", () => {
    expect(c.usable).toBe(3);
    expect(c.refusals).toBe(2);
    expect(c.refusalStatusCounts).toEqual({ "429": 1, "413": 1 });
    expect(c.n).toBe(5);
  });

  it("reports BOTH wall variants (PoW included and excluded)", () => {
    // usable walls incl PoW: 10000, 5000, 6000 -> sorted 5000,6000,10000; P50=6000
    expect(c.wallInclPoW.p50Ms).toBe(6_000);
    // excl PoW: 9000, 5000, 5500 -> sorted 5000,5500,9000; P50=5500
    expect(c.wallExclPoW.p50Ms).toBe(5_500);
  });

  it("computes attribution percentages against wallExclPoW totals", () => {
    // wallExcl total = 9000 + 5000 + 5500 = 19500
    // completions = 4000+4000 + 4500 + 5000 = 17500 -> 89.7%
    expect(c.attribution.completionsInitialMs).toBe(13_500);
    expect(c.attribution.completionsPostToolMs).toBe(4_000);
    expect(c.attribution.completionsTotalPct).toBeCloseTo(89.7, 1);
    expect(c.attribution.toolExecutionMs).toBe(100);
  });

  it("keeps unattributed wall honest (never negative, never folded into a stage)", () => {
    // 19500 - (13500+4000+100+20) = 1880
    expect(c.attribution.unattributedMs).toBe(1_880);
    expect(c.attribution.unattributedPct).toBeCloseTo(9.6, 1);
  });
});

describe("computeCanonical", () => {
  it("derives classes only from raw rows (a stale aggregate block cannot leak in)", () => {
    const artifact = {
      generatedAt: "2026-10-07T00:00:00Z",
      version: { sha: "deadbeef" },
      // a WRONG precomputed aggregate — the canonical block must ignore it
      overall: { n: 999, usable: 999, wallP50: 1 },
      raw: { financial: ROWS, philosophy: [] },
    };
    const c = computeCanonical(artifact);
    const classes = c.classes as Record<string, ReturnType<typeof canonicalSlice>>;
    expect(classes.financial.usable).toBe(3);
    expect(classes.philosophy.usable).toBe(0);
    expect(c.overall.usable).toBe(3);
    expect(c.overall.n).toBe(5);
    expect(c.source.version).toEqual({ sha: "deadbeef" });
  });
});
