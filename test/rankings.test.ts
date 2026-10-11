/**
 * T13: dashboard lists are real rankings — re-pinned for round-46 P0-1
 * (founder audit 2026-10-11: "Seed rows show no verdict"). With the seed
 * dataset verdict-blocked, the ranked pools are honestly EMPTY: the
 * derivation (deterministic tie-breaks, flag-derived reasons, IST-date
 * pick) is pinned by test/dataQuality.test.ts + the round-5 re-pins and
 * reactivates mechanically the moment a verdict-allowed record exists.
 */
import { describe, it, expect } from "vitest";

import {
  rankTopBuy,
  computeShortRadar,
  pickStockOfTheDay,
} from "@/lib/scoring/rankings";
import { shortFlags } from "@/lib/scoring/rankings";
import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/types";

describe("T13 + P0-1 — Top Buy ranking on the seed universe", () => {
  it("produces NO candidates while every record is seed (no verdict, no rank)", () => {
    expect(rankTopBuy(6)).toEqual([]);
    expect(rankTopBuy(50)).toEqual([]);
  });

  it("is stable across two calls (no Date/random inside)", () => {
    expect(JSON.stringify(rankTopBuy(6))).toBe(JSON.stringify(rankTopBuy(6)));
  });
});

describe("T13 + P0-1 — Short radar on the seed universe", () => {
  it("produces NO candidates while every record is seed", () => {
    expect(computeShortRadar(3)).toEqual([]);
    expect(computeShortRadar(20)).toEqual([]);
  });

  it("is stable across two calls", () => {
    expect(JSON.stringify(computeShortRadar(3))).toBe(JSON.stringify(computeShortRadar(3)));
  });
});

describe("T13 + P0-1 — Stock of the Day on the seed universe", () => {
  it("returns the honest null (no qualified pool) instead of throwing or fabricating", () => {
    expect(pickStockOfTheDay(new Date("2026-09-30T06:00:00Z"))).toBeNull();
    expect(pickStockOfTheDay(new Date("2026-10-01T06:00:00Z"))).toBeNull();
    expect(pickStockOfTheDay()).toBeNull();
  });

  it("same IST day stays deterministic (null everywhere, never sometimes-a-pick)", () => {
    const a = pickStockOfTheDay(new Date("2026-09-30T06:00:00Z"));
    const b = pickStockOfTheDay(new Date("2026-09-30T18:00:00Z"));
    expect(a).toBeNull();
    expect(b).toBeNull();
  });
});

// The flag-derivation mechanics are independent of the verdict gate —
// they stay pinned so the radar's reason contract survives unchanged.
describe("T13 — the short-flag derivation contract (unchanged)", () => {
  it("nulls never fire flags; real values fire their documented flags", () => {
    const sbin = STOCKS["SBIN"] as Stock;
    // X6 seed semantics inside shortFlags: a 0 IS the placeholder unknown.
    const flags = shortFlags(sbin);
    expect(Array.isArray(flags)).toBe(true);
    for (const f of flags) {
      expect(f.label).toBeTruthy();
      expect(f.detail).toBeTruthy();
    }
  });
});
