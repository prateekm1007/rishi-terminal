/**
 * G5 (founder round 23) — duplicate-seed-instrument registry merge.
 *
 * The seed universe held the same instrument TWICE for ten companies: an
 * old/bogus symbol row alongside the current symbol row. Every bogus
 * symbol 404'd at the provider while its pair served the SAME company
 * name (Yahoo v8 chart meta.longName, 2026-10-07 in-session; table in
 * docs/evidence/round23/g5-duplicate-merge.md):
 *
 *   ANUPAM→ANURAS   BAYER→BAYERCROP  BLUESTAR→BLUESTARCO  COLGATE→COLPAL
 *   INFOEDGE→NAUKRI TASYBITE→TASTYBITE  GODAWARI→GPIL  RAILVIKAS→RVNL
 *   JINDALSTPP→JINDALSTEL  JAINIRRIG→JISLJALEQS
 *
 * The merge removes the bogus row and registers the mapping in
 * tickerAliases.json, which (T12 machinery) drives: 308 redirects on
 * /stock/[symbol], silent read-migration of watchlist/portfolio/alerts,
 * and canonicalization at /api/fundamentals and ingest.
 *
 * Fail-first: on pre-fix main every "removed symbol" test fails (the rows
 * are still present); raw RED is in the evidence file.
 */
import { describe, expect, it } from "vitest";
import { STOCKS } from "../data/stocks";
import { MASTER_STOCK_LIST } from "../data/stocks/master-list";
import { TICKER_ALIASES } from "../lib/registry/tickerRegistry";
import { resolveTickerSymbol } from "../lib/registry/registryAudit";

const MERGES: Array<[bogus: string, canonical: string, company: string]> = [
  ["ANUPAM", "ANURAS", "Anupam Rasayan India Ltd"],
  ["BAYER", "BAYERCROP", "Bayer CropScience Limited"],
  ["BLUESTAR", "BLUESTARCO", "Blue Star Limited"],
  ["COLGATE", "COLPAL", "Colgate-Palmolive (India) Limited"],
  ["INFOEDGE", "NAUKRI", "Info Edge (India) Limited"],
  ["TASYBITE", "TASTYBITE", "Tasty Bite Eatables Limited"],
  ["GODAWARI", "GPIL", "Godawari Power & Ispat Limited"],
  ["RAILVIKAS", "RVNL", "Rail Vikas Nigam Limited"],
  ["JINDALSTPP", "JINDALSTEL", "Jindal Steel Limited"],
  ["JAINIRRIG", "JISLJALEQS", "Jain Irrigation Systems Limited"],
];

describe("G5 — duplicate instruments merged out of the registry", () => {
  it.each(MERGES)(
    "MUST FAIL PRE-FIX: %s is not a registry row (merged into %s — %s)",
    (bogus) => {
      expect(STOCKS[bogus]).toBeUndefined();
    },
  );

  it.each(MERGES)("%s aliases to the live canonical row %s", (bogus, canonical) => {
    expect(TICKER_ALIASES[bogus]).toBe(canonical);
    expect(STOCKS[canonical]).toBeDefined();
  });

  it.each(MERGES)(
    "full resolution lands on the canonical symbol (user-data migration + 308 path)",
    (bogus, canonical) => {
      expect(resolveTickerSymbol(bogus)).toBe(canonical);
    },
  );

  it("no alias maps to a missing canonical row and none shadows a live row", () => {
    for (const [oldSym, canonical] of Object.entries(TICKER_ALIASES)) {
      expect(STOCKS[canonical], `${oldSym} -> ${canonical}`).toBeDefined();
      expect(STOCKS[oldSym], `${oldSym} must not be its own row`).toBeUndefined();
    }
  });

  it("the ten distinct companies remain exactly once each", () => {
    const companies = new Set(
      MERGES.map(([, canonical]) => canonical),
    );
    expect(companies.size).toBe(MERGES.length);
    for (const c of companies) expect(STOCKS[c]).toBeDefined();
  });

  it("universe shrank by exactly the merged rows (916 -> 906)", () => {
    expect(Object.keys(STOCKS)).toHaveLength(906);
  });
});

describe("G5 — master list hygiene", () => {
  it("has no duplicate entries (LTIM/ADANIPORTS/GILLETTE were doubled)", () => {
    const counts = new Map<string, number>();
    for (const s of MASTER_STOCK_LIST) counts.set(s, (counts.get(s) ?? 0) + 1);
    const dups = [...counts.entries()].filter(([, c]) => c > 1);
    expect(dups).toEqual([]);
  });

  it("every entry resolves to a registry row (directly or via alias)", () => {
    for (const s of MASTER_STOCK_LIST) {
      const resolved = resolveTickerSymbol(s);
      expect(resolved, `master-list symbol ${s} resolves`).not.toBeNull();
      expect(STOCKS[resolved as string], `master-list symbol ${s} -> ${resolved}`).toBeDefined();
    }
  });

  it("stale master entries were pruned (no row, no alias)", () => {
    const pruned = [
      "BAJAJCORP", "CSBANK", "GSKCONS", "IRB", "JETAIRWAYS",
      "JUBLPHARMA", "SHRIRAMFIN", "SONATSOFTW", "ZOMATO",
    ];
    for (const s of pruned) {
      expect(MASTER_STOCK_LIST).not.toContain(s);
    }
  });
});
