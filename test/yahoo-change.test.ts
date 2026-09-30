import { describe, expect, it } from "vitest";
import { yahooChangeFromMeta } from "@/lib/livePrice";

// 2026-09-30: Yahoo chart meta dropped `previousClose`; tickers were stuck at
// 0.00% because the old code fell back to prev = price. Trust order:
// regularMarketChangePercent → previousClose → chartPreviousClose → 0.
describe("yahooChangeFromMeta", () => {
  it("prefers Yahoo's own regularMarketChangePercent", () => {
    const r = yahooChangeFromMeta({
      regularMarketPrice: 1187.0,
      regularMarketChangePercent: 0.423,
      chartPreviousClose: 1182.0,
    });
    expect(r).toEqual({ price: 1187.0, change: 0.423 });
  });

  it("derives change from chartPreviousClose when percent is absent", () => {
    const r = yahooChangeFromMeta({
      regularMarketPrice: 1187.0,
      chartPreviousClose: 1182.0,
    });
    expect(r?.price).toBe(1187.0);
    expect(r?.change).toBeCloseTo(((1187 - 1182) / 1182) * 100, 6);
  });

  it("still honours the legacy previousClose shape", () => {
    const r = yahooChangeFromMeta({
      regularMarketPrice: 100.0,
      previousClose: 110.0,
    });
    expect(r?.change).toBeCloseTo(((100 - 110) / 110) * 100, 6);
  });

  it("returns change 0 (not NaN) when neither percent nor prev exists", () => {
    const r = yahooChangeFromMeta({ regularMarketPrice: 55.5 });
    expect(r).toEqual({ price: 55.5, change: 0 });
  });

  it("returns null when there is no usable price", () => {
    expect(yahooChangeFromMeta({})).toBeNull();
    expect(yahooChangeFromMeta({ regularMarketPrice: 0 })).toBeNull();
    expect(yahooChangeFromMeta({ regularMarketPrice: "abc" })).toBeNull();
    expect(yahooChangeFromMeta(null)).toBeNull();
    expect(yahooChangeFromMeta(undefined)).toBeNull();
  });

  it("never emits NaN into the payload", () => {
    const r = yahooChangeFromMeta({
      regularMarketPrice: 1187.0,
      regularMarketChangePercent: "n/a",
      chartPreviousClose: "garbage",
    });
    expect(r?.change).toBe(0);
    expect(JSON.stringify(r)).not.toContain("NaN");
  });
});
