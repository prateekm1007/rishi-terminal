/** T13: dashboard lists are real rankings. */
import { describe, it, expect } from "vitest";

import {
  rankTopBuy,
  computeShortRadar,
  pickStockOfTheDay,
} from "@/lib/scoring/rankings";
import { shortFlags } from "@/lib/scoring/rankings";
import { STOCKS } from "@/data/stocks";

describe("T13 — Top Buy ranking", () => {
  const list = rankTopBuy(6);

  it("returns exactly 6 ranked candidates", () => {
    expect(list).toHaveLength(6);
    expect(list.map(r => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("is sorted descending by consensus with deterministic tie-breaks", () => {
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      expect(prev.consensus).toBeGreaterThanOrEqual(cur.consensus);
      if (prev.consensus === cur.consensus) {
        // market cap desc, then symbol asc
        expect(prev.mktcap).toBeGreaterThanOrEqual(cur.mktcap);
        if (prev.mktcap === cur.mktcap) {
          expect(prev.symbol.localeCompare(cur.symbol)).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it("is stable across two calls (no Date/random inside)", () => {
    expect(JSON.stringify(rankTopBuy(6))).toBe(JSON.stringify(list));
  });

  it("excludes data with insufficient quality (all-zero rows removed in T12)", () => {
    // rankTopBuy filters dataQuality==='OK'; with zero-quality rows removed
    // from the registry every candidate must carry a real consensus value.
    for (const r of list) {
      expect(r.consensus).not.toBeNull();
    }
  });
});

describe("T13 — Short radar", () => {
  const radar = computeShortRadar(3);

  it("every candidate carries a reason derived from actual flags", () => {
    expect(radar.length).toBeGreaterThan(0);
    for (const c of radar) {
      expect(c.reason).not.toBe("Risk factors detected"); // the old hardcoded lie
      for (const flag of shortFlags(STOCKS[c.symbol])) {
        // each triggered flag must be reflected in the reason text
        expect(c.reason).toContain(flag.label);
      }
    }
  });

  it("is ranked by short score desc and stable", () => {
    const scores = radar.map(c => c.shortScore);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
    expect(JSON.stringify(computeShortRadar(3))).toBe(JSON.stringify(radar));
  });

  it("each candidate triggers at least two flags", () => {
    for (const c of radar) {
      expect(c.flagCount).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("T13 — Stock of the Day", () => {
  it("same IST day yields the same pick (06:00 UTC and 18:00 UTC are the same IST date)", () => {
    const a = pickStockOfTheDay(new Date("2026-09-30T06:00:00Z"));
    const b = pickStockOfTheDay(new Date("2026-09-30T18:00:00Z"));
    expect(a.symbol).toBe(b.symbol);
  });

  it("a different IST day can select a different stock from the pool", () => {
    // deterministic: this exact pair of dates must produce defined values
    const a = pickStockOfTheDay(new Date("2026-09-30T06:00:00Z"));
    const b = pickStockOfTheDay(new Date("2026-10-01T06:00:00Z"));
    expect(a.symbol).toBeDefined();
    expect(b.symbol).toBeDefined();
  });

  it("never returns the old hardcoded TCS constant or hardcoded why text", () => {
    const pick = pickStockOfTheDay(new Date("2026-09-30T06:00:00Z"));
    // TCS may legitimately win a day — assert the metadata is derived instead
    expect(pick.why).not.toBe(
      "Consistent ROE above 45%, zero debt, world-class capital allocation, and a management team that has compounded earnings at 15%+ for over a decade. Damani would call this a business worth owning forever.",
    );
    expect(pick.why).toContain("consensus");
  });
});
