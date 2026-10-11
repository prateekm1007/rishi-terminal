/**
 * Round-46 P0-2 — placeholder zeros are never facts (founder audit
 * 2026-10-11). Rule 21: written and run BEFORE the fix; the raw RED
 * output rides in the PR description and the round evidence file.
 *
 * The founder's defect list, verified live on production `3c1f096b`:
 *   - KWALITY (P/E 0.0x, ROE 0.0%) scored 76; DFL 73, EASEMYTRIP 72,
 *     DISH 71, ESAFSFB/HCC/NSLNISP/RENUKA/UTKARSHBNK/WATERBASE 69 —
 *     placeholder zeros scored as observations.
 *   - /api/stock/KWALITY serves `pe: 0, roe: 0` verbatim (wire fact).
 *   - SBIN's seed `D/E 0.00` (deposits are not corporate debt — the
 *     concept does not apply to a bank) is passed by six Rishis while
 *     Nemish returns no verdict on the same input.
 *
 * Founder order: "Fix: use null, never 0, and return no_verdict on
 * missing inputs."
 *
 * The contract this file pins:
 *   1. DATASET — the placeholder-zero classes are NULL in the data:
 *      `pe: 0` (P/E zero is impossible for profit-makers and undefined
 *      for loss-makers), `roe: 0` (same class), Banking `de: 0` and
 *      Banking `opm: 0` (concept inapplicable — the page itself says
 *      D/E · OPM · FCF are hidden for banks). Plausible zeros stay
 *      typed values: non-bank `de: 0` (debt-free is real), `promo: 0`
 *      (professionally managed is real).
 *   2. SCORERS — every scorer returns `score: null` (no verdict) when
 *      a REQUIRED input is null or a seed placeholder unknown (the X6/
 *      Y4 contract: seed 0 = unknown; live 0 = observation per G5).
 *      The required-inputs table below is the contract; scorers that
 *      consume a nulled field on a probe record must return null.
 *   3. WIRE — /api/stock/[symbol] serves the nulls (pe: null, not 0).
 *   4. QUALITY — a null P/E is UNKNOWN, not impossible: KWALITY (real
 *      opm/roce/de values beside the nulls) classifies `seed`, while
 *      the synthetic impossibility rule (pe 0 + np > 0) still catches
 *      `missing` (the round-5 regression catch must keep biting).
 *   5. LIVE ZERO — a live-sourced D/E of 0 (genuinely debt-free) still
 *      scores: the fix may not reinterpret live observations as
 *      missing (G5, pinned in x6.nemishPlaceholders.test.ts).
 */
import { describe, expect, it } from "vitest";

import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/types";
import { runAllScorers, seedScoringContext } from "@/lib/consensus/orchestrator";
import { SCORER_REGISTRY } from "@/lib/consensus/orchestrator";
import { dataQualityFromSeedStock } from "@/lib/dataQuality";
import { GET as getStockRoute } from "@/app/api/stock/[symbol]/route";
import type { NextRequest } from "next/server";

const isBank = (s: Stock) => s.sector === "Banking";

// The required-inputs contract is THE MERGED #337 declaration
// (lib/scorers/verdictGuards SCORER_VERDICT_CONTRACT) — one source of
// truth (rule 14). This test pins the DATA-LAYER leg against it.
import { SCORER_VERDICT_CONTRACT } from "@/lib/scorers/verdictGuards";
const REQUIRED_INPUTS: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(SCORER_VERDICT_CONTRACT).map(([k, v]) => [k, v.required]),
);

const PROBES = ["KWALITY", "SBIN", "AUBANK"] as const;

function nullOrUnknownFields(s: Stock): Set<string> {
  const unknown = new Set<string>();
  for (const [k, v] of Object.entries(s)) {
    if (v === null) unknown.add(k as keyof Stock);
    else if (typeof v === "number" && v === 0) unknown.add(k as keyof Stock); // seed semantics (Y4)
  }
  return unknown;
}

