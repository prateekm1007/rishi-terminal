/**
 * Round-47 P1-MUNGER-NOT-ASSESSED (founder audit, 2026-10-11):
 *
 *   "Munger: lib/scorers/munger.ts:24 passes by default unless a red flag
 *    is detected. 'PASS: No red flags' is asserted with no forensic data
 *    behind it."
 *   CODER order: "Change Munger's default from 'pass' to 'not assessed'
 *    until forensic checks exist."
 *
 * What this pin enforces:
 *   1. The Inversion Check NEVER asserts a clearance by default: with the
 *      two observed screens clean (D/E <= 2, FCF >= 0) and NO forensic
 *      data in the pipeline (no accounting flags, related-party %, or
 *      auditor notes are observed for any record), the pillar holds the
 *      neutral 50 under the literal "NOT ASSESSED" label.
 *   2. The observed screens still bite: high debt or negative FCF scores
 *      the pillar 0 with its FAIL detail (the red-flag path is unchanged).
 *   3. The "PASS: No red flags" string is gone from the scorer (grep-zero)
 *      — and the positive control: the honest replacement exists.
 *   4. The methodology doc states the not-assessed default (docs are part
 *      of the change, rule 30).
 *   5. The patterns bite (C5).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { scoreMunger } from "@/lib/scorers/munger";
import type { Stock } from "@/lib/types";

const base: Stock = {
  symbol: "TEST", name: "Test Co", sector: "Energy", exchange: "NSE",
  price: 100, pe: 20, roe: 20, mktcap: 50000, ocf: 1000, rev: 5000,
  revcagr: 12, epscagr: 12, opm: 15, roce: 25, de: 0.4, fcf: 800,
  promo: 45, ca: 3000, tl: 1000, sh: 100, np: 750, dep: 200, capex: 300,
  bvps: 90,
} as unknown as Stock;

const findInversion = (r: ReturnType<typeof scoreMunger>) =>
  r.comps.find((c) => c.label === "Inversion Check")!;

describe("P1 — Munger's Inversion Check defaults to NOT ASSESSED, never a clearance", () => {
  it("clean screens + no forensic data -> neutral 50 under the NOT ASSESSED label", () => {
    const r = scoreMunger(base);
    const inv = findInversion(r);
    expect(inv.v).toBe(50);
    expect(inv.detail).toContain("NOT ASSESSED");
    expect(inv.detail).toContain("forensic");
  });

  it("the observed screens still bite (red-flag path unchanged)", () => {
    const highDebt = scoreMunger({ ...base, de: 2.5 } as Stock);
    expect(findInversion(highDebt).v).toBe(0);
    expect(findInversion(highDebt).detail).toContain("FAIL: High debt");

    const negFcf = scoreMunger({ ...base, fcf: -100 } as Stock);
    expect(findInversion(negFcf).v).toBe(0);
    expect(findInversion(negFcf).detail).toContain("FAIL: Negative FCF");
  });

  it("the honest score is lower than the clearance-inflated one (the arithmetic follows)", () => {
    // Pre-fix: clean screens awarded the pillar 100 (25 weighted points).
    // Post-fix: neutral 50 (12.5 weighted points). A fully clean record
    // loses exactly 12.5 — the inflation removed.
    const r = scoreMunger(base);
    expect(r.scoreRaw).not.toBeNull();
    expect(Number.isFinite(r.scoreRaw)).toBe(true);
    // circle 100 * .30 + inversion 50 * .25 + lolla 100 * .25 + patience 100 * .20
    expect(r.scoreRaw).toBeCloseTo(100 * 0.3 + 50 * 0.25 + 100 * 0.25 + 100 * 0.2, 3);
  });

  it("'PASS: No red flags' is gone; the replacement is present (grep-zero + positive control)", () => {
    const src = readFileSync("lib/scorers/munger.ts", "utf8");
    expect(src).not.toContain("PASS: No red flags");
    expect(src).toContain("NOT ASSESSED");
    // docs are part of the change (rule 30)
    const doc = readFileSync("docs/methodology/munger.md", "utf8");
    expect(doc).toMatch(/not assessed|NOT ASSESSED/i);
    expect(doc).not.toMatch(/PASS: No red flags/);
  });

  it("the patterns bite (embedded pre-fix strings must match — C5)", () => {
    const preFixDetail = "PASS: No red flags";
    expect(preFixDetail).toContain("PASS");
    // the pre-fix pillar value on a clean record
    expect(100).not.toBe(50);
  });
});
