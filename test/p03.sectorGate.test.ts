/**
 * Round-46 P0-3 (founder audit 2026-10-11): "banks must not be scored on
 * D/E/OPM/FCF/P-NCAV/current-ratio; Greenblatt must refuse banks."
 *
 * The defect: lender rows were scored on corporate ratios their balance
 * sheets do not have. SBIN (Banking) earned Greenblatt 66 on an
 * earnings-yield test that presumes a non-lender, Buffett/Lynch/Basant
 * scored its OPM and FCF placeholders, and Graham's P/NCAV + current
 * ratio produced 69.62x nonsense on the loan book. The P0-2 null class
 * only caught the rows the data surgery had nulled (Banking de 22 /
 * Banking opm 4) — 82 of 84 lender rows still carry non-null
 * inapplicable fields that scored as facts.
 *
 * The fix: THE SECTOR GATE — one closed vocabulary (Banking | NBFC |
 * Finance), one closed inapplicable-field list (de | opm | fcf | ca |
 * tl — the fields behind D/E, OPM, FCF, P/NCAV and the current ratio),
 * consumed by every scorer BEFORE the P0-2 placeholder guard.
 * Inapplicability is structural (the metric does not exist for the
 * sector, on any data quality), which is a stronger refusal than
 * "unknown". Greenblatt declares lenderPolicy "refuse": the Magic
 * Formula does not apply to lenders even though np/mktcap computes.
 *
 * Rule 21: watched FAILING before the fix — SBIN's Greenblatt verdict
 * was 66, the observed-bank fixture scored on 7 of 20 frameworks, and
 * no refusal naming sector inapplicability existed anywhere.
 *
 * The founder's words are declared HERE independently of the
 * implementation (the drift pin) — the implementation's exported
 * vocabulary must match them exactly.
 */
import { vi, describe, it, expect } from "vitest";

import {
  SCORER_VERDICT_CONTRACT,
} from "@/lib/scorers/verdictGuards";
import { runAllScorers, seedScoringContext, TOTAL_RISHIS } from "@/lib/consensus/orchestrator";
import { buildConsensus } from "@/lib/consensus/engine";
import { STOCKS } from "@/data/stocks";
import type { Stock, RishiScore } from "@/lib/types";

// Round-47 P0-8: this file pins the LICENSED state — the scorer
// arithmetic beneath the price-license gate. The publication hold while
// the exchange-data license is unresolved is pinned by
// test/licenseGate.test.ts; the seed-world refusal-reason pins below
// are unaffected (the sector and placeholder guards precede the license
// gate inside every scorer).
// (vi added to the vitest import for the mock.)
vi.mock("@/lib/licensing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/licensing")>();
  // The arithmetic world: the exchange-data license is satisfied.
  return { ...actual, priceScoresPublic: () => true };
});


/** The founder's P0-3 words, independent of the implementation. */
const FOUNDER_LENDER_SECTORS = ["Banking", "NBFC", "Finance"];
const FOUNDER_INAPPLICABLE = ["de", "opm", "fcf", "ca", "tl"];
/** Frameworks whose contract needs NO lender-inapplicable field. */
const FOUNDER_SURVIVORS = ["Kacholia", "Philip Fisher", "Porinju", "John Templeton"];

const isLender = (s: Stock) => FOUNDER_LENDER_SECTORS.includes(s.sector);
const requiresInapplicable = (name: string) =>
  SCORER_VERDICT_CONTRACT[name].required.some((f) => FOUNDER_INAPPLICABLE.includes(f));

const SBIN = STOCKS["SBIN"] as Stock;
const AXISBANK = STOCKS["AXISBANK"] as Stock;

/** All scorers, each run with the seed-zero context (the registry default). */
const panel = (s: Stock, ctx = seedScoringContext(s)): RishiScore[] =>
  runAllScorers(s, ctx);

const byName = (scores: RishiScore[], name: string) => {
  const r = scores.find((s) => s.name === name);
  expect(r, `scorer ${name} missing from panel`).toBeDefined();
  return r!;
};

/** A fixture with NO placeholder zeros — every field observed (non-zero). */
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