describe("P0-2 dataset — the placeholder-zero classes are null, never 0", () => {
  it("no stock carries pe: 0 (impossible for profit-makers, undefined for loss-makers)", () => {
    const offenders = Object.values(STOCKS).filter((s) => s.pe === 0);
    expect(offenders.map((s) => s.symbol)).toEqual([]);
  });

  it("no stock carries roe: 0 (same placeholder class)", () => {
    const offenders = Object.values(STOCKS).filter((s) => s.roe === 0);
    expect(offenders.map((s) => s.symbol)).toEqual([]);
  });

  it("no BANKING stock carries de: 0 or opm: 0 (concept inapplicable)", () => {
    const deOff = Object.values(STOCKS).filter((s) => isBank(s) && s.de === 0);
    const opmOff = Object.values(STOCKS).filter((s) => isBank(s) && s.opm === 0);
    expect({ deOffenders: deOff.map((s) => s.symbol), opmOffenders: opmOff.map((s) => s.symbol) })
      .toEqual({ deOffenders: [], opmOffenders: [] });
  });

  it("plausible zeros stay typed values (non-bank debt-free de, professional promo)", () => {
    // The surgery may not launder plausible observations into unknowns.
    expect(STOCKS.ABBOTINDIA.de).toBe(0);   // debt-free non-bank: real
    expect(STOCKS.APOLLOHOSP.promo).toBe(0); // professionally managed: real
  });

  it("the founder's named probe records carry the nulls (KWALITY/SBIN/AUBANK)", () => {
    expect(STOCKS.KWALITY.pe).toBeNull();
    expect(STOCKS.KWALITY.roe).toBeNull();
    expect(STOCKS.SBIN.de).toBeNull();
    expect(STOCKS.AUBANK.de).toBeNull();
    expect(STOCKS.AUBANK.opm).toBeNull();
  });
});

describe("P0-2 scorers — no verdict on missing required inputs", () => {
  for (const sym of PROBES) {
    it(`${sym}: every scorer consuming a null/unknown required input returns score null`, () => {
      const stock = STOCKS[sym];
      const unknown = nullOrUnknownFields(stock);
      const results = runAllScorers(stock, seedScoringContext(stock));
      expect(results).toHaveLength(SCORER_REGISTRY.length);
      for (const r of results) {
        const required = REQUIRED_INPUTS[r.name];
        expect(required, `required-inputs table covers ${r.name}`).toBeDefined();
        const consumesUnknown = required!.some((f) => unknown.has(f));
        if (consumesUnknown) {
          expect(
            r.score,
            `${r.name} must return no verdict on ${sym} (consumes a null/unknown required input)`,
          ).toBeNull();
        }
      }
    });
  }

  it("SBIN's D/E is consumed by no scorer as a fact (the six-Rishi pass is gone)", () => {
    // The founder's exact defect: six Rishis passed SBIN's seed D/E 0.00
    // while Nemish returned no verdict. After P0-2 every D/E consumer
    // returns null on SBIN — count the D/E-consuming scorers and assert
    // every one of them is null.
    const stock = STOCKS.SBIN;
    expect(stock.de).toBeNull();
    const results = runAllScorers(stock, seedScoringContext(stock));
    const deConsumers = results.filter((r) => REQUIRED_INPUTS[r.name]!.includes("de"));
    expect(deConsumers.length).toBeGreaterThanOrEqual(8);
    for (const r of deConsumers) {
      expect(r.score, `${r.name} consumes D/E and must not verdict on SBIN`).toBeNull();
    }
  });

  it("a null verdict documents the insufficient input — never a zero score, never silent", () => {
    const stock = STOCKS.KWALITY;
    const results = runAllScorers(stock, seedScoringContext(stock));
    const nulls = results.filter((r) => r.score === null);
    expect(nulls.length).toBeGreaterThan(0);
    for (const r of nulls) {
      expect(r.scoreRaw ?? "insufficient").not.toBe(0);
      // The merged #337 contract returns the attribution shell with NO
      // comps and an insight that names the placeholder unknowns;
      // Nemish's X6 heritage keeps comp-level details. Both are honest —
      // a SILENT null (empty insight) is not.
      const texts = [r.insight, ...r.comps.map((c) => c.detail)].join(" ").toLowerCase();
      expect(
        texts.includes("no verdict") || texts.includes("insufficient") || texts.includes("unknown"),
        `${r.name} names its insufficiency`,
      ).toBe(true);
    }
  });
});

describe("P0-2 wire — /api/stock serves nulls, not placeholder zeros", () => {
  it("KWALITY's wire record carries pe: null, roe: null", async () => {
    const req = { nextUrl: new URL("https://x/api/stock/KWALITY") } as unknown as NextRequest;
    const res = await getStockRoute(req, { params: Promise.resolve({ symbol: "KWALITY" }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { stock: Stock };
    expect(body.stock.pe).toBeNull();
    expect(body.stock.roe).toBeNull();
  });
});

describe("P0-2 data quality — null is unknown, not impossible", () => {
  it("KWALITY (real values beside the nulls) classifies seed, not missing", () => {
    expect(dataQualityFromSeedStock(STOCKS.KWALITY as never)).toBe("seed");
  });

  it("the round-5 impossibility catch still bites on synthetic zeros (pe 0 + np > 0)", () => {
    const synthetic: Stock = { ...STOCKS.KWALITY!, pe: 0 } as unknown as Stock;
    expect(dataQualityFromSeedStock(synthetic as never)).toBe("missing");
  });
});
