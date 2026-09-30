/** T10: one score, one input set — parity across every UI entry path. */
import { describe, it, expect } from "vitest";

import { STOCKS } from "@/data/stocks";
import { getStockScore, resolveStockMetrics } from "@/lib/scoring";
import { buildConsensus } from "@/lib/consensus/engine";
import { SCORE_ENGINE_VERSION } from "@/lib/consensus/version";

describe("T10 — score parity across entry paths", () => {
  const symbols = Object.keys(STOCKS);

  it("consensus is identical via resolved metrics, raw seed and barrel paths", () => {
    let mismatches = 0;
    for (const sym of symbols) {
      const viaResolved = getStockScore(resolveStockMetrics(sym)!).consensus;
      const viaSeed = getStockScore(STOCKS[sym]).consensus;
      const viaBarrel = buildConsensus(STOCKS[sym]).consensus;
      const viaEmptyLive = getStockScore(resolveStockMetrics(sym, null)!).consensus;
      const vals = new Set([viaResolved, viaSeed, viaBarrel, viaEmptyLive]);
      if (vals.size > 1) mismatches++;
      expect(mismatches).toBe(0);
    }
    expect(symbols.length).toBeGreaterThan(900);
  });

  it("scoring is deterministic — two calls give the same result", () => {
    for (const sym of symbols.slice(0, 100)) {
      const a = buildConsensus(STOCKS[sym]);
      const b = buildConsensus(STOCKS[sym]);
      expect(a.consensus).toBe(b.consensus);
      expect(a.topBull.name).toBe(b.topBull.name);
    }
  });

  it("resolveStockMetrics records per-field source and asOf", () => {
    const r = resolveStockMetrics("RELIANCE")!;
    expect(r.fields.pe.source).toBe("seed");
    // R1: seed fields never claim a timestamp — no provable capture date.
    expect(r.fields.pe.asOf).toBeNull();
    expect(r.seedStatus).toBe("placeholder");
    expect(r.seedCapturedAt).toBeNull();
    const withLive = resolveStockMetrics("RELIANCE", {
      pe: 21.5, roe: 14.2, roce: 16.1, opm: 18.3, debtToEquity: 0.4,
      promoterHolding: 50.3, revCagr3y: 12, epsCagr: 14, marketCap: 1700e7,
      bookValue: 1150,
    } as any);
    expect(withLive!.fields.pe.source).toBe("live");
    expect(withLive!.fields.pe.value).toBe(21.5);
  });

  it("a failed live fetch never zeros out a real seed value", () => {
    const r = resolveStockMetrics("RELIANCE", {
      pe: NaN, roe: 0, bookValue: 0,
    } as any);
    expect(r!.fields.pe.source).toBe("seed");
    expect(r!.fields.roe.source).toBe("seed");
    expect(r!.fields.bvps.source).toBe("seed");
  });

  it("SCORE_ENGINE_VERSION is persisted-shaped and stable", () => {
    expect(SCORE_ENGINE_VERSION).toBe("rishi-merit-v1");
  });
});