describe("P0-3 — the sector gate", () => {
  it("the implementation declares exactly the founder's vocabulary", async () => {
    const gate = await import("@/lib/scorers/sectorGate");
    expect([...gate.LENDER_SECTORS].sort()).toEqual([...FOUNDER_LENDER_SECTORS].sort());
    expect([...gate.LENDER_INAPPLICABLE_FIELDS].sort()).toEqual([...FOUNDER_INAPPLICABLE].sort());
    expect(gate.isLenderSector("Banking")).toBe(true);
    expect(gate.isLenderSector("NBFC")).toBe(true);
    expect(gate.isLenderSector("Finance")).toBe(true);
    expect(gate.isLenderSector("FMCG")).toBe(false);
    expect(gate.isLenderSector("Fintech")).toBe(false);
    // A field-gated refusal is the exact intersection — never the whole list.
    expect(gate.inapplicableAmong("Banking", ["pe", "de", "roce"])).toEqual(["de"]);
    expect(gate.inapplicableAmong("FMCG", ["de", "opm"])).toEqual([]);
  });

  it("the founder's finding: SBIN's Greenblatt verdict is null, not 66", () => {
    const g = byName(panel(SBIN), "Greenblatt");
    expect(g.score).toBeNull();
    expect(g.insight).toMatch(/does not apply to a Banking company/);
    expect(g.insight).not.toMatch(/\b66\b/);
  });

  it("every lender row: no scorer requiring an inapplicable field returns a number", () => {
    const rows = (Object.values(STOCKS) as Stock[]).filter(isLender);
    // DELIV-5 (founder order 2026-10-12): the Finance-10 dataset rows merged
    // into Fintech, so the lender census is Banking 36 + NBFC 38 = 74 (was 84).
    // The LENDER_SECTORS vocabulary itself is UNCHANGED (still closed on
    // Banking | NBFC | Finance) — the data moved, not the gate.
    expect(rows.length).toBe(74); // Banking 36 + NBFC 38 (census)
    const offenders: string[] = [];
    for (const row of rows) {
      for (const r of panel(row)) {
        const gated = r.name === "Greenblatt" || requiresInapplicable(r.name);
        if (gated && r.score !== null) offenders.push(`${row.symbol}/${r.name}=${r.score}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every lender row: Greenblatt refuses with the sector named", () => {
    const rows = (Object.values(STOCKS) as Stock[]).filter(isLender);
    for (const row of rows) {
      const g = byName(panel(row), "Greenblatt");
      expect(g.score, `${row.symbol} Greenblatt must refuse`).toBeNull();
      expect(g.insight).toMatch(new RegExp(`does not apply to a ${row.sector} company`));
    }
  });

  it("a fully-observed bank is scored ONLY by the four survivor frameworks", () => {
    const bank = observedStock("Banking");
    const finite = panel(bank).filter((r) => r.score !== null).map((r) => r.name).sort();
    expect(finite).toEqual([...FOUNDER_SURVIVORS].sort());
  });

  it("the SAME observed body as a non-lender scores on all 20 — the flip is the sector alone", () => {
    const fmcg = panel(observedStock("FMCG"));
    expect(fmcg.filter((r) => r.score !== null)).toHaveLength(TOTAL_RISHIS);
    // Differential: flipping ONLY the sector to a lender refuses the gated
    // frameworks. The three sector-blind survivors keep their exact
    // scores; John Templeton also carries a PRE-EXISTING sector component
    // of its own (the maximum-pessimism quality leg scores FMCG/pharma
    // 100, everything else 70 — documented in its scorer), so for it the
    // pin is equality across Banking/NBFC/Energy — identical from the
    // gate's point of view, proving the gate never touched its arithmetic.
    for (const name of ["Kacholia", "Philip Fisher", "Porinju"]) {
      const a = byName(fmcg, name);
      const b = byName(panel(observedStock("Banking")), name);
      expect(b.score, `${name} must be untouched by the gate`).toBe(a.score);
    }
    const tScores = ["Banking", "NBFC", "Energy"].map((sector) =>
      byName(panel(observedStock(sector)), "John Templeton").score,
    );
    expect(new Set(tScores).size).toBe(1);
    expect(tScores[0]).not.toBeNull();
    for (const r of panel(observedStock("Banking"))) {
      if (!FOUNDER_SURVIVORS.includes(r.name)) {
        expect(r.score, `${r.name} must refuse a bank`).toBeNull();
      }
    }
  });

  it("survivor frameworks genuinely need no inapplicable field, and vice versa", () => {
    // The survivor set is exactly the scorers whose contract avoids the
    // inapplicable list — no scorer is mis-classified by the gate.
    const derived = Object.entries(SCORER_VERDICT_CONTRACT)
      .filter(([, c]) => !c.required.some((f) => FOUNDER_INAPPLICABLE.includes(f)))
      .map(([n]) => n)
      .filter((n) => n !== "Greenblatt") // lenderPolicy "refuse" regardless
      .sort();
    expect(derived).toEqual([...FOUNDER_SURVIVORS].sort());
  });

  it("refusals keep the attribution shell and never fabricate comps", () => {
    for (const r of panel(SBIN)) {
      const c = SCORER_VERDICT_CONTRACT[r.name];
      if (r.score !== null) continue;
      expect(r.name).toBe(c.name);
      expect(r.full).toBe(c.full);
      expect(r.label).toBe(c.label);
      expect(r.origin).toBe(c.origin);
      expect(r.comps).toEqual([]);
    }
  });

  it("inapplicability refusals name the sector and the ratio vocabulary, never advice wording", () => {
    const b = byName(panel(AXISBANK), "Buffett"); // opm 44 is non-null: only the gate refuses
    expect(b.score).toBeNull();
    expect(b.insight).toMatch(/not applicable to a Banking company/);
    expect(b.insight).toMatch(/\bOPM\b/);
    expect(b.insight).toMatch(/fields opm/);
    for (const r of panel(AXISBANK)) {
      expect(r.insight).not.toMatch(/STRONG BUY|\bLong\b|\bShort\b|REDUCE|Avoid/);
    }
  });

  it("the gate is a no-op off the lender vocabulary (positive control)", () => {
    // Every non-lender seed row produces the IDENTICAL panel as before the
    // gate: the sector gate never refuses a non-lender. Prove it on the
    // observed fixture across several non-lender sectors.
    for (const sector of ["FMCG", "Energy", "IT", "Pharma", "Fintech"]) {
      const scores = panel(observedStock(sector));
      for (const r of scores) {
        expect(r.score, `${r.name} must not refuse ${sector}`).not.toBeNull();
      }
    }
  });

  it("consensus consequence: a fully-observed bank row still yields no verdict", () => {
    // 4 finite of 20 is below MIN_VALID_SCORERS (12) — the honest
    // outcome is no consensus verdict for lenders until a bank-capable
    // panel exists (fail closed, C2).
    const report = buildConsensus(observedStock("Banking"));
    expect(report.consensus).toBeNull();
    expect(report.category).toBe("Insufficient Data");
    const finiteNames = report.scores.filter((s) => s.score !== null).map((s) => s.name).sort();
    expect(finiteNames).toEqual([...FOUNDER_SURVIVORS].sort());
    // The same body as a non-lender still forms a consensus.
    const nonLender = buildConsensus(observedStock("FMCG"));
    expect(nonLender.consensus).not.toBeNull();
  });
});
