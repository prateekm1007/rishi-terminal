/**
 * Round-5 audit (findings 1–3) — placeholder records must not rank, and
 * verdict text must not contradict the numbers. Rule 21: watched FAILING
 * before the fix (KWALITY was Stock of the Day / Top Buys #4 at 77/100
 * with P/E 0.0x and ROE 0.0%; Graham scored it 100 because zero P/E read
 * as "cheap"; NEUTRAL/Hold verdicts fell through to the AVOID commentary).
 */
import { describe, expect, it } from "vitest";
import { STOCKS } from "@/data/stocks";
import { assessDataQuality } from "@/lib/consensus/engine";
import { getStockScore } from "@/lib/scoring";
import { rankTopBuy, computeShortRadar, pickStockOfTheDay } from "@/lib/scoring/rankings";
import { scoreGraham } from "@/lib/scorers/graham";
import { generateCommentary, generateHeadline } from "@/lib/scorers/commentary";
import type { StockMetrics } from "@/lib/scorers/types";
import type { Stock } from "@/lib/types";

describe("round-5: internally impossible records are INCOMPLETE", () => {
  it("KWALITY (pe 0, roe 0, np>0) is INCOMPLETE", () => {
    const kw = STOCKS["KWALITY"] as Stock;
    expect(kw).toBeDefined();
    expect(kw.np).toBeGreaterThan(0);
    expect(kw.pe).toBe(0);
    expect(assessDataQuality(kw)).toBe("INCOMPLETE");
  });

  it("every record with pe===0 AND roe===0 AND np>0 is INCOMPLETE", () => {
    const bad = Object.values(STOCKS).filter(
      s => s.pe === 0 && s.roe === 0 && s.np > 0,
    );
    expect(bad.length).toBeGreaterThan(40); // the audit counted ~57 with pe0+roe0
    for (const s of bad) expect(assessDataQuality(s)).toBe("INCOMPLETE");
  });

  it("a loss-maker with pe 0 (np<0) is NOT auto-rejected by the impossibility rule", () => {
    // pe 0 with negative profit is semantically "N/A" — the record stays
    // scoreable; the Graham fix below keeps it from reading as cheap.
    const abfrl = STOCKS["ABFRL"] as Stock;
    if (abfrl && abfrl.np < 0 && abfrl.pe === 0) {
      expect(assessDataQuality(abfrl)).toBe("OK");
    }
  });
});

describe("round-5: rankings exclude impossible records", () => {
  it("no INCOMPLETE record appears in Top Buys or Short Radar", () => {
    for (const r of rankTopBuy(50)) {
      expect(assessDataQuality(STOCKS[r.symbol] as Stock)).toBe("OK");
    }
    for (const c of computeShortRadar(20)) {
      expect(assessDataQuality(STOCKS[c.symbol] as Stock)).toBe("OK");
    }
  });

  it("Stock of the Day is never an impossible record", () => {
    for (const day of ["2026-10-01", "2026-10-02", "2026-10-03"]) {
      const pick = pickStockOfTheDay(new Date(day + "T06:00:00Z"));
      expect(assessDataQuality(STOCKS[pick.symbol] as Stock)).toBe("OK");
    }
  });
});

describe("round-5: Graham no longer reads P/E 0 as ultra-cheap", () => {
  it("a zero-P/E record scores zero P/E-value points (not 100)", () => {
    const kw = STOCKS["KWALITY"] as Stock;
    const g = scoreGraham(kw);
    const peComponent = g.comps.find(c => c.label === "P/E Value");
    expect(peComponent?.v).toBe(0);
    // The composite was 100 pre-fix; with P/E value zeroed and impossible
    // records excluded from rankings, it must be materially lower.
    expect(g.score).toBeLessThan(100);
  });

  it("a normal cheap stock still earns its P/E points", () => {
    const sbin = STOCKS["SBIN"] as Stock; // pe 10
    const g = scoreGraham(sbin);
    expect(g.comps.find(c => c.label === "P/E Value")?.v).toBe(100);
  });
});

describe("round-5: verdict text matches the verdict", () => {
  // StockMetrics is narrower than Stock (no exchange/bvps/etc.); the
  // commentary generators only read symbol/sector off it.
  const mk = (over: Partial<StockMetrics>): StockMetrics =>
    ({ symbol: "TEST", name: "Test", sector: "FMCG",
       pe: 20, pb: 2, roe: 15, roce: 15, opm: 15, ...over });

  it("NEUTRAL conviction no longer renders the AVOID 'cautionary tale'", () => {
    const result = {
      conviction: "NEUTRAL", mode: "LONG", finalScore: 57,
    } as Parameters<typeof generateCommentary>[0];
    const text = generateCommentary(result, mk({}));
    expect(text).not.toMatch(/cautionary tale/i);
    expect(text).not.toMatch(/balance sheet is stressed/i);
  });

  it("the QVPS headline names its model (no bare 'scores X/100')", () => {
    const result = {
      conviction: "NEUTRAL", mode: "LONG", finalScore: 57,
    } as Parameters<typeof generateHeadline>[0];
    const h = generateHeadline(result, mk({ symbol: "SBIN" }));
    expect(h).toMatch(/^SBIN QVPS 57\/100/);
    expect(h).not.toMatch(/^SBIN scores/);
  });

  it("consensus for SBIN stays coherent with its category", () => {
    const report = getStockScore(STOCKS["SBIN"] as Stock);
    expect(report.dataQuality).toBe("OK");
    expect(report.consensus).not.toBeNull();
    if ((report.consensus as number) >= 75) {
      expect(report.category).not.toMatch(/Avoid/i);
    }
  });
});
