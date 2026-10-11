/**
 * Round-47 P0-8 (founder directive 2026-10-11, the licensing message):
 * "Treat any price-based score as unresolved until NSE answers in
 * writing." and "Until those answers are in writing, use price-based
 * scores for your own use only."
 *
 * The defect class: every framework verdict that reads a price-derived
 * input (P/E, market capitalisation, price — P/B and earnings yield are
 * ratios ON the price) is an automated calculation on market data. NSE's
 * published terms charge separately for DISPLAY of its data and define
 * automated calculations as a non-display usage needing its own
 * agreement. The product is public: rendering such a score before the
 * exchange answers in writing publishes an unlicensed derivation.
 *
 * The fix: THE PRICE-LICENSE GATE — a per-scorer declaration
 * (`priceBased` on SCORER_VERDICT_CONTRACT, the one scorer contract) and
 * one publication switch (PRICE_DATA_LICENSE in lib/licensing.ts,
 * fail-closed: the default state refuses). Every scorer consults
 * `licenseRefusal` AFTER the sector gate and the placeholder guard — the
 * row-specific truths keep naming themselves (a lender row still says
 * "does not apply to a Banking company"; a placeholder row still says
 * "placeholder zero") and the license is the LAST line nothing
 * price-based crosses.
 *
 * Rule 21: watched FAILING before the fix — an observed non-lender
 * fixture scored on all 20 frameworks and no refusal naming the license
 * existed anywhere.
 *
 * The founder's words are declared HERE independently of the
 * implementation (the drift pin) — the switch's declared state must
 * match them exactly.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

import {
  SCORER_VERDICT_CONTRACT,
} from "@/lib/scorers/verdictGuards";
import { runAllScorers, seedScoringContext } from "@/lib/consensus/orchestrator";
import { buildConsensus } from "@/lib/consensus/engine";
import { STOCKS } from "@/data/stocks";
import { isLenderSector } from "@/lib/scorers/sectorGate";
import type { Stock, RishiScore } from "@/lib/types";

/** The founder's P0-8 words, independent of the implementation. */
const FOUNDER_ORDER = "unresolved until NSE answers in writing";
/** The frameworks whose verdict READS a price-derived input (audited by
 *  grep over lib/scorers: pe / price / mktcap / price-derived ratios). */
const FOUNDER_PRICE_BASED = [
  "Graham", "Buffett", "Howard Marks", "Jhunjhunwala", "Basant",
  "Kacholia", "Kedia", "Lynch", "Pabrai", "Philip Fisher", "Porinju",
  "Raamdeo", "Walter Schloss", "Seth Klarman", "Soros",
  "John Templeton", "Greenblatt", "Nemish",
];
/** The two frameworks that never read price (audited by grep). */
const FOUNDER_FUNDAMENTAL_ONLY = ["Damani", "Munger"];

function panel(stock: Stock): RishiScore[] {
  return runAllScorers(stock, seedScoringContext(stock));
}

function byName(verdicts: RishiScore[], name: string): RishiScore {
  const r = verdicts.find((v) => v.name === name);
  expect(r, `scorer ${name} missing from panel`).toBeDefined();
  return r!;
}

/** A fixture with NO placeholder zeros — every field observed (non-zero).
 *  Same shape as the P0-3 observed fixture (kept independent). */
const observedBody = {
  price: 1500, pe: 22, roe: 25, mktcap: 120000, ocf: 3000, rev: 10000,
  revcagr: 15, epscagr: 18, opm: 20, roce: 22, de: 0.2, fcf: 1800,
  promo: 55, ca: 5000, tl: 2000, sh: 80, np: 1400, dep: 300,
  capex: 700, bvps: 600,
};
const observedStock = (sector: string): Stock => ({
  symbol: "OBS", name: "Observed Ltd", sector, exchange: "NSE",
  ...observedBody,
});

/**
 * FD-26 (founder default, 11 Oct 2026, recorded in ROADMAP): "licence
 * pending" is the label on EVERY price-based score while the exchange-data
 * licence is unresolved — recorded as the FOUNDER'S DEFAULT, not as the
 * coder's instruction. The label is the canonical short form; the refusal
 * text beneath it stays the P0-8 disclosure.
 */
const FOUNDER_DEFAULT_LABEL = "Licence pending";

describe("FD-26 — the licence-pending label on every price-based score", () => {
  it("the canonical label constant is the founder's default wording", async () => {
    const licensing = await import("@/lib/licensing");
    expect(licensing.PRICE_SCORES_LABEL).toBe(FOUNDER_DEFAULT_LABEL);
  });

  it("every price-based refusal insight CARRIES the label (it starts with it)", () => {
    for (const r of panel(observedStock("FMCG"))) {
      if (SCORER_VERDICT_CONTRACT[r.name].priceBased) {
        expect(
          r.insight.startsWith(FOUNDER_DEFAULT_LABEL),
          `${r.name} must carry the label`,
        ).toBe(true);
      }
    }
    // the fundamental-only frameworks carry no licence label (nothing of
    // theirs is held) — positive control on the boundary
    for (const name of FOUNDER_FUNDAMENTAL_ONLY) {
      const r = byName(panel(observedStock("FMCG")), name);
      expect(r.insight.startsWith(FOUNDER_DEFAULT_LABEL)).toBe(false);
    }
  });

  it("the label pin BITES (C5 — a pre-fix refusal without the label fails)", () => {
    const preFix = "No verdict \u2014 the framework is price-based: its verdict reads price-derived inputs.";
    expect(preFix.startsWith(FOUNDER_DEFAULT_LABEL)).toBe(false);
  });

  it("the QVPS absent state and the page metadata carry the canonical label (source pins, B-18)", () => {
    const client = readFileSync("components/stock/StockPageClient.tsx", "utf8");
    expect(client).toContain("LicencePendingNote");
    const page = readFileSync("app/stock/[symbol]/page.tsx", "utf8");
    expect(page).toContain("\u2014 licence pending | Rishi Terminal");
  });
});

