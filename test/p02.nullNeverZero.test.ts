/**
 * Round-46 P0-2 (founder audit 2026-10-11): "use null, never 0, and
 * return no_verdict on missing inputs."
 *
 * The defect: placeholder zeros are scored as facts. On SBIN, D/E 0.00 is
 * a seed zero and six Rishis passed on it while Nemish Shah returned no
 * verdict on the SAME input — the panel disagreed about what "unknown"
 * means. The X6/Y4 contract (a seed-sourced 0 is the placeholder for
 * UNKNOWN, never an observation) already existed and was consumed by
 * exactly one scorer (Nemish). P0-2 makes it the whole panel's contract:
 * every scorer declares the fields its verdict REQUIRES, and a
 * placeholder-zero in any of them yields score: null — the same honest
 * no-verdict, from every framework, on the same input.
 *
 * Rule 21: watched FAILING before the fix (the module did not exist and
 * the zero-reading scorers scored SBIN's placeholder D/E as debt-free).
 */
import { describe, it, expect } from "vitest";

import {
  SCORER_VERDICT_CONTRACT,
  unknownAmong,
  noVerdictScore,
} from "@/lib/scorers/verdictGuards";
import { runAllScorers, seedScoringContext, TOTAL_RISHIS } from "@/lib/consensus/orchestrator";
import { STOCKS } from "@/data/stocks";
import type { Stock, RishiScore } from "@/lib/types";

const SBIN = STOCKS["SBIN"] as Stock;
const KWALITY = STOCKS["KWALITY"] as Stock;

/** All scorers, each run with the seed-zero context (the registry default). */
const panel = (s: Stock, ctx = seedScoringContext(s)): RishiScore[] =>
  runAllScorers(s, ctx);

const byName = (scores: RishiScore[], name: string) => {
  const r = scores.find(s => s.name === name);
  expect(r, `scorer ${name} missing from panel`).toBeDefined();
  return r!;
};

/** A fixture with NO placeholder zeros — every field observed (non-zero). */
const observedStock = (): Stock => ({
  symbol: "OBS", name: "Observed Ltd", sector: "FMCG", exchange: "NSE",
  price: 1500, pe: 22, roe: 25, mktcap: 120000, ocf: 3000, rev: 10000,
  revcagr: 15, epscagr: 18, opm: 20, roce: 22, de: 0.2, fcf: 1800,
  promo: 55, ca: 5000, tl: 2000, sh: 80, np: 1400, dep: 300,
  capex: 700, bvps: 600,
});

describe("P0-2 — the declared verdict contract", () => {
  it("every panel scorer has a contract entry, and every entry is a panel scorer", () => {
    const registry = panel(observedStock()).map(s => s.name).sort();
    const contract = Object.keys(SCORER_VERDICT_CONTRACT).sort();
    expect(contract).toEqual(registry);
    expect(registry).toHaveLength(TOTAL_RISHIS);
  });

  it("every required field is a real Stock numeric field, and no contract is empty", () => {
    const stockFields = Object.keys(STOCKS["SBIN"]).filter(
      k => typeof (STOCKS["SBIN"] as unknown as Record<string, unknown>)[k] === "number",
    );
    for (const [name, c] of Object.entries(SCORER_VERDICT_CONTRACT)) {
      expect(c.required.length, `${name} must declare what its verdict requires`).toBeGreaterThan(0);
      for (const f of c.required) {
        expect(stockFields, `${name}: required field ${f} must exist on Stock`).toContain(f);
      }
    }
  });

  it("the known zero-reading scorers require the fields the audit named (SBIN D/E, KWALITY P/E + ROE)", () => {
    // The audit's SBIN case: a placeholder D/E cannot earn a debt-free pass.
    for (const name of ["Munger", "Damani", "Kedia", "Walter Schloss", "Raamdeo", "Soros"]) {
      expect(SCORER_VERDICT_CONTRACT[name].required, `${name} must require de`).toContain("de");
    }
    // The audit's KWALITY case: placeholder P/E + ROE cannot score.
    for (const name of ["Graham", "Howard Marks", "Raamdeo", "John Templeton"]) {
      expect(SCORER_VERDICT_CONTRACT[name].required, `${name} must require pe`).toContain("pe");
    }
    for (const name of ["Munger", "Raamdeo", "Buffett"]) {
      expect(SCORER_VERDICT_CONTRACT[name].required, `${name} must require roe`).toContain("roe");
    }
  });
});

