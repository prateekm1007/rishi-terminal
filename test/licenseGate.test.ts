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
 * NSE-PERM (13 Oct 2026): the written answer ARRIVED — the founder
 * recorded it with the permission letter in hand ("now that we have
 * permission"): NSE permission letter Ref. No. NSE/MD/DATA/PERM/2026/0847,
 * dated 13 October 2026 (R. K. Sharma, Head — Market Data & Information
 * Products), granting access, use, display and commercial exploitation of
 * the nseindia.com website quote API data INCLUDING derived figures,
 * rankings and analytics (§3: top gainers, top losers, most active,
 * percentage-change rankings — expressly authorised), for an initial
 * three-year term (§5), with the §6 conditions (no bulk raw-feed resale,
 * no authorised-vendor representation, SEBI compliance) and the §4
 * attribution duty ("Source: NSE" wherever the data or a derived figure
 * appears). lib/licensing.ts flips to "licensed" in THIS PR — the only
 * mechanism the module's own contract allows.
 *
 * The gate's fail-closed discipline is NOT retired: the refusal state is
 * still pinned here under an explicit unlicensed mock (the module must
 * keep biting — §5 lets the permission terminate on 30 days' notice, and
 * a reverted state must refuse again), while the REAL module's licensed
 * state is pinned against the letter's facts.
 *
 * Rule 21: watched FAILING — the licensed-state pins and the no-mock
 * positive control below failed against the pre-flip (unresolved) tree;
 * raw outputs ride the PR.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

import {
  SCORER_VERDICT_CONTRACT,
} from "@/lib/scorers/verdictGuards";
import { runAllScorers, seedScoringContext } from "@/lib/consensus/orchestrator";
import { getStockScore } from "@/lib/scoring/index";
import { STOCKS } from "@/data/stocks";
import { isLenderSector } from "@/lib/scorers/sectorGate";
import type { Stock, RishiScore } from "@/lib/types";

/** The letter's ref — the written answer the module now rests on. */
const LETTER_REF = "NSE/MD/DATA/PERM/2026/0847";
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
 * pending" is the label on EVERY price-based score WHILE the exchange-data
 * licence is unresolved — recorded as the FOUNDER'S DEFAULT, not as the
 * coder's instruction. The label is the canonical short form of the
 * UNLICENSED state's refusal; the full P0-8 disclosure text stays beneath
 * it. With the letter recorded the label renders nowhere — but the label
 * and the refusal that carries it stay pinned (the fail-closed state must
 * keep working when the permission terminates, §5).
 */
const FOUNDER_DEFAULT_LABEL = "Licence pending";

/** Mock the module to its UNLICENSED publication state (the fail-closed
 *  negative control — the real module is licensed; these pins exist so
 *  the gate still bites if the state ever reverts). The callback does its
 *  OWN fresh imports inside the mock scope. */
async function withUnlicensed(run: () => void | Promise<void>) {
  vi.resetModules();
  vi.doMock("@/lib/licensing", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/licensing")>();
    return { ...actual, priceScoresPublic: () => false };
  });
  try {
    await run();
  } finally {
    vi.doUnmock("@/lib/licensing");
    vi.resetModules();
  }
}

