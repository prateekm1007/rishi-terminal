/**
 * LIVE-TODAY (founder order, 2026-10-13) — the movers COMPUTATION pin.
 *
 * Founder: "Also add top 5 losers and top 5 winner stocks on dashboard.
 * use Unofficial data scrapers." The always-available derivation ranks
 * the shared quote cache's freshest session observations; this pin
 * enforces the honesty contract of that ranking:
 *
 *   1. top-5 by percent change desc (gainers) / asc (losers), with the
 *      deterministic tie-break percent-desc-then-symbol-asc (Rule 18);
 *   2. ONLY registry symbols rank (Rule 9 — tiles like NIFTY50/BTC are
 *      not equity movers);
 *   3. ONLY rows observed on the CURRENT session's IST date rank — a
 *      yesterday observation is not "today's" move (Rule 3);
 *   4. a row without a disclosed percent change CANNOT rank (a missing
 *      change is not a flat day — Rule 16);
 *   5. every ranked row carries its own source + observedAt verbatim
 *      (FD-15: the attribution travels with the value);
 *   6. universeObserved counts the session-fresh registry rows — the
 *      panel's derivation line discloses the coverage honestly.
 *
 * Fail-first (C5): before lib/movers/compute existed, every leg failed
 * on the missing module; the session-freshness legs were then tightened
 * against a deliberate mixed-session fixture (a yesterday-stale row
 * with a huge pct MUST NOT top the list).
 */
import { describe, expect, it } from "vitest";
import { computeMoversFromRows, type MoverCacheRow } from "../lib/movers/compute";

const SESSION = "2026-10-13";

function row(
  symbol: string,
  price: number,
  change: number | null,
  observedIso: string | null,
  extra: Partial<MoverCacheRow> = {},
): MoverCacheRow {
  return {
    symbol,
    price,
    change,
    observed_at: observedIso,
    source: "yahoo-bulk",
    volume24h: null,
    ...extra,
  };
}

// A same-session observation: 2026-10-13 10:00 IST (= 04:30 UTC).
const TODAY = "2026-10-13T04:30:00.000Z";
// A previous-session observation: 2026-10-09 10:00 IST.
const YESTERDAY = "2026-10-09T04:30:00.000Z";

describe("LIVE-TODAY — computeMoversFromRows (the quote-cache ranking)", () => {
  it("ranks top-5 gainers desc and top-5 losers asc with deterministic tie-breaks", () => {
    const rows = [
      row("RELIANCE", 1200, 1.5, TODAY),      // mid
      row("TCS", 3800, 4.5, TODAY),           // gainer #1
      row("INFY", 1600, 4.5, TODAY),          // gainer #2 (tie → symbol asc)
      row("ITC", 420, 3.0, TODAY),            // gainer #3
      row("HDFCBANK", 1900, 2.0, TODAY),      // gainer #4
      row("SBIN", 800, 1.8, TODAY),           // gainer #5
      row("TATASTEEL", 150, -2.5, TODAY),     // loser #3
      row("BANKBARODA", 250, -4.5, TODAY),    // loser #1
      row("PNB", 100, -3.0, TODAY),           // loser #2 (tie with TATASTEEL? no: -3.0 < -2.5)
      row("YESBANK", 20, -1.0, TODAY),        // loser #5
      row("IDFCFIRSTB", 70, -1.4, TODAY),     // loser #4
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.gainers.map((g) => g.symbol)).toEqual([
      "INFY", "TCS", "ITC", "HDFCBANK", "SBIN", // INFY before TCS: tie 4.5 → symbol asc
    ]);
    expect(out.losers.map((l) => l.symbol)).toEqual([
      "BANKBARODA", "PNB", "TATASTEEL", "IDFCFIRSTB", "YESBANK",
    ]);
    // ranks are 1-based within kind
    expect(out.gainers[0].rank).toBe(1);
    expect(out.losers[0].rank).toBe(1);
  });

  it("a previous-session observation NEVER ranks, however big its move (Rule 3)", () => {
    const rows = [
      row("TCS", 3800, 25.0, YESTERDAY),   // huge but stale
      row("RELIANCE", 1200, 1.0, TODAY),   // small but this session
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.gainers.map((g) => g.symbol)).toEqual(["RELIANCE"]);
    expect(out.universeObserved).toBe(1);
  });

  it("rows without a disclosed percent change cannot rank (missing ≠ flat, Rule 16)", () => {
    const rows = [
      row("TCS", 3800, null, TODAY),
      row("RELIANCE", 1200, 1.0, TODAY),
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.gainers.map((g) => g.symbol)).toEqual(["RELIANCE"]);
  });

  it("non-registry symbols (tiles, unknown tickers) never rank (Rule 9)", () => {
    const rows = [
      row("NIFTY50", 22000, 9.9, TODAY),   // an index tile row in the cache
      row("BTC", 90000, 12.0, TODAY),      // a crypto tile row
      row("NOTASTOCK", 500, 8.0, TODAY),   // unknown ticker
      row("RELIANCE", 1200, 1.0, TODAY),
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.gainers.map((g) => g.symbol)).toEqual(["RELIANCE"]);
  });

  it("every ranked row carries its own source, observedAt and registry name (FD-15)", () => {
    const rows = [
      row("RELIANCE", 1200, 2.5, TODAY, { source: "yahoo-chart", volume24h: 1_234_567 }),
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    const g = out.gainers[0];
    expect(g.source).toBe("yahoo-chart");
    expect(g.observedAt).toBe(TODAY);
    expect(g.volume).toBe(1_234_567);
    expect(g.name).toBe("Reliance Industries"); // the REAL registry name
    expect(g.changePct).toBe(2.5);
    expect(g.price).toBe(1200);
  });

  it("universeObserved counts session-fresh registry rows (the panel's coverage disclosure)", () => {
    const rows = [
      row("RELIANCE", 1200, 1.0, TODAY),
      row("TCS", 3800, 2.0, TODAY),
      row("INFY", 1600, 3.0, YESTERDAY),   // stale → not observed this session
      row("NIFTY50", 22000, 4.0, TODAY),   // not registry → not counted
      row("ITC", 420, null, TODAY),        // no change disclosed → not rankable
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.universeObserved).toBe(2);
  });

  it("fewer eligible rows than the limit renders a short honest list, never padding", () => {
    const rows = [row("RELIANCE", 1200, 1.0, TODAY)];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.gainers).toHaveLength(1);
    expect(out.losers).toHaveLength(1); // the same row is both the top gainer and the top loser
  });
});
