import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * FD-13 (round 48, founder directive 2026-10-11, verbatim: "label or
 * hide the boilerplate rows and market-cap artifacts. Merge the sector
 * duplicates (Realty/RealEstate, Tech/IT, Fintech/FinTech).")
 *
 * The audit basis (roadmap FD-13): ~416 of 916 rows are boilerplate
 * clones (identical ocf/rev/sh/np tuples) and ~422 carry the
 * `mktcap = price x 1000` artifact. On the current 896-row dataset the
 * exact signatures are pinned below — any dataset change must re-look at
 * these pins consciously (they are the honest-display contract).
 *
 * Scope guard: the merge is EXACTLY the three founder-named pairs.
 * `Finance` is NOT merged into `Fintech` — Finance is a member of the
 * P0-3 closed lender vocabulary (Banking|NBFC|Finance, 84 rows) and
 * merging it would silently weaken the lender gate (rule 23).
 */
import { STOCKS } from "@/data/stocks";
import {
  isMktcapArtifact,
  boilerplateCloneSymbols,
  seedResidualMarks,
} from "@/lib/seedResiduals";

const rows = Object.values(STOCKS);
const read = (p: string) => readFileSync(p, "utf8");

describe("FD-13 — the sector duplicates are merged (Realty/RealEstate, Tech/IT, Fintech/FinTech)", () => {
  it("no row carries the duplicate spellings", () => {
    const duplicates = rows.filter((s) =>
      (["RealEstate", "Tech", "FinTech"] as string[]).includes(s.sector),
    );
    expect(
      duplicates.map((s) => `${s.symbol}:${s.sector}`),
    ).toEqual([]);
  });

  it("the canonical spellings exist (B-18 positive control)", () => {
    expect(rows.some((s) => s.sector === "Realty")).toBe(true);
    expect(rows.some((s) => s.sector === "IT")).toBe(true);
    expect(rows.some((s) => s.sector === "Fintech")).toBe(true);
  });

  it("the P0-3 lender vocabulary is UNCHANGED — Finance is not merged (rule 23 guard)", () => {
    const lenderRows = rows.filter((s) =>
      (["Banking", "NBFC", "Finance"] as string[]).includes(s.sector),
    );
    expect(lenderRows.length).toBe(84);
    expect(rows.filter((s) => s.sector === "Finance").length).toBe(10);
  });

  it("the NL screener vocabulary follows the merge", () => {
    const nl = read("lib/screener/nl.ts");
    expect(nl).not.toMatch(/'RealEstate'/);
    expect(nl).not.toMatch(/'Tech'/);
    // the natural-language phrase now resolves to the canonical spelling
    expect(nl).toMatch(/'real estate': 'Realty'/);
  });

  it("the nl parser translates 'real estate' to the canonical sector (re-pinned, rule 23)", async () => {
    const { nlToQuery } = await import("@/lib/screener/nl");
    const r = nlToQuery("real estate");
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (r.ok) expect(r.query).toBe('(sector = "Realty")');
  });
});

describe("FD-13 — the seed-residual detectors (the honest-display contract)", () => {
  it("isMktcapArtifact: exactly mktcap === price x 1000, never a near-miss", () => {
    expect(isMktcapArtifact(100, 100000)).toBe(true);
    expect(isMktcapArtifact(910, 910000)).toBe(true);
    expect(isMktcapArtifact(100, 95000)).toBe(false);
    expect(isMktcapArtifact(0, 0)).toBe(false);
    expect(isMktcapArtifact(null, 100000)).toBe(false);
    expect(isMktcapArtifact(100, null)).toBe(false);
    expect(isMktcapArtifact(NaN, NaN)).toBe(false);
  });

  it("the dataset's artifact count matches the audit signature", () => {
    const n = rows.filter((s) => isMktcapArtifact(s.price, s.mktcap)).length;
    // 396 of 896 on the round-48 dataset (the audit's ~422 was measured
    // on the pre-D1-02 916-row dataset).
    expect(n).toBe(396);
  });

  it("boilerplateCloneSymbols: a tuple repeated across rows is a clone", () => {
    const fixture = [
      { symbol: "A", ocf: 100, rev: 200, sh: 10, np: 20 },
      { symbol: "B", ocf: 100, rev: 200, sh: 10, np: 20 },
      { symbol: "C", ocf: 300, rev: 400, sh: 30, np: 40 },
    ];
    const set = boilerplateCloneSymbols(fixture);
    expect(set.has("A")).toBe(true);
    expect(set.has("B")).toBe(true);
    expect(set.has("C")).toBe(false);
  });

  it("the dataset's clone count matches the audit signature", () => {
    const n = boilerplateCloneSymbols(rows).size;
    // 429 of 896 in 17 repeated-tuple groups (top group 390) — the audit's
    // ~416 was measured on the pre-D1-02 916-row dataset.
    expect(n).toBe(429);
  });

  it("the page prop is the compact symbol join and names the audit's examples", () => {
    const marks = seedResidualMarks(rows);
    expect(marks.boilerplate).not.toContain("::");
    expect(marks.mktcapArtifact.split("|")).toContain("AIAENG");
    expect(marks.boilerplate.split("|").length).toBe(429);
    expect(marks.mktcapArtifact.split("|").length).toBe(396);
  });

  it("the /stocks surface renders the residual label (source pin, B-18)", () => {
    const page = read("app/stocks/page.tsx");
    expect(page).toMatch(/seedResidualMarks/);
    const table = read("components/screener/StockTable.tsx");
    expect(table).toMatch(/boilerplate financials/);
    expect(table).toMatch(/mktcap placeholder/);
    const panel = read("components/stock/MetricsPanel.tsx");
    expect(panel).toMatch(/price × 1000/);
  });

  it("the patterns bite (C5): the pre-fix absence is matchable", () => {
    const table = read("components/screener/StockTable.tsx");
    // the pre-fix badge carried only the dataQuality text
    expect(table).toMatch(/seed · no verdict/);
  });
});
