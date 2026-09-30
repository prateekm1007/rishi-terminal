import { describe, expect, it } from "vitest";
import {
  nseIndexSchema,
  nseAllIndicesSchema,
  nseBlockDealSchema,
} from "@/lib/validation/schemas";

// NSE schema drift (2026-09-30): allIndices numerics arrive as strings
// (sometimes with Indian comma grouping, sometimes ""). The coercion layer
// must accept number | numeric-string | null and never emit NaN.
describe("nseIndexSchema numeric coercion", () => {
  it("accepts numeric strings with Indian comma grouping", () => {
    const r = nseIndexSchema.parse({
      indexSymbol: "NIFTY 50",
      last: "24,405.55",
      variation: "-96.10",
      percentChange: "-0.39",
      pe: "22.4",
    });
    expect(r.last).toBe(24405.55);
    expect(r.variation).toBe(-96.1);
    expect(r.percentChange).toBe(-0.39);
    expect(r.pe).toBe(22.4);
  });

  it("still accepts plain numbers (legacy shape)", () => {
    const r = nseIndexSchema.parse({
      indexSymbol: "NIFTY BANK",
      last: 51500.25,
      percentChange: 0.62,
    });
    expect(r.last).toBe(51500.25);
    expect(r.percentChange).toBe(0.62);
  });

  it("maps empty and unparseable strings to undefined (never NaN)", () => {
    const r = nseIndexSchema.parse({
      indexSymbol: "NIFTY IT",
      last: "",
      variation: "n/a",
      pe: null,
    });
    expect(r.last).toBeUndefined();
    expect(r.variation).toBeUndefined();
    expect(r.pe).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain("NaN");
  });

  it("treats missing fields as absent and requires indexSymbol", () => {
    const r = nseIndexSchema.parse({ indexSymbol: "NIFTY FMCG" });
    expect(r.high).toBeUndefined();
    expect(() => nseIndexSchema.parse({ last: "100" })).toThrow();
  });

  it("parses a full allIndices envelope", () => {
    const payload = {
      data: [
        {
          indexSymbol: "NIFTY 50",
          last: "24,405.55",
          open: "24,520.10",
          high: "24,590.00",
          low: "24,380.20",
          previousClose: "24,501.65",
          yearHigh: "26,277.55",
          yearLow: "21,743.40",
          pe: "22.4",
          pb: "3.8",
        },
        { indexSymbol: "NIFTY SUB-MAN", last: "bogus" }, // survives per-field
      ],
      timestamp: "30-Sep-2026 15:30:00",
    };
    const r = nseAllIndicesSchema.safeParse(payload);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.data?.[0]?.last).toBe(24405.55);
      expect(r.data.data?.[1]?.last).toBeUndefined();
    }
  });

  it("coerces block-deal numerics the same way", () => {
    const r = nseBlockDealSchema.parse({
      symbol: "RELIANCE",
      totalTradedVolume: "1,23,45,678",
      lastPrice: "1,187.00",
      pchange: "-0.4%",
    });
    expect(r.totalTradedVolume).toBe(12345678);
    expect(r.lastPrice).toBe(1187);
    expect(r.pchange).toBeUndefined(); // trailing % is not a pure number
  });
});
