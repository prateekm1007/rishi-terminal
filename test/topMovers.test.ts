/**
 * Top movers on the dashboard (13 Oct 2026). Founder's words: "Okay just add
 * top 5 movers, top 5 losers and top 5 winners on dashboard for stocks".
 * Source: the NSE quote feed already held in the quote cache (an unofficial
 * endpoint). The panel says so, and says display permission is pending.
 */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { rankTopMovers, type MoverInput } from "../lib/markets/topMovers";
import { TopMoversPanel } from "../components/dashboard/TopMoversPanel";

const NOW = Date.parse("2026-10-13T10:00:00Z");
const ago = (min: number): string => new Date(NOW - min * 60_000).toISOString();
const q = (symbol: string, change: number | null, observedAt: string | null = ago(5)): MoverInput => ({
  symbol,
  name: `${symbol} Ltd`,
  price: 100,
  change,
  observedAt,
  source: "NSE quote feed",
});

describe("rankTopMovers", () => {
  it("winners are the five largest positive changes, highest first", () => {
    const r = rankTopMovers(
      [q("A", 1), q("B", 6), q("C", 3), q("D", 5), q("E", 2), q("F", 4), q("G", 0.5)],
      { nowMs: NOW },
    );
    expect(r.winners.map((x) => x.symbol)).toEqual(["B", "D", "F", "C", "E"]);
  });

  it("losers are the five largest negative changes, most negative first", () => {
    const r = rankTopMovers(
      [q("A", -1), q("B", -6), q("C", -3), q("D", -5), q("E", -2), q("F", -4), q("G", -0.5)],
      { nowMs: NOW },
    );
    expect(r.losers.map((x) => x.symbol)).toEqual(["B", "D", "F", "C", "E"]);
  });

  it("movers are the five largest absolute changes, either sign", () => {
    const r = rankTopMovers(
      [q("A", 2), q("B", -7), q("C", 5), q("D", -4), q("E", 1), q("F", -6), q("G", 3)],
      { nowMs: NOW },
    );
    expect(r.movers.map((x) => x.symbol)).toEqual(["B", "F", "C", "D", "G"]);
  });

  it("null change is not zero: it is never ranked and is counted as excluded", () => {
    const r = rankTopMovers([q("A", 9), q("B", null), q("C", 1)], { nowMs: NOW });
    expect(r.winners.map((x) => x.symbol)).toEqual(["A", "C"]);
    expect(r.excluded.nullChange).toBe(1);
    expect(r.eligible).toBe(2);
  });

  it("stale and undated quotes are excluded", () => {
    const r = rankTopMovers([q("A", 9, ago(60 * 25)), q("B", 8, null), q("C", 1, ago(10))], { nowMs: NOW });
    expect(r.winners.map((x) => x.symbol)).toEqual(["C"]);
    expect(r.excluded.stale).toBe(1);
    expect(r.excluded.undated).toBe(1);
  });

  it("zero change is neither a winner nor a loser", () => {
    const r = rankTopMovers([q("A", 0), q("B", -1), q("C", 1)], { nowMs: NOW });
    expect(r.winners.map((x) => x.symbol)).toEqual(["C"]);
    expect(r.losers.map((x) => x.symbol)).toEqual(["B"]);
  });

  it("ties break by symbol, so the order is deterministic", () => {
    const r = rankTopMovers([q("ZED", 2), q("ABC", 2), q("MID", 2)], { nowMs: NOW });
    expect(r.winners.map((x) => x.symbol)).toEqual(["ABC", "MID", "ZED"]);
  });

  it("fewer than five eligible: status is insufficient and lists show what exists, with no padding", () => {
    const r = rankTopMovers([q("A", 1), q("B", -1), q("C", 2)], { nowMs: NOW });
    expect(r.status).toBe("insufficient");
    expect(r.winners).toHaveLength(2);
    expect(r.losers).toHaveLength(1);
    expect(r.considered).toBe(3);
  });

  it("five or more eligible: status is ready", () => {
    const r = rankTopMovers([q("A", 1), q("B", -1), q("C", 2), q("D", 3), q("E", -2)], { nowMs: NOW });
    expect(r.status).toBe("ready");
  });
});

describe("TopMoversPanel", () => {
  it("insufficient data: says it is waiting for quotes, with the counts", () => {
    const r = rankTopMovers([q("A", 1)], { nowMs: NOW });
    const html = renderToStaticMarkup(createElement(TopMoversPanel, { result: r }));
    expect(html).toContain("Waiting for quotes");
    expect(html).toContain("1 of 1");
  });

  it("ready: five winners only, labelled as an unofficial NSE feed with permission pending", () => {
    const r = rankTopMovers(
      [q("W1", 6), q("W2", 5), q("W3", 4), q("W4", 3), q("W5", 2), q("W6", 1), q("L1", -1)],
      { nowMs: NOW },
    );
    const html = renderToStaticMarkup(createElement(TopMoversPanel, { result: r }));
    for (const s of ["W1", "W2", "W3", "W4", "W5"]) expect(html).toContain(s);
    expect(html).not.toContain("W6");
    expect(html).toContain("unofficial");
    expect(html).toContain("display permission pending");
  });

  it("a null-change quote never reaches the rendered page", () => {
    const r = rankTopMovers(
      [q("NULLCHG", null), q("OK", 1), q("A", 2), q("B", 3), q("C", 4), q("D", 5)],
      { nowMs: NOW },
    );
    const html = renderToStaticMarkup(createElement(TopMoversPanel, { result: r }));
    expect(html).not.toContain("NULLCHG");
  });
});
