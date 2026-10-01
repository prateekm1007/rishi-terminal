import { describe, expect, it } from "vitest";
import { toSourced, derivedSourced, sourceLabel, overlaySourced, type Sourced } from "@/lib/types/sourced";
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
      marketCap: 1_600_000, // ₹ Cr — the /api/fundamentals contract unit (H3)
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
    // H3: live marketCap arrives in ₹ Cr and is used as-is — never divided
    // by 1e7 (that produced "Mkt Cap 0.0K Cr" from 1,577,229 Cr live data).
    expect(r!.sourced.mktcap).toMatchObject({
      value: 1_600_000,
      source: "vendor:screener",
    });
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

// H3 (audit 2026-10-01): a live value wildly out of line with the baseline
// it would replace is almost certainly a unit/semantics mismatch (the
// ₹-vs-₹Cr marketCap class), not real movement. The overlay must keep the
// honestly-labelled baseline instead of letting a corrupted number through.
describe("overlaySourced — live overlay with the H3 unit-mismatch bound", () => {
  const base: Sourced<number> = { value: 100, source: "seed", asOf: null };

  it("a plausible live value replaces the baseline and names the vendor", () => {
    expect(overlaySourced(base, 120, "screener", "2026-10-01T10:00:00Z")).toEqual({
      value: 120,
      source: "vendor:screener",
      asOf: "2026-10-01T10:00:00Z",
    });
  });

  it("zero / null / undefined / non-finite never override the baseline", () => {
    for (const v of [0, null, undefined, Number.NaN, -5]) {
      expect(overlaySourced(base, v, "screener", "2026-10-01T10:00:00Z")).toBe(base);
    }
  });

  it("a live value wildly out of line with the baseline is rejected", () => {
    // The exact H3 incident shape: 0.1577 (₹ Cr ÷ 1e7 twice) offered
    // against a 1.7M ₹Cr baseline.
    const big: Sourced<number> = { value: 1_700_000, source: "seed", asOf: null };
    expect(overlaySourced(big, 0.1577, "screener", "2026-10-01T10:00:00Z")).toBe(big);
    // 51× the baseline — beyond the 50× band
    expect(overlaySourced(base, 5_100, "screener", "2026-10-01T10:00:00Z")).toBe(base);
    // 1/51 of the baseline — below the 1/50 band
    expect(overlaySourced(base, 1.9, "screener", "2026-10-01T10:00:00Z")).toBe(base);
  });

  it("the band is inclusive at exactly 50× / 1/50× — extreme-but-plausible overlays pass", () => {
    expect(overlaySourced(base, 5_000, "screener", null)!.value).toBe(5_000);
    expect(overlaySourced(base, 2, "screener", null)!.value).toBe(2);
  });

  it("no baseline to compare against → the live value is accepted", () => {
    const none: Sourced<number> = { value: null, source: "seed", asOf: null };
    expect(overlaySourced(none, 9e9, "yahoo+nse", null)).toEqual({
      value: 9e9,
      source: "vendor:yahoo+nse",
      asOf: null,
    });
  });
});
