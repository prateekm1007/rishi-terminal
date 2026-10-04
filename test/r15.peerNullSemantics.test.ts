/**
 * Round 15 (Coder Directions 2026-10-04, §8) — peer data null semantics.
 *
 * The founder's entropy list: "remaining null→0 semantic paths — especially
 * data/score/F&O boundaries". The peer-comparison data boundary had both:
 *
 *   1. `pe: s.pe || 0` — the seed's 73 placeholder-zero P/E rows flowed
 *      into PeerComparison and rendered the Y4-forbidden "0.00x" shape;
 *      `roe: s.roe || 0` did the same for 57 rows ("0.00%").
 *   2. `pb: (s.bvps || 0) > 0 ? ... : 2.5` — a FABRICATED plausible-guess
 *      P/B (rule 4: never fabricate; a loaded gun for every future stock
 *      with missing bvps).
 *
 * Rule 21 (fail-first): the sweep test was written first and watched FAIL
 * on the branch pre-fix (peer rows carried pe === 0 from the seed); the
 * toPeerRow unit tests fail at import pre-fix (the mapper did not exist).
 */
import { describe, expect, it } from "vitest";
import { generateStockDetail, toPeerRow } from "../data/stockDetails";
// 'server-only' is stubbed for vitest (vitest.config.ts) — the registry
// import is safe in tests; the guard still bites in the real build.
import { STOCKS } from "../data/stocks";

describe("R15-E — peer data boundary keeps null a real value (rules 3/4/16)", () => {
  it("no peer row in the whole registry renders a placeholder-zero P/E or ROE", () => {
    const zeroPeRows: string[] = [];
    const zeroRoeRows: string[] = [];
    for (const stock of Object.values(STOCKS)) {
      const { peers } = generateStockDetail(stock);
      for (const p of peers) {
        if (p.pe === 0) zeroPeRows.push(`${stock.symbol}->${p.symbol}`);
        if (p.roe === 0) zeroRoeRows.push(`${stock.symbol}->${p.symbol}`);
      }
    }
    expect(zeroPeRows).toEqual([]);
    expect(zeroRoeRows).toEqual([]);
  });

  it("toPeerRow maps placeholder zeros to null and never fabricates a P/B", () => {
    const row = toPeerRow({
      symbol: "TEST",
      name: "Test Ltd",
      price: 100,
      mktcap: 5000,
      pe: 0,
      bvps: 0,
      roe: 0,
      roce: 10,
      de: 0, // zero debt is REAL — stays 0
      revcagr: 12,
      opm: 9,
    });
    expect(row.pe).toBeNull();
    expect(row.pb).toBeNull();
    expect(row.roe).toBeNull();
    expect(row.debtEquity).toBe(0);
  });

  it("toPeerRow computes P/B only from valid inputs and preserves real values", () => {
    const row = toPeerRow({
      symbol: "TEST",
      name: "Test Ltd",
      price: 250,
      mktcap: 5000,
      pe: 18.4,
      bvps: 50,
      roe: 14.2,
      roce: 16,
      de: 0.4,
      revcagr: 12,
      opm: 9,
    });
    expect(row.pe).toBe(18.4);
    expect(row.pb).toBe(5); // 250 / 50
    expect(row.roe).toBe(14.2);
    expect(row.debtEquity).toBe(0.4);
  });
});
