import { describe, expect, it } from "vitest";
import { toSourced, derivedSourced, sourceLabel } from "@/lib/types/sourced";
import { resolveStockMetrics } from "@/lib/scoring";
import { STOCKS } from "@/data/stocks";

const SYMBOL = Object.keys(STOCKS)[0];

describe("toSourced — internal ResolvedField → UI Sourced contract", () => {
  it("maps live → vendor:<name> with the real upstream", () => {
    const s = toSourced({ value: 21.5, source: "live", asOf: "2026-09-30T10:00:00Z" }, "screener");
    expect(s.source).toBe("vendor:screener");
    expect(s.asOf).toBe("2026-09-30T10:00:00Z");
  });

  it("maps live without a vendor name → vendor:live-fundamentals (never generic 'live')", () => {
    const s = toSourced({ value: 1, source: "live", asOf: null });
    expect(s.source).toBe("vendor:live-fundamentals");
  });

  it("static source falls back to vendor:live-fundamentals, not vendor:static", () => {
    const s = toSourced({ value: 1, source: "live", asOf: null }, "static");
    expect(s.source).toBe("vendor:live-fundamentals");
  });

  it("keeps seed and derived verbatim; seed claims no as-of", () => {
    expect(toSourced({ value: 5, source: "seed", asOf: null })).toEqual({
      value: 5,
      source: "seed",
      asOf: null,
    });
    expect(toSourced({ value: 7, source: "derived", asOf: "2026-01-01" }).source).toBe("derived");
  });
});

describe("resolveStockMetrics().sourced — the UI-facing provenance record", () => {
  it("seed-only resolution: every field is source 'seed' with null as-of (R1)", () => {
    const r = resolveStockMetrics(SYMBOL);
    expect(r).not.toBeNull();
    expect(r!.sourced.pe).toMatchObject({ source: "seed", asOf: null });
    expect(r!.sourced.roe).toMatchObject({ source: "seed", asOf: null });
    expect(r!.sourced.pb).toMatchObject({ source: "derived", asOf: null });
  });

  it("live resolution: fields name the actual vendor and carry as-of", () => {
    const r = resolveStockMetrics(SYMBOL, {
      symbol: SYMBOL,
      pe: 21.5,
      eps: 10,
      marketCap: 9e11,
      roe: 18,
      roce: 22,
      bookValue: 300,
      dividendYield: 1,
      faceValue: 2,
      debtToEquity: 0.4,
      opm: 20,
      revCagr3y: 12,
      epsCagr: 14,
      promoterHolding: 51,
      fcf: 100,
      roa: 8,
      lastUpdated: "2026-09-30T00:00:00Z",
      source: "screener",
      isLive: true,
    } as never);
    expect(r!.sourced.pe).toMatchObject({
      value: 21.5,
      source: "vendor:screener",
    });
    expect(r!.sourced.pe.asOf).toBeTruthy();
    expect(r!.sourced.mktcap.source).toBe("vendor:screener");
    // derived from a live input claims the live as-of
    expect(r!.sourced.pb.source).toBe("derived");
    expect(r!.sourced.pb.asOf).toBe(r!.sourced.pe.asOf);
  });
});

describe("sourceLabel + derivedSourced", () => {
  it("labels vendor/seed/derived sources readably", () => {
    expect(sourceLabel("vendor:yahoo+nse")).toBe("Live data via yahoo+nse");
    expect(sourceLabel("seed")).toContain("Reference dataset");
    expect(sourceLabel("derived")).toBe("Derived on this page");
  });

  it("derivedSourced defaults to null as-of and null value", () => {
    expect(derivedSourced(null)).toEqual({ value: null, source: "derived", asOf: null });
    expect(derivedSourced(3.2, "2026-09-30").asOf).toBe("2026-09-30");
  });
});