describe("FD-26 — the licence-pending label on every price-based score", () => {
  it("the canonical label constant is the founder's default wording", async () => {
    const licensing = await import("@/lib/licensing");
    expect(licensing.PRICE_SCORES_LABEL).toBe(FOUNDER_DEFAULT_LABEL);
  });

  it("every price-based refusal insight CARRIES the label while UNLICENSED (the state that renders it)", async () => {
    await withUnlicensed(async () => {
      const fresh = await import("@/lib/consensus/orchestrator");
      const verdicts = fresh.runAllScorers(observedStock("FMCG"), fresh.seedScoringContext(observedStock("FMCG")));
      for (const r of verdicts) {
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
        const r = verdicts.find((v) => v.name === name);
        expect(r, `scorer ${name} missing`).toBeDefined();
        expect(r!.insight.startsWith(FOUNDER_DEFAULT_LABEL)).toBe(false);
      }
    });
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

describe("P0-8 — the price-license gate, the REAL (licensed) state", () => {
  it("the declared license state is the NSE written answer recorded on the founder's order", async () => {
    const licensing = await import("@/lib/licensing");
    expect(licensing.PRICE_DATA_LICENSE.status).toBe("licensed");
    expect(licensing.PRICE_DATA_LICENSE.asOf).toBe("2026-10-13");
    // the authority names THE INSTRUMENT, not a mood (rule 1: no
    // unattributed state)
    expect(licensing.PRICE_DATA_LICENSE.authority).toContain(LETTER_REF);
    expect(licensing.PRICE_DATA_LICENSE.authority).toContain("13 October 2026");
    expect(licensing.PRICE_DATA_LICENSE.authority).toContain("R. K. Sharma");
    expect(licensing.priceScoresPublic()).toBe(true);
  });

  it("the recorded basis carries the letter's auditable scope, term, attribution and conditions", async () => {
    const licensing = await import("@/lib/licensing");
    const basis = licensing.PRICE_DATA_LICENSE.basis;
    // §1 scope: the quote API domain
    expect(basis).toContain("www.nseindia.com/api/");
    // §2: display + commercial use
    expect(basis).toContain("commercial");
    // §3: derived figures expressly authorised (what this flip enables)
    expect(basis).toContain("top gainers");
    expect(basis).toContain("rankings");
    // §4: the attribution duty
    expect(basis).toContain("Source: NSE");
    // §5: the term
    expect(basis).toContain("3 years");
    // §6: the conditions the product must keep honouring
    expect(basis).toContain("no bulk raw-feed resale");
    expect(basis).toContain("no authorised-data-vendor");
    expect(basis).toContain("SEBI");
  });

  it("every scorer declares its price classification, and the set matches the audit", () => {
    const names = Object.keys(SCORER_VERDICT_CONTRACT);
    expect(names).toHaveLength(20);
    const priceBased = names.filter((n) => SCORER_VERDICT_CONTRACT[n].priceBased);
    const fundamentalOnly = names.filter((n) => !SCORER_VERDICT_CONTRACT[n].priceBased);
    expect([...priceBased].sort()).toEqual([...FOUNDER_PRICE_BASED].sort());
    expect([...fundamentalOnly].sort()).toEqual([...FOUNDER_FUNDAMENTAL_ONLY].sort());
  });

  it("the REAL licensed module re-enables every price-based verdict on an observed row (no mock — the flip's designed consequence)", async () => {
    vi.resetModules();
    try {
      const fresh = await import("@/lib/consensus/orchestrator");
      const verdicts = fresh.runAllScorers(observedStock("FMCG"), fresh.seedScoringContext(observedStock("FMCG")));
      const finite = verdicts.filter((r) => r.score !== null).map((r) => r.name).sort();
      expect(finite).toHaveLength(20);
      // and the consensus the gate withheld is now reachable on an
      // observed row (MIN_VALID_SCORERS 12 ≤ 20 valid)
      const { buildConsensus: freshBuild } = await import("@/lib/consensus/engine");
      const report = freshBuild(observedStock("FMCG"), fresh.seedScoringContext(observedStock("FMCG")));
      expect(report.consensus).not.toBeNull();
    } finally {
      vi.resetModules();
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

  it("P0-1 still holds under the licence: a SEED row's consensus stays null (the data-quality gate is independent of the license)", () => {
    // The licence flip enables price-based SCORING; it does not fabricate
    // verdicts on seed data — getStockScore nulls every seed consensus via
    // verdictsAllowed(dq), so the dashboard's awaiting state keeps its
    // honest empties. The seed universe's rows are seed-quality records.
    const rows = Object.values(STOCKS) as Stock[];
    const anySeedConsensus = rows.some((s) => getStockScore(s).consensus !== null);
    expect(anySeedConsensus, "a seed row must not grow a consensus from the licence flip").toBe(false);
  });
});

describe("P0-8 — the UNLICENSED negative control (the fail-closed state must keep biting, §5 termination)", () => {
  it("under an unlicensed module every price-based verdict refuses with the license named", async () => {
    await withUnlicensed(async () => {
      const fresh = await import("@/lib/consensus/orchestrator");
      for (const r of fresh.runAllScorers(observedStock("FMCG"), fresh.seedScoringContext(observedStock("FMCG")))) {
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
  });

  it("no consensus is reachable while unlicensed: 2 valid < MIN_VALID_SCORERS 12", async () => {
    await withUnlicensed(async () => {
      const { buildConsensus: freshBuild } = await import("@/lib/consensus/engine");
      const { seedScoringContext: freshSeed } = await import("@/lib/consensus/orchestrator");
      const report = freshBuild(observedStock("FMCG"), freshSeed(observedStock("FMCG")));
      expect(report.consensus).toBeNull();
      expect(report.scores.filter((s) => s.score !== null)).toHaveLength(2);
    });
  });
});
