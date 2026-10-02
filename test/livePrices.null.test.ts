/**
 * Coder Directions G6 (audit 2026-10-02) — the price hook's null contract.
 *
 * A provider response like { "price": 2500, "change": null } must NOT become
 * change = 0: a 0% change is a REAL market observation, and "the provider
 * did not report this" is unavailability. Every field is number | null and
 * the normalization is a pure function (normalizeBatchEntry) so the contract
 * is directly testable without React.
 *
 * Mandated negative cases:
 *   missing change            → null (never 0, never the percent field)
 *   missing changePercent24h  → null (never the absolute change field — the
 *                               old code mixed a Δ with a percent)
 *   missing price             → null
 *   UNAVAILABLE response      → no entry at all (null from the normalizer)
 *   partial provider response → nulls ONLY for the absent fields
 */
import { describe, expect, it } from "vitest";
import { normalizeBatchEntry, type BatchPriceEntry } from "@/hooks/useLivePrices";

describe("G6 — normalizeBatchEntry null contract", () => {
  it("MUST FAIL PRE-FIX: missing change/changePercent24h → null, never 0 and never cross-filled", () => {
    const out = normalizeBatchEntry({ price: 2500 });
    expect(out).toEqual({
      price: 2500,
      change: null,
      changePercent24h: null,
      volume24h: null,
      lastUpdated: null,
      status: null,
      source: null,
    });
  });

  it("MUST FAIL PRE-FIX: missing price → null, never 0", () => {
    const out = normalizeBatchEntry({ change: -1.5, changePercent24h: -0.4 } as BatchPriceEntry);
    expect(out!.price).toBeNull();
    expect(out!.change).toBe(-1.5);
    expect(out!.changePercent24h).toBe(-0.4);
  });

  it("the absolute change is NEVER used as the percent (unit mixing forbidden)", () => {
    const out = normalizeBatchEntry({ price: 100, change: -3.25 });
    expect(out!.changePercent24h).toBeNull();
  });

  it("UNAVAILABLE response → no observation (null), not a zeroed price", () => {
    expect(normalizeBatchEntry({ status: "UNAVAILABLE" })).toBeNull();
    expect(normalizeBatchEntry(undefined)).toBeNull();
  });

  it("partial provider response → nulls only for the absent fields", () => {
    const out = normalizeBatchEntry({ price: 99.5, volume24h: 12345 });
    expect(out).toEqual({
      price: 99.5,
      change: null,
      changePercent24h: null,
      volume24h: 12345,
      lastUpdated: null,
      status: null,
      source: null,
    });
  });

  it("non-finite numbers are unavailability, not data", () => {
    const out = normalizeBatchEntry({ price: Number.NaN, changePercent24h: Number.POSITIVE_INFINITY });
    expect(out!.price).toBeNull();
    expect(out!.changePercent24h).toBeNull();
  });

  it("a full observation passes through verbatim (including a genuine 0% change)", () => {
    const out = normalizeBatchEntry({
      price: 2500, change: 0, changePercent24h: 0, volume24h: 0,
      lastUpdated: "2026-10-01T09:00:00.000Z",
    });
    expect(out).toEqual({
      price: 2500,
      change: 0,
      changePercent24h: 0,
      volume24h: 0,
      lastUpdated: "2026-10-01T09:00:00.000Z",
      // Round 9: the wire's status/source ride through verbatim too; the
      // test payload carries none, so the honest values are null (never
      // guessed).
      status: null,
      source: null,
    });
  });
});