describe("P0-8 — the price-license gate", () => {
  it("the declared license state is the founder's order", async () => {
    const licensing = await import("@/lib/licensing");
    expect(licensing.PRICE_DATA_LICENSE.status).toBe("unresolved");
    expect(licensing.PRICE_DATA_LICENSE.authority).toMatch(FOUNDER_ORDER.split(" until ")[0]);
    expect(licensing.priceScoresPublic()).toBe(false);
  });

  it("every scorer declares its price classification, and the set matches the audit", () => {
    const names = Object.keys(SCORER_VERDICT_CONTRACT);
    expect(names).toHaveLength(20);
    const priceBased = names.filter((n) => SCORER_VERDICT_CONTRACT[n].priceBased);
    const fundamentalOnly = names.filter((n) => !SCORER_VERDICT_CONTRACT[n].priceBased);
    expect([...priceBased].sort()).toEqual([...FOUNDER_PRICE_BASED].sort());
    expect([...fundamentalOnly].sort()).toEqual([...FOUNDER_FUNDAMENTAL_ONLY].sort());
  });

  it("an observed non-lender row: every price-based verdict refuses with the license named", () => {
    for (const r of panel(observedStock("FMCG"))) {
      if (SCORER_VERDICT_CONTRACT[r.name].priceBased) {
        expect(r.score, `${r.name} must refuse while the license is unresolved`).toBeNull();
        expect(r.insight, `${r.name} must name the reason`).toMatch(/price-based/i);
        // FD-26 wording alignment: the canonical label is the founder's
        // British "licence" — the pin follows the refusal text's intent
        // (the exchange-data licence is named), spelling aligned.
        expect(r.insight).toMatch(/exchange-data licence/i);
        expect(r.insight).toMatch(/own-use only/i);
      }
    }
  });

  it("the two fundamental-only frameworks still evaluate on the same row (not a blanket refusal)", () => {
    const verdicts = panel(observedStock("FMCG"));
    for (const name of FOUNDER_FUNDAMENTAL_ONLY) {
      const r = byName(verdicts, name);
      expect(r.score, `${name} is not price-based and must still evaluate`).not.toBeNull();
      expect(Number.isFinite(r.score as number)).toBe(true);
    }
  });

  it("no consensus is reachable while unresolved: 2 valid < MIN_VALID_SCORERS 12", () => {
    const report = buildConsensus(observedStock("FMCG"), seedScoringContext(observedStock("FMCG")));
    expect(report.consensus).toBeNull();
    expect(report.scores.filter((s) => s.score !== null)).toHaveLength(2);
  });

  it("the gate is the LAST refusal: row-specific reasons keep naming themselves", () => {
    // A seed lender row still carries the SECTOR refusal (P0-3 evidence).
    const sbinGreenblatt = byName(panel(STOCKS["SBIN"]), "Greenblatt");
    expect(sbinGreenblatt.insight).toMatch(/does not apply to a Banking company/);
    // A seed non-lender row with an unknown field still carries the
    // PLACEHOLDER refusal (P0-2 evidence) — the license never preempts it.
    const rows = Object.values(STOCKS) as Stock[];
    const placeholderRow = rows.find(
      (s) => !isLenderSector(s.sector) && s.pe === null,
    );
    expect(placeholderRow, "a non-lender seed row with null pe must exist in the seed universe").toBeDefined();
    const graham = byName(panel(placeholderRow!), "Graham");
    expect(graham.insight).toMatch(/placeholder zero/);
  });

  it("flipping the ONE switch re-enables the price-based verdicts (the licensed positive control)", async () => {
    // Re-evaluate the scorer graph against a licensed licensing module:
    // reset FIRST (the scorers were already imported unresolved at the
    // top), then mock, then import fresh.
    vi.resetModules();
    vi.doMock("@/lib/licensing", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/licensing")>();
      return { ...actual, priceScoresPublic: () => true };
    });
    try {
      const { runAllScorers: freshRun, seedScoringContext: freshSeed } =
        await import("@/lib/consensus/orchestrator");
      const verdicts = freshRun(observedStock("FMCG"), freshSeed(observedStock("FMCG")));
      const finite = verdicts.filter((r) => r.score !== null).map((r) => r.name).sort();
      expect(finite).toHaveLength(20);
    } finally {
      vi.doUnmock("@/lib/licensing");
      vi.resetModules();
    }
  });
});
