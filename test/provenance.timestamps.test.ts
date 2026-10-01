/**
 * Audit 2026-10-02 (P0) — fundamentals provenance: never fabricate timestamps;
 * mixed-source derivations never claim live freshness.
 *
 * Three defects, one contract:
 *  1. lib/liveFundamentals + lib/nse/fundamentals + /api/fundamentals set
 *     lastUpdated = new Date().toISOString() — FETCH time dressed up as a
 *     provider OBSERVATION time (and on the static fallback path, a seed
 *     dataset claiming today's capture date, which R1 forbids outright).
 *  2. lib/scoring resolveStockMetrics fell back to fetchTime when the
 *     provider disclosed nothing — the same fabrication one layer down.
 *  3. PB was computed as seed.price / live-BVPS while taking the live
 *     asOf — mixed seed/live operands presented as a coherent live
 *     derivation.
 *
 * New contract (audit directive, verbatim):
 *   provider timestamp disclosed -> preserve it
 *   provider timestamp absent    -> null
 *   fetch time is NEVER a substitute for observation time
 *   PB mixed seed/live -> derived + asOf:null (explicitly mixed-source)
 *   evidence ids distinguish live+observation-time from
 *   live+no-disclosed-observation-time.
 *
 * Rule 21: written and run BEFORE the fix (raw output in the PR).
 */
import { describe, expect, it } from "vitest";
import { resolveStockMetrics } from "@/lib/scoring";
import { buildAiEvidencePackage } from "@/lib/ai/evidence";

/** Fixture satisfies BOTH the resolver's input contract (hooks shape with
 *  isLive) and the evidence deps' contract (lib shape with the strict
 *  source union) — the same object the /api path produces. */
function liveFundamentals(lastUpdated: string | null) {
  return {
    symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18, roce: 21,
    bookValue: 990, dividendYield: 0.4, faceValue: 10, debtToEquity: 0.35,
    opm: 24, revCagr3y: 14, epsCagr: 16, promoterHolding: 50.3, fcf: 30000,
    roa: 10, lastUpdated, source: "screener" as const, isLive: true,
  };
}

describe("P0 timestamps — provider observation time or null, never fetch time", () => {
  it("MUST FAIL PRE-FIX: live fundamentals with lastUpdated null -> live fields carry asOf NULL (not fetch time)", () => {
    const r = resolveStockMetrics("RELIANCE", liveFundamentals(null));
    expect(r).not.toBeNull();
    expect(r!.fields.pe.source).toBe("live");
    expect(r!.fields.pe.asOf).toBeNull();
    expect(r!.fields.roe.asOf).toBeNull();
  });

  it("a disclosed provider timestamp is preserved verbatim", () => {
    const r = resolveStockMetrics("RELIANCE", liveFundamentals("2026-09-28T10:00:00.000Z"));
    expect(r!.fields.pe.source).toBe("live");
    expect(r!.fields.pe.asOf).toBe("2026-09-28T10:00:00.000Z");
  });

  it("seed fields never carry an asOf (R1) — live-null changes nothing there", () => {
    const r = resolveStockMetrics("RELIANCE", null);
    expect(r!.fields.pe.source).toBe("seed");
    expect(r!.fields.pe.asOf).toBeNull();
  });
});

describe("P0 PB provenance — mixed operands never look live", () => {
  it("MUST FAIL PRE-FIX: seed price + live BVPS -> pb is derived with asOf NULL (mixed-source)", () => {
    // bookValue 990 is live (picks over the seed); the price operand is the
    // seed registry price — a mixed derivation must not wear the live asOf.
    const r = resolveStockMetrics("RELIANCE", liveFundamentals("2026-09-28T10:00:00.000Z"));
    expect(r!.fields.bvps.source).toBe("live");
    expect(r!.fields.pb.source).toBe("derived");
    expect(r!.fields.pb.asOf).toBeNull();
  });

  it("fully-seed operands: pb derived, asOf null (unchanged, pinned)", () => {
    const r = resolveStockMetrics("RELIANCE", null);
    expect(r!.fields.pb.source).toBe("derived");
    expect(r!.fields.pb.asOf).toBeNull();
  });
});

describe("P0 evidence ids — live+no-time is distinct from seed", () => {
  it("MUST FAIL PRE-FIX: live field without provider time gets 'no-disclosed-observation-time', never ':seed'", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", {
      getFundamentals: async () => liveFundamentals(null),
      getPrice: async () => ({
        price: 1420.5, change: 0.8, source: "yahoo", status: "LIVE" as const, observedAt: null,
        lastUpdated: null,
      }),
    });
    expect(pkg).not.toBeNull();
    const peItem = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:pe:"));
    expect(peItem).toBeDefined();
    expect(peItem!.id).toContain("no-disclosed-observation-time");
    expect(peItem!.id).not.toMatch(/:seed$/);
    expect(peItem!.text.toLowerCase()).toContain("no disclosed observation time");
  });

  it("live field WITH a disclosed time keeps it in the id (unchanged, pinned)", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", {
      getFundamentals: async () => liveFundamentals("2026-09-28T10:00:00.000Z"),
      getPrice: async () => ({
        price: 1420.5, change: 0.8, source: "yahoo", status: "LIVE" as const,
        observedAt: "2026-09-28T09:00:00.000Z", lastUpdated: "2026-09-28T09:00:00.000Z",
      }),
    });
    const peItem = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:pe:"));
    expect(peItem!.id).toBe("fundamental:RELIANCE:pe:2026-09-28T10:00:00.000Z");
  });
});
