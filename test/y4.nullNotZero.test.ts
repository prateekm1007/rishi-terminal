// Y4 (Round 12): null, not zero — the founder's defect 5.
//
// Live defects being fixed (reproduced 2026-10-04 on production):
//   - /stock/BANDHANBNK renders "Promoter Hold 0.0%" — a SEED placeholder
//     zero presented as a real observation;
//   - bank pages render "D/E Ratio 0.0x" and "OPM 35%" — operating-margin
//     and D/E are not meaningful for banks;
//   - /stock/SBIN shows the "India Services Export Boom" analog — an
//     archetype matcher fed seed metrics picked an IT-era story for a bank;
//   - peer tables render "300.0K Cr" for AUBANK — the seed's placeholder
//     market cap (300000) leaking into a live table as if observed.
//
// Contracts below are written to FAIL FIRST (Rule 21) against the pre-Y4
// tree: the helpers do not exist yet. Run note in PR Y4.

import { describe, it, expect } from "vitest";
import { toSourced, suppressPlaceholderZero } from "../lib/types/sourced";
import { isBankingSector } from "../lib/registry/sectors";
import { getSectorOrMetricParallel } from "../lib/wisdom/stockParallels";

describe("Y4 — suppressPlaceholderZero (seed placeholder zeros are missing data)", () => {
  it("seed promo 0 renders as missing (null value, provenance kept)", () => {
    const s = suppressPlaceholderZero(toSourced({ value: 0, source: "seed", asOf: null }, undefined), "promo");
    expect(s.value).toBeNull();
    expect(s.source).toBe("seed");
  });

  it("seed D/E 0 renders as missing (a placeholder, never a debt-free claim)", () => {
    const s = suppressPlaceholderZero(toSourced({ value: 0, source: "seed", asOf: null }, undefined), "de");
    expect(s.value).toBeNull();
  });

  it("a NON-zero seed value is untouched", () => {
    const s = suppressPlaceholderZero(toSourced({ value: 46.2, source: "seed", asOf: null }, undefined), "promo");
    expect(s.value).toBe(46.2);
  });

  it("a LIVE 0 stays 0 (G5: a live zero is an observation, not a placeholder)", () => {
    const s = suppressPlaceholderZero(toSourced({ value: 0, source: "live", asOf: "2026-10-01T09:45:00Z" }, "screener"), "promo");
    expect(s.value).toBe(0);
  });

  it("already-null stays null and other fields are untouched", () => {
    expect(suppressPlaceholderZero({ value: null, source: "seed", asOf: null }, "promo").value).toBeNull();
    const opm = suppressPlaceholderZero(toSourced({ value: 0, source: "seed", asOf: null }, undefined), "opm");
    expect(opm.value).toBe(0); // opm is NOT in the placeholder-zero set (bank pages hide it instead)
  });
});

describe("Y4 — isBankingSector (one sector-classification predicate, Rule 14)", () => {
  it("Banking (the seed's canonical bank sector) is banking", () => {
    expect(isBankingSector("Banking")).toBe(true);
  });

  it("bank-ish strings normalise to banking", () => {
    expect(isBankingSector("Banks")).toBe(true);
    expect(isBankingSector("Financials")).toBe(true);
    expect(isBankingSector("Private Bank")).toBe(true);
  });

  it("NBFC, Fintech, IT are NOT banking (they report D/E and OPM legitimately)", () => {
    expect(isBankingSector("NBFC")).toBe(false);
    expect(isBankingSector("Fintech")).toBe(false);
    expect(isBankingSector("IT")).toBe(false);
  });

  it("null/empty is not banking (fail closed)", () => {
    expect(isBankingSector(null)).toBe(false);
    expect(isBankingSector(undefined)).toBe(false);
    expect(isBankingSector("")).toBe(false);
  });
});

describe("Y4 — analog selection by sector and metrics (or none)", () => {
  it("a bank gets a BANKING era analog — never the IT services boom", () => {
    const p = getSectorOrMetricParallel("Banking");
    expect(p).not.toBeNull();
    expect(p!.era).not.toContain("Services Export Boom");
    expect(p!.era.toLowerCase()).toContain("bank");
  });

  it("IT stocks keep their own era", () => {
    const p = getSectorOrMetricParallel("IT");
    expect(p).not.toBeNull();
    expect(p!.era).toContain("IT");
  });

  it("an unlisted sector with compounder metrics falls back to the METRIC pattern", () => {
    const p = getSectorOrMetricParallel("Conglomerate", { roe: 26, de: 0.3, revcagr: 15 });
    expect(p).not.toBeNull();
    expect(p!.era).toContain("Compounder");
  });

  it("no sector match and no metric match → null (the UI shows no analog at all)", () => {
    expect(getSectorOrMetricParallel("Conglomerate", { roe: 5, de: 4, revcagr: 2 })).toBeNull();
    expect(getSectorOrMetricParallel(undefined, undefined)).toBeNull();
  });
});