describe("P0-2 — no_verdict on missing inputs (the SBIN D/E 0.00 case)", () => {
  it("EVERY scorer whose verdict requires de returns null on SBIN's placeholder D/E", () => {
    const scores = panel(SBIN);
    for (const [name, c] of Object.entries(SCORER_VERDICT_CONTRACT)) {
      if (!c.required.includes("de")) continue;
      const r = byName(scores, name);
      expect(r.score, `${name} scored SBIN on a placeholder D/E`).toBeNull();
      expect(r.insight).toMatch(/[Nn]o verdict|insufficient/i);
      expect(r.insight).toMatch(/de/);
    }
  });

  it("EVERY scorer whose verdict requires pe or roe returns null on KWALITY's placeholders", () => {
    const scores = panel(KWALITY);
    for (const [name, c] of Object.entries(SCORER_VERDICT_CONTRACT)) {
      if (!c.required.includes("pe") && !c.required.includes("roe")) continue;
      const r = byName(scores, name);
      expect(r.score, `${name} scored KWALITY on placeholder P/E or ROE`).toBeNull();
    }
  });

  it("the no-verdict rows keep the attribution shell (name/full/label/origin) and carry NO fabricated comps", () => {
    const scores = panel(SBIN);
    const munger = byName(scores, "Munger");
    expect(munger.name).toBe("Munger");
    expect(munger.full).toBe("Charlie Munger");
    expect(munger.label).toBe("Mental Models");
    expect(munger.comps).toEqual([]);
    expect(munger.scoreRaw ?? null).toBeNull();
  });

  it("the whole-universe property: a numeric score NEVER rests on a placeholder-as-fact", () => {
    // For every registry stock and every scorer: if the scorer returned a
    // number, then NONE of its required fields is a placeholder unknown.
    // This is the consistency clause of the audit's finding — the same
    // input means the same thing to all 20 frameworks.
    let checked = 0;
    for (const stock of Object.values(STOCKS)) {
      const ctx = seedScoringContext(stock);
      for (const r of runAllScorers(stock, ctx)) {
        const contract = SCORER_VERDICT_CONTRACT[r.name];
        const unknown = unknownAmong(stock, contract.required, ctx);
        if (r.score !== null) {
          expect(unknown, `${r.name} scored ${stock.symbol} while ${unknown.join(",")} ${unknown.length > 1 ? "are" : "is"} a placeholder unknown`).toEqual([]);
        }
        checked++;
      }
    }
    expect(checked).toBe(TOTAL_RISHIS * Object.keys(STOCKS).length);
  });
});

describe("P0-2 — observed data still scores (the paired guard, C9)", () => {
  it("a stock with NO placeholder zeros produces finite scores from every scorer", () => {
    for (const r of panel(observedStock(), seedScoringContext(observedStock()))) {
      expect(r.score, `${r.name} refused an all-observed record`).not.toBeNull();
    }
  });

  it("a LIVE-sourced zero is a real observation and scores (G5: genuinely debt-free D/E)", () => {
    const debtFree: Stock = { ...observedStock(), de: 0 };
    // empty unknownFields = the resolved path's declaration that the zero
    // is LIVE-SOURCED (an observation), not a placeholder.
    const scores = panel(debtFree, { unknownFields: new Set<string>() });
    for (const name of ["Munger", "Damani", "Kedia"]) {
      expect(byName(scores, name).score, `${name} refused a live debt-free observation`).not.toBeNull();
    }
  });

  it("noVerdictScore is honest and self-describing", () => {
    const nv = noVerdictScore(SCORER_VERDICT_CONTRACT["Munger"], ["de", "promo"]);
    expect(nv.score).toBeNull();
    expect(nv.comps).toEqual([]);
    expect(nv.insight).toContain("de");
    expect(nv.insight).toContain("promo");
    expect(nv.insight).toMatch(/placeholder|unknown/);
  });
});
