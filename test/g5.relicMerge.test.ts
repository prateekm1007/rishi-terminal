/**
 * G5 round-24 follow-up — relic-instrument registry merge.
 *
 * The E4 residual classification (docs/evidence/round24/
 * e4-residual-classification.md §3) found ten MORE seed rows whose symbol
 * is a dead relic of a renamed/merged listed entity, while the CURRENT
 * ticker is itself a STOCKS key serving a fresh quote (probes
 * 2026-10-07 ~09:39 UTC: relic .NS 404 + current .NS serves current INR):
 *
 *   MCXINDIA→MCX            TORNT→TORNTPHARM      MACROTECH→LODHA
 *   GMRINFRA→GMRAIRPORT     INOXLEISURE→PVRINOX   MAGMA→POONAWALLA
 *   TATACOFFEE→TATACONSUM   IIFLWAM→360ONE        TV18BRDCST→NETWORK18
 *   JSWISPL→JSWSTEEL
 *
 * Unlike the round-23 G5 pairs, the old/new NAMES differ materially
 * (renames and mergers), which is exactly why the name-similarity census
 * missed them; the corporate successions are public record and each
 * current key demonstrably serves the same listed entity.
 *
 * The merge removes the relic row and registers the mapping in
 * tickerAliases.json (T12 machinery: redirects, user-data migration,
 * canonicalization).
 *
 * Fail-first: on pre-fix main every "removed symbol" test fails (the rows
 * are still present); raw RED is in the evidence file.
 */
import { describe, expect, it } from "vitest";
import { STOCKS } from "../data/stocks";
import { TICKER_ALIASES } from "../lib/registry/tickerRegistry";
import { resolveTickerSymbol } from "../lib/registry/registryAudit";

const RELICS: Array<[relic: string, canonical: string, event: string]> = [
  ["MCXINDIA", "MCX", "same instrument carried under both spellings"],
  ["TORNT", "TORNTPHARM", "ticker normalization (Torrent Pharmaceuticals)"],
  ["MACROTECH", "LODHA", "Macrotech Developers = erstwhile Lodha Developers (NSE: LODHA)"],
  ["GMRINFRA", "GMRAIRPORT", "GMR Infrastructure renamed GMR Airports"],
  ["INOXLEISURE", "PVRINOX", "INOX Leisure merged into PVR (2023)"],
  ["MAGMA", "POONAWALLA", "Magma Fincorp renamed Poonawalla Fincorp"],
  ["TATACOFFEE", "TATACONSUM", "Tata Coffee merged into Tata Consumer"],
  ["IIFLWAM", "360ONE", "IIFL Wealth Management renamed 360 One WAM"],
  ["TV18BRDCST", "NETWORK18", "TV18 Broadcast merged into Network18"],
  ["JSWISPL", "JSWSTEEL", "JSW Ispat merged into JSW Steel (2014)"],
];

describe("G5 round-24 — relic instruments merged out of the registry", () => {
  it.each(RELICS)(
    "MUST FAIL PRE-FIX: %s is not a registry row (relic of %s — %s)",
    (relic) => {
      expect(STOCKS[relic]).toBeUndefined();
    },
  );

  it.each(RELICS)(
    "%s resolves to its current instrument %s through the alias map",
    (relic, canonical) => {
      expect(TICKER_ALIASES[relic]).toBe(canonical);
      expect(resolveTickerSymbol(relic)).toBe(canonical);
    },
  );

  it("the merge did not shrink the canonical side: every current key is present", () => {
    for (const [, canonical] of RELICS) {
      expect(STOCKS[canonical]).toBeDefined();
    }
  });

  it("the universe is 896 rows after the ten relic removals", () => {
    expect(Object.keys(STOCKS).length).toBe(896);
  });
});
