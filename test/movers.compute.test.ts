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
import { computeLivePickFromRows, computeMoversFromRows, type MoverCacheRow } from "../lib/movers/compute";

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

// TODAY-MOVERS (founder order, 2026-10-13, this session): "add top 5
// movers" — the THIRD panel ranks the biggest absolute swings across
// BOTH directions, from the SAME gated pool (registry + session +
// usable price + disclosed change), with deterministic tie-breaks.
describe("TODAY-MOVERS — the movers ranking (biggest absolute swings)", () => {
  it("ranks movers by |pct| desc mixing directions, tie-break symbol asc", () => {
    const rows = [
      row("RELIANCE", 1200, 1.0, TODAY),
      row("TCS", 3800, -4.5, TODAY),
      row("INFY", 1600, 4.0, TODAY),
      row("ITC", 420, 0.5, TODAY),
      row("HDFCBANK", 1500, -0.2, TODAY),
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.movers.map(m => m.symbol)).toEqual(["TCS", "INFY", "RELIANCE", "ITC", "HDFCBANK"]);
    expect(out.movers.every(m => m.kind === "mover")).toBe(true);
    expect(out.movers.map(m => m.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("movers rows keep the FD-15 provenance pair and the registry name", () => {
    const rows = [row("RELIANCE", 1200, -2.5, TODAY, { source: "yahoo-bulk", volume24h: 12345 })];
    const out = computeMoversFromRows(rows, SESSION, 5);
    const m = out.movers[0];
    expect(m.source).toBe("yahoo-bulk");
    expect(m.observedAt).toBe(TODAY);
    expect(m.name).toBe("Reliance Industries");
    expect(m.changePct).toBe(-2.5);
  });

  it("the movers pool obeys the same gates: a prior-session row never ranks", () => {
    const rows = [
      row("RELIANCE", 1200, 9.0, YESTERDAY), // big move, wrong session
      row("TCS", 3800, 1.0, TODAY),
    ];
    const out = computeMoversFromRows(rows, SESSION, 5);
    expect(out.movers.map(m => m.symbol)).toEqual(["TCS"]);
  });

  it("a fully flat session renders an empty movers list (no padding)", () => {
    const out = computeMoversFromRows([], SESSION, 5);
    expect(out.movers).toEqual([]);
  });
});

describe("TODAY-FULL — computeLivePickFromRows (the LIVE Stock of the Day)", () => {
  it("picks the session's most-traded stock BY VALUE (price × volume), not by volume alone", () => {
    // PNB trades 2× the shares of ITC but at 1/4 the price — ITC has 2×
    // the traded value and must win the pick.
    const out = computeLivePickFromRows(
      [
        row("PNB", 100, 1.0, TODAY, { volume24h: 2_000_000 }),
        row("ITC", 400, -0.5, TODAY, { volume24h: 1_000_000 }),
      ],
      SESSION,
    );
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe("ITC");
    expect(out!.turnover).toBe(400_000_000);
  });

  it("the pick keeps every provenance figure and the counted pool size", () => {
    const out = computeLivePickFromRows(
      [
        row("RELIANCE", 1218.5, 3.25, TODAY, { volume24h: 12_345_678, source: "yahoo-bulk" }),
        row("TCS", 3895.2, 3.6, TODAY, { volume24h: 2_345_678 }),
      ],
      SESSION,
    );
    expect(out!.symbol).toBe("RELIANCE");
    expect(out!.name).toBeTruthy(); // registry name joined
    expect(out!.price).toBe(1218.5);
    expect(out!.changePct).toBe(3.25);
    expect(out!.volume).toBe(12_345_678);
    expect(out!.source).toBe("yahoo-bulk");
    expect(out!.observedAt).toBe(TODAY);
    expect(out!.universeObserved).toBe(2);
  });

  it("a percent change is NOT required to rank — the pick renders '—' change, not excluded", () => {
    const out = computeLivePickFromRows(
      [row("TCS", 3895.2, null, TODAY, { volume24h: 500_000 })],
      SESSION,
    );
    expect(out).not.toBeNull();
    expect(out!.symbol).toBe("TCS");
    expect(out!.changePct).toBeNull();
  });

  it("the same gates as the movers: registry-only, session-fresh, price>0, volume>0", () => {
    const out = computeLivePickFromRows(
      [
        row("NIFTY50", 24405, 0.5, TODAY, { volume24h: 99_999_999 }), // tile: not registry
        row("SBIN", 500, 20.0, YESTERDAY, { volume24h: 99_999_999 }), // wrong session
        row("ITC", 500, 1.0, TODAY),                                 // no disclosed volume
        row("PNB", 500, 1.0, TODAY, { volume24h: 0 }),               // zero is not a volume
        row("TCS", 0, 1.0, TODAY, { volume24h: 500_000 }),           // degenerate price
      ],
      SESSION,
    );
    expect(out).toBeNull(); // nothing eligible — the honest empty, never a fallback guess
  });

  it("deterministic tie-break: equal turnover picks the symbol-asc winner (Rule 18)", () => {
    const out = computeLivePickFromRows(
      [
        row("SBIN", 100, 1.0, TODAY, { volume24h: 1_000 }),
        row("PNB", 100, 1.0, TODAY, { volume24h: 1_000 }),
      ],
      SESSION,
    );
    expect(out!.symbol).toBe("PNB"); // PNB < SBIN symbol-asc
  });

  it("computeMoversFromRows carries the pick in the SAME read (one pool, one pass)", () => {
    const out = computeMoversFromRows(
      [row("RELIANCE", 1218.5, 3.25, TODAY, { volume24h: 12_345_678 })],
      SESSION,
      5,
    );
    expect(out.livePick).not.toBeNull();
    expect(out.livePick!.symbol).toBe("RELIANCE");
  });
});
