// lib/portfolio/xirr.ts
// X3-07 (Round 14): the ONE XIRR implementation (rule 14) — extracted from
// components/lab/helpers.ts's calcXIRR (bisection) so the import pipeline,
// the API and the lab all share a single derivation, and so it can be
// pinned against an INDEPENDENT reference solver to 1e-6 on 10 fixtures
// (test/portfolio.xirr.test.ts).
//
// Conventions (documented, pinned):
//   - cashflows: { date, amount }; NEGATIVE amounts are money IN, positive
//     amounts are money OUT (valuation/redemption) — the Excel convention;
//   - day count: actual days / 365 (Excel XIRR);
//   - returns the annualised rate as a DECIMAL (0.1 = 10%), or null when
//     no rate exists (fewer than 2 flows, all-same-sign flows, or
//     non-finite inputs — rule 16: null, not a guess).

export interface CashFlow {
  date: Date;
  amount: number;
}

const DAY_MS = 1000 * 60 * 60 * 24 * 365; // 365-day year (Excel XIRR)
const BRACKET_LO = -0.999999;
const BRACKET_HI = 10;

/** NPV of the flows at `rate`, years measured from the FIRST flow. */
function npvAt(cashflows: CashFlow[], baseMs: number, rate: number): number {
  let npv = 0;
  for (const cf of cashflows) {
    const years = (cf.date.getTime() - baseMs) / DAY_MS;
    // (1+rate)^years with rate > -1 — the bracket keeps 1+rate positive
    npv += cf.amount / Math.pow(1 + rate, years);
  }
  return npv;
}

/** Validate + normalise: finite dates and amounts, at least one negative
 *  (money in) and one positive (money out) — otherwise no XIRR exists. */
function normalise(cashflows: CashFlow[]): { flows: CashFlow[]; baseMs: number } | null {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return null;
  const base = cashflows[0]?.date;
  if (!(base instanceof Date) || !Number.isFinite(base.getTime())) return null;
  const flows: CashFlow[] = [];
  let hasNegative = false;
  let hasPositive = false;
  for (const cf of cashflows) {
    if (!(cf?.date instanceof Date) || !Number.isFinite(cf.date.getTime())) return null;
    if (!Number.isFinite(cf.amount)) return null;
    if (cf.amount === 0) continue;
    if (cf.amount < 0) hasNegative = true;
    else hasPositive = true;
    flows.push(cf);
  }
  if (!hasNegative || !hasPositive || flows.length < 2) return null;
  return { flows, baseMs: base.getTime() };
}

/** THE XIRR: bisection over a bracket that always contains the Excel
 *  answer for sign-correct flows. 100 iterations drive the bracket width
 *  (~11) below double precision — the fixture test pins agreement with an
 *  independent Newton solver to 1e-6. */
export function xirr(cashflows: CashFlow[]): number | null {
  const norm = normalise(cashflows);
  if (!norm) return null;
  const { flows, baseMs } = norm;

  let lo = BRACKET_LO;
  let hi = BRACKET_HI;
  let vLo = npvAt(flows, baseMs, lo);
  let vHi = npvAt(flows, baseMs, hi);
  if (!Number.isFinite(vLo) || !Number.isFinite(vHi) || vLo * vHi > 0) return null;

  let mid = 0;
  for (let i = 0; i < 100; i++) {
    mid = (lo + hi) / 2;
    const v = npvAt(flows, baseMs, mid);
    if (v === 0) break;
    if (v * vLo < 0) {
      hi = mid;
      vHi = v;
    } else {
      lo = mid;
      vLo = v;
    }
  }
  return mid;
}

/** % convenience wrapper — the shape the lab's OverviewTab already renders.
 *  Kept as the single adapter so the lab keeps working unchanged. */
export function calcXIRR(cashflows: CashFlow[]): number | null {
  const rate = xirr(cashflows);
  return rate === null ? null : rate * 100;
}
