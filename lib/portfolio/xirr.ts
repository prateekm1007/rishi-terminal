/**
 * X3-07 (Round 14 A6): XIRR — extended internal rate of return.
 *
 * Solves sum_i cf_i / (1+r)^((t_i - t_0)/365) = 0 for dated cashflows
 * (investments negative, redemptions/value positive), the same equation
 * Excel's XIRR implements (ACT/365F day count from the earliest flow).
 *
 * Algorithm: Newton-Raphson from a sensible start (handles the common
 * convexity of a single-sign-change flow set quickly), with a bisection
 * fallback that brackets the root in [-0.999999, 10] — the fallback
 * makes the function TOTAL: it always returns a root when one exists in
 * range, or null when the flows cannot produce one (e.g. all-positive
 * flows). No NaN, no Infinity, no silent 0 (Constitution 16).
 *
 * Precision: converges to |f(r)| < 1e-9 or |dr| < 1e-12; the acceptance
 * test compares against an independent dense-bisection reference at
 * 1e-6 across 10 fixtures.
 */

export interface DatedFlow {
  /** Cashflow amount: negative = money in (bought), positive = money out (sold / current value). */
  amount: number;
  /** Epoch milliseconds of the flow date. */
  at: number;
}

const DAY_MS = 86_400_000;
const MIN_RATE = -0.999_999;
const MAX_RATE = 10;

/** The XIRR equation's present value at rate r. */
function pv(flows: DatedFlow[], r: number, t0: number): number {
  let sum = 0;
  for (const f of flows) {
    const years = (f.at - t0) / (DAY_MS * 365);
    sum += f.amount / Math.pow(1 + r, years);
  }
  return sum;
}

/**
 * Compute XIRR. Returns null when no root exists in [-0.999999, 10]
 * (the flow set never balances), or when the input is degenerate
 * (fewer than 2 flows, no negative flow, no positive flow, non-finite
 * amounts, or dates that do not span any time).
 */
export function xirr(flows: DatedFlow[]): number | null {
  if (!Array.isArray(flows) || flows.length < 2) return null;

  let hasNegative = false;
  let hasPositive = false;
  for (const f of flows) {
    if (!Number.isFinite(f.amount) || !Number.isFinite(f.at)) return null;
    if (f.amount < 0) hasNegative = true;
    if (f.amount > 0) hasPositive = true;
  }
  if (!hasNegative || !hasPositive) return null;

  const t0 = Math.min(...flows.map((f) => f.at));
  const tMax = Math.max(...flows.map((f) => f.at));
  if (tMax <= t0) return null;

  // --- Newton-Raphson (fast path) ---
  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = pv(flows, r, t0);
    if (!Number.isFinite(f)) break;
    if (Math.abs(f) < 1e-9) return clampResult(r);

    // derivative of pv wrt r
    let df = 0;
    for (const fl of flows) {
      const years = (fl.at - t0) / (DAY_MS * 365);
      df += (-years * fl.amount) / Math.pow(1 + r, years + 1);
    }
    if (!Number.isFinite(df) || Math.abs(df) < 1e-14) break;

    const next = r - f / df;
    if (!Number.isFinite(next)) break;
    if (next <= MIN_RATE || next > MAX_RATE) break; // left the bracket — fall back
    if (Math.abs(next - r) < 1e-12) return clampResult(next);
    r = next;
  }

  // --- Bisection fallback (total path) ---
  let lo = MIN_RATE;
  let hi = MAX_RATE;
  let fLo = pv(flows, lo, t0);
  let fHi = pv(flows, hi, t0);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
  if (fLo === 0) return clampResult(lo);
  if (fHi === 0) return clampResult(hi);
  if (fLo * fHi > 0) return null; // no sign change in range — no root

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = pv(flows, mid, t0);
    if (!Number.isFinite(fMid)) return null;
    if (Math.abs(fMid) < 1e-9 || hi - lo < 1e-12) return clampResult(mid);
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return clampResult((lo + hi) / 2);
}

function clampResult(r: number): number | null {
  if (!Number.isFinite(r)) return null;
  if (r <= MIN_RATE || r > MAX_RATE) return null;
  return r;
}
