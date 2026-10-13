/**
 * LIVE-TODAY (founder order, 2026-10-13) + NSEPERM/TODAY-FULL (founder
 * order, 2026-10-14: "finish and tune it to world class now that we
 * have permission … make sure the full today panel is populated on
 * dashboard") — the movers PANEL render pin.
 *
 * Founder (13 Oct): "make sure today page on dashboard is fully working.
 * Also add top 5 losers and top 5 winner stocks on dashboard." Founder
 * (14 Oct): the NSE permission letter (ref NSE/MD/DATA/PERM/2026/0847)
 * prescribes the attribution wording "Source: NSE" for every page or
 * screen where the data or a derived figure appears (§4) — the
 * nse-transport rows now carry exactly that wording. This pin renders
 * the real server components (renderToStaticMarkup — the same
 * discipline as test/freshness.placeholder.test.ts) and enforces:
 *
 *   1. POSITIVE CONTROL (B-18): with a snapshot, all three named panels
 *      render with symbols, prices, change pairs, and per-row
 *      "Source · IST stamp" attributions (FD-15 wording — "Source: NSE"
 *      for the licensed NSE rows, "Yahoo Finance (unofficial)" for the
 *      computed path's rows);
 *   2. the derivation line discloses HOW the list was produced — the
 *      NSE line carries the universe scope and the licensed-use note;
 *      the caveat line keeps the delay/wrong disclosure and "Not
 *      investment advice";
 *   3. a null snapshot renders the honest not-generated state — and NO
 *      fabricated numbers (zero "₹" occurrences in the empty state);
 *   4. a row with no source renders "no source yet" and NO numbers
 *      (the FD-15 value-gated-on-source rule, both directions);
 *   5. registry symbols link to their stock page; untracked symbols
 *      render WITHOUT a link (no dead hrefs);
 *   6. TODAY-FULL: the live Stock of the Day row renders from the
 *      snapshot's pick — symbol, price, change, traded value, pool
 *      size, provenance, the explicit "not a verdict" label — and the
 *      no-pick state renders the honest empty, never a fabricated pick.
 *
 * Fail-first (C5): before the components existed every leg failed on
 * the missing module import; the NSEPERM legs (Source: NSE wording,
 * licensed derivation line, the pick row) failed against the round-56
 * wording before the presentation change, then passed.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TodayPanel } from "../components/dashboard/TodayPanel";
import { MoversPanel } from "../components/dashboard/MoversPanel";
import type { MoverRow, MoversSnapshot } from "../lib/movers/types";

function mover(partial: Partial<MoverRow> & { symbol: string; kind: "gainer" | "loser" | "mover"; rank: number }): MoverRow {
  return {
    name: null,
    price: 100,
    changePct: 2.5,
    volume: null,
    source: "nse-movers",
    observedAt: "2026-10-13T10:15:31.000Z",
    ...partial,
  };
}

const SNAPSHOT: MoversSnapshot = {
  gainers: [
    mover({ symbol: "RELIANCE", kind: "gainer", rank: 1, name: "Reliance Industries", price: 1218.5, changePct: 3.25 }),
    mover({ symbol: "UNTRACKED-X", kind: "gainer", rank: 2, price: 555.0, changePct: 2.0 }),
  ],
  losers: [
    mover({ symbol: "BANKBARODA", kind: "loser", rank: 1, price: 248.3, changePct: -4.5, source: "yahoo-bulk" }),
    mover({ symbol: "NOSOURCE", kind: "loser", rank: 2, price: 90.0, changePct: -2.0, source: null, observedAt: null }),
  ],
  // TODAY-MOVERS: the third panel — biggest absolute swings, computed
  // from the quote-cache session observations (NEVER a subset of the
  // NSE endpoint's own top lists — that would be a lie by omission).
  movers: [
    mover({ symbol: "TCS", kind: "mover", rank: 1, name: "Tata Consultancy Services", price: 3800, changePct: -4.5, source: "yahoo-bulk" }),
    mover({ symbol: "INFY", kind: "mover", rank: 2, name: "Infosys", price: 1600, changePct: 4.0, source: "yahoo-bulk" }),
  ],
  moversDerivation: "computed",
  moversUniverseObserved: 836,
  derivation: "nse",
  nseUniverse: "ALL",
  pick: {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: 1218.5,
    changePct: 3.25,
    volume: 12_345_678,
    turnover: 15_064_471_467,
    source: "nse-movers",
    observedAt: "2026-10-13T10:15:31.000Z",
    universeObserved: 827,
  },
  universeObserved: null,
  writtenAt: "2026-10-13T10:16:00.000Z",
};

describe("LIVE-TODAY — MoversPanel render (B-18 positive control)", () => {
  it("a snapshot renders ALL THREE named panels with rows, prices and FD-15 attributions", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: SNAPSHOT }));
    expect(html).toContain("Today&#x27;s Top 5 Winners");
    expect(html).toContain("Today&#x27;s Top 5 Losers");
    expect(html).toContain("Today&#x27;s Top 5 Movers");
    expect(html).toContain("data-movers-panel");
    expect(html).toContain("data-movers-row");
    // symbols render
    expect(html).toContain("RELIANCE");
    expect(html).toContain("BANKBARODA");
    // prices render (₹ formatting, en-IN)
    expect(html).toContain("₹1,218.5");
    // change pairs render with the sanctioned derivation
    expect(html).toContain("+3.25%");
    // per-row attribution: the licensed NSE wording (the letter's §4
    // prescription) + the Yahoo path, each with the IST stamp
    expect(html).toContain("Source: NSE · Tue 13 Oct, 15:45 IST");
    expect(html).toContain("Yahoo Finance (unofficial) · Tue 13 Oct, 15:45 IST");
    // the OLD unlicensed wording is gone (the letter supersedes it)
    expect(html).not.toContain("NSE (unofficial)");
  });

  it("the derivation line discloses the licensed NSE path with its universe scope (Rule 3)", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: SNAPSHOT }));
    expect(html).toContain("NSE&#x27;s own movers ranking — all securities");
    expect(html).toContain("licensed use, NSE/MD/DATA/PERM/2026/0847");
    expect(html).toContain("Market data — may be delayed, incomplete, or wrong");
    expect(html).toContain("Not investment advice");
  });

  it("the NIFTY universe scope is disclosed when NIFTY served (not ALL)", () => {
    const html = renderToStaticMarkup(
      React.createElement(MoversPanel, { movers: { ...SNAPSHOT, nseUniverse: "NIFTY" } }),
    );
    expect(html).toContain("NSE&#x27;s own movers ranking — Nifty 50");
  });

  it("the computed derivation discloses the observed-universe count", () => {
    const html = renderToStaticMarkup(
      React.createElement(MoversPanel, {
        movers: { ...SNAPSHOT, derivation: "computed", universeObserved: 412, nseUniverse: null },
      }),
    );
    expect(html).toContain("412 tracked symbols observed");
    expect(html).toContain("Yahoo Finance (unofficial) transport");
  });

  it("a null snapshot renders the honest not-generated state with ZERO fabricated numbers", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: null }));
    expect(html).toContain("data-movers-notgenerated");
    expect(html).toContain("no data yet");
    expect(html).toContain("Nothing is estimated");
    // no prices, no change pairs, no row markers
    expect(html).not.toContain("₹");
    expect(html).not.toContain("data-movers-row");
    expect(html).not.toContain("▲");
  });

  it("a sourceless row renders 'no source yet' and NO numbers (FD-15 gate)", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: SNAPSHOT }));
    expect(html).toContain("no source yet");
    // the NOSOURCE row's price must NOT render (value gated on source)
    expect(html).not.toContain("₹90");
  });

  it("registry symbols link to their stock page; untracked symbols render linkless", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: SNAPSHOT }));
    expect(html).toContain('href="/stock/RELIANCE"');
    expect(html).toContain('href="/stock/BANKBARODA"');
    expect(html).not.toContain('href="/stock/UNTRACKED-X"');
    expect(html).not.toContain('href="/stock/NOSOURCE"');
    // the untracked symbol still renders as text
    expect(html).toContain("UNTRACKED-X");
  });
});

describe("TODAY-MOVERS — the third panel (biggest absolute swings, founder order 2026-10-13)", () => {
  it("renders the movers list with BOTH-direction rows, ordered by |pct| desc", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: SNAPSHOT }));
    expect(html).toContain("Today&#x27;s Top 5 Movers");
    expect(html).toContain('data-movers-kind="mover"');
    // both directions render (a movers list is direction-agnostic)
    expect(html).toContain("TCS");
    expect(html).toContain("INFY");
    // the FD-15 attribution rides the mover rows too
    expect(html).toContain("Yahoo Finance (unofficial) · Tue 13 Oct, 15:45 IST");
    // registry names + links work for movers as well
    expect(html).toContain('href="/stock/TCS"');
    expect(html).toContain('href="/stock/INFY"');
  });

  it("the movers list discloses its own computed derivation and observed count", () => {
    const html = renderToStaticMarkup(React.createElement(MoversPanel, { movers: SNAPSHOT }));
    // the movers list is ALWAYS computed (NSE's endpoint only ranks its
    // own gainers/losers) — the panel says so, with the count
    expect(html).toContain("836 tracked symbols observed");
  });

  it("a snapshot whose cache read returned nothing renders the movers list honestly empty", () => {
    const html = renderToStaticMarkup(
      React.createElement(MoversPanel, {
        movers: { ...SNAPSHOT, movers: [], moversDerivation: null, moversUniverseObserved: null },
      }),
    );
    expect(html).toContain("Today&#x27;s Top 5 Movers");
    expect(html).toContain("No movers to list yet");
  });
});

describe("TODAY-FULL — the LIVE Stock of the Day row (founder order, 2026-10-14)", () => {
  it("a pick renders: symbol link, price, change, traded value, pool size, provenance, NOT-a-verdict label", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, { movers: SNAPSHOT, latestNews: null }),
    );
    expect(html).toContain("data-today-sod-row");
    expect(html).toContain('data-today-sod');
    expect(html).toContain('href="/stock/RELIANCE"');
    expect(html).toContain("₹1,218.5");
    expect(html).toContain("+3.25%");
    // the traded value (Indian grouping) and the pick's basis
    expect(html).toContain("traded today");
    expect(html).toContain("most-traded stock by value");
    // the explicit not-a-verdict label (P0-1/P0-8 clean)
    expect(html).toContain("not a verdict");
    // the provenance pair + the counted pool
    expect(html).toContain("Source: NSE · Tue 13 Oct, 15:45 IST");
    expect(html).toContain("top of 827 tracked symbols");
    // the seed banner is GONE (the pick is live, not seed-derived)
    expect(html).not.toContain("Seed data");
    expect(html).not.toContain("data-seed-banner");
  });

  it("a pick without a percent change renders the em-dash change, never 0", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, {
        movers: {
          ...SNAPSHOT,
          pick: { ...SNAPSHOT.pick!, price: 777.7, changePct: null },
        },
        latestNews: null,
      }),
    );
    expect(html).toContain("data-today-sod-row");
    // the pick's distinctive price renders; its change renders nothing
    // numeric (missing ≠ 0, Rule 16)
    expect(html).toContain("₹777.7");
    expect(html).not.toContain("+0.00%");
    expect(html).not.toContain("-0.00%");
    expect(html).not.toContain("777.7%");
  });

  it("a sourceless pick renders 'no source yet' and NO numbers (the FD-15 gate holds for the pick)", () => {
    // Distinctive price so the assertion can tell the PICK's numbers
    // from the movers rows' own (which keep their sources).
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, {
        movers: { ...SNAPSHOT, pick: { ...SNAPSHOT.pick!, price: 777.7, source: null } },
        latestNews: null,
      }),
    );
    expect(html).toContain("data-today-sod-row");
    expect(html).toContain("no source yet");
    expect(html).not.toContain("₹777.7");
    expect(html).not.toContain("₹15,064"); // the turnover is gated too
  });

  it("no pick renders the honest empty — never a fabricated subject", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, { movers: { ...SNAPSHOT, pick: null }, latestNews: null }),
    );
    expect(html).toContain("data-today-sod-empty");
    expect(html).toContain("no live pick yet");
    expect(html).not.toContain("data-today-sod-row");
  });

  it("a pick with a Yahoo source attributes Yahoo (the pick's own provenance rules)", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, {
        movers: { ...SNAPSHOT, pick: { ...SNAPSHOT.pick!, source: "yahoo-bulk" } },
        latestNews: null,
      }),
    );
    expect(html).toContain("Yahoo Finance (unofficial) · Tue 13 Oct, 15:45 IST");
  });
});

describe("LIVE-TODAY — TodayPanel render (the honest literals survive)", () => {
  it("the Today panel mounts the movers view and keeps every honest literal", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, { movers: SNAPSHOT, latestNews: null }),
    );
    expect(html).toContain("data-today-panel");
    expect(html).toContain("data-movers-panel");
    expect(html).toContain("Verdicts produced today");
    expect(html).toContain("none");
    expect(html).toContain("No headlines yet");
    expect(html).toContain("not started");
    expect(html).toContain("IST");
  });

  it("a null movers snapshot keeps the Today panel honest, not broken", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, { movers: null, latestNews: null }),
    );
    expect(html).toContain("data-today-panel");
    expect(html).toContain("data-movers-notgenerated");
    expect(html).toContain("data-today-sod-empty");
    expect(html).toContain("Verdicts produced today");
  });

  it("the live news row renders the headline with publisher and age when the feed returned one", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, {
        movers: SNAPSHOT,
        latestNews: { headline: "Markets close higher", source: "Economic Times", minutesAgo: 12 },
      }),
    );
    expect(html).toContain("Markets close higher");
    expect(html).toContain("Economic Times");
    expect(html).toContain("12 min ago");
    expect(html).not.toContain("No headlines yet");
  });
});
