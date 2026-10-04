// X3-07 (Round 14) — the XIRR acceptance: "XIRR matches a reference
// implementation to 1e-6 on 10 fixtures".
//
// The reference is INDEPENDENT by construction: the production solver is
// a bracketing bisection; the reference here is a Newton-Raphson with an
// analytic derivative and a fixed 60-iteration cap. Two genuinely
// different root-finders agreeing to 1e-6 across every fixture is the
// strongest statement available without trusting either one.
//
// Two fixtures additionally have CLOSED-FORM answers (single investment,
// one-year doubling) — the reference of record for those is arithmetic,
// not another solver.
//
// Rule 24 bite: on the pre-X3-07 tree this file fails at import (no
// lib/portfolio/xirr module); recorded in the PR.

import { describe, expect, it } from "vitest";
import { xirr } from "../lib/portfolio/xirr";

const DAY = 1000 * 60 * 60 * 24;
const d = (offsetDays: number): Date => new Date(Date.UTC(2024, 0, 1) + offsetDays * DAY);

/** Independent reference: Newton-Raphson on NPV(r) with the ANALYTIC
 *  derivative dNPV/dr = Σ -t·CF_t·(1+r)^(t-1) (t in years). */
function referenceXirr(flows: { date: Date; amount: number }[]): number | null {
  const base = flows[0].date.getTime();
  const yrs = flows.map(f => (f.date.getTime() - base) / (1000 * 60 * 60 * 24 * 365));
  const npv = (r: number) => flows.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, yrs[i]), 0);
  const dnpv = (r: number) =>
    flows.reduce((s, f, i) => {
      const t = yrs[i];
      return s + (-t * f.amount) / Math.pow(1 + r, t + 1);
    }, 0);

  let r = 0.1;
  for (let i = 0; i < 60; i++) {
    const v = npv(r);
    if (Math.abs(v) < 1e-12) return r;
    const dv = dnpv(r);
    if (!Number.isFinite(dv) || dv === 0) return null;
    const next = r - v / dv;
    if (next <= -1) return null;
    if (Math.abs(next - r) < 1e-15) return next;
    r = next;
  }
  return Math.abs(npv(r)) < 1e-9 ? r : null;
}

interface Fixture {
  name: string;
  flows: Array<[number, number]>; // [dayOffset, amount]
  /** closed-form expectation, when one exists (otherwise Newton is the reference) */
  analytic?: number;
}

const FIXTURES: Fixture[] = [
  {
    name: "single investment, exactly +10% after one year (analytic)",
    flows: [[0, -1000], [365, 1100]],
    analytic: 0.10,
  },
  {
    name: "single investment, doubled in two years (analytic: sqrt(2)-1)",
    flows: [[0, -5000], [730, 10000]],
    analytic: Math.SQRT2 - 1,
  },
  {
    name: "classic SIP: three yearly buys, one redemption",
    flows: [[0, -10000], [365, -10000], [730, -10000], [1095, 33100]],
  },
  {
    name: "lumpy buys and a partial sell",
    flows: [[0, -50000], [200, -25000], [400, 30000], [900, 60000]],
  },
  {
    name: "high-return short horizon (annualised far above 100%)",
    flows: [[0, -10000], [120, 16000]],
  },
  {
    name: "low single-digit return over five years",
    flows: [[0, -100000], [1825, 127628]],
  },
  {
    name: "loss: money out below money in",
    flows: [[0, -100000], [730, 95000]],
  },
  {
    name: "many small flows (monthly SIP, 24 instalments, terminal value)",
    flows: Array.from({ length: 24 }, (_, i) => [i * 30, -5000] as [number, number]).concat([[730, 132000]]),
  },
  {
    name: "sell-first shape (short position — sign-correct, still solvable)",
    flows: [[0, 20000], [365, -23000]],
  },
  {
    name: "mixed buys, sell, and final valuation on the same day as a buy",
    flows: [[0, -30000], [150, 12000], [150, -45000], [600, 68000]],
  },
];

describe("X3-07 — XIRR matches the reference to 1e-6 on 10 fixtures", () => {
  FIXTURES.forEach((fixture, idx) => {
    it(`fixture ${idx + 1}/10: ${fixture.name}`, () => {
      const flows = fixture.flows.map(([offset, amount]) => ({ date: d(offset), amount }));
      const actual = xirr(flows);
      expect(actual).not.toBeNull();

      if (fixture.analytic !== undefined) {
        expect(Math.abs(actual! - fixture.analytic)).toBeLessThan(1e-6);
      }
      const reference = referenceXirr(flows);
      expect(reference).not.toBeNull();
      expect(Math.abs(actual! - reference!)).toBeLessThan(1e-6);
    });
  });

  it("null, never a guess: degenerate inputs (rule 16)", () => {
    expect(xirr([])).toBeNull();
    expect(xirr([{ date: d(0), amount: -100 }])).toBeNull();
    // all-same-sign flows: no rate exists
    expect(xirr([{ date: d(0), amount: -100 }, { date: d(365), amount: -50 }])).toBeNull();
    expect(xirr([{ date: d(0), amount: 100 }, { date: d(365), amount: 50 }])).toBeNull();
    // non-finite garbage
    expect(xirr([{ date: new Date(NaN), amount: -100 }, { date: d(365), amount: 120 }])).toBeNull();
    expect(xirr([{ date: d(0), amount: Number.NaN }, { date: d(365), amount: 120 }])).toBeNull();
  });

  it("the lab's % adapter keeps working through the same derivation (rule 14)", async () => {
    const { calcXIRR } = await import("../lib/portfolio/xirr");
    const rate = xirr([{ date: d(0), amount: -1000 }, { date: d(365), amount: 1100 }]);
    expect(calcXIRR([{ date: d(0), amount: -1000 }, { date: d(365), amount: 1100 }])).toBeCloseTo(rate! * 100, 10);
  });
});
