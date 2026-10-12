// lib/bonds/duration.ts — Macaulay & modified duration from cash flows.
//
// FD-15 / founder order 2026-10-11 (item 3): "Compute durations from cash
// flows, or show '—'." The bond list page renders duration ONLY when it can
// be computed from a sourced yield and the instrument's recorded cash-flow
// terms; today no sourced yield exists on that page, so every duration
// renders "—". This module is the computation those rows will use the
// moment an observation arrives (RBI DBIE wiring is pending its first
// verified fetch — docs/DATA_PROVIDER_MATRIX.md "Macro — RBI").
//
// Pure maths, injectable clock (Rule 18: deterministic under test).

export interface BondCashFlow {
  /** Payment date (ISO YYYY-MM-DD). */
  date: string;
  /** Total cash paid on that date (coupon, and principal at maturity). */
  amount: number;
}

/** Year-fraction between two ISO dates (act/365.25, the terminal's bond convention). */
export function yearFraction(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / (365.25 * 24 * 3600 * 1000);
}

/**
 * Build the cash-flow schedule of a fixed-coupon bond from its terms:
 * annual coupons on the maturity month/day, principal at maturity.
 * `couponRate` is annual percent of face; `face` defaults to 100.
 *
 * Returns null when the terms are degenerate (unparseable maturity,
 * non-positive coupon count) — Rule 16: null, never a fabricated schedule.
 */
export function fixedCouponSchedule(args: {
  maturityDate: string;
  couponRate: number;
  face?: number;
  frequencyPerYear?: 1 | 2;
  now?: Date;
}): BondCashFlow[] | null {
  const face = args.face ?? 100;
  const freq = args.frequencyPerYear ?? 1;
  const maturity = Date.parse(args.maturityDate);
  if (!Number.isFinite(maturity)) return null;
  if (!(args.couponRate >= 0) || !Number.isFinite(args.couponRate)) return null;
  const now = args.now ?? new Date();
  const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (maturity <= nowMs) return null; // matured / unparseable horizon: no schedule

  const coupon = (args.couponRate / 100) * face / freq;
  const flows: BondCashFlow[] = [];
  const m = new Date(maturity);
  let year = m.getUTCFullYear();
  let month = m.getUTCMonth();
  const day = m.getUTCDate();
  // Walk backwards from maturity in coupon steps, keeping past flows out.
  const stepMonths = 12 / freq;
  for (;;) {
    const pay = Date.UTC(year, month, day);
    if (pay > nowMs) {
      const isMaturity = pay === maturity;
      flows.push({
        date: new Date(pay).toISOString().slice(0, 10),
        amount: coupon + (isMaturity ? face : 0),
      });
    }
    if (pay <= nowMs) break;
    month -= stepMonths;
    while (month < 0) {
      month += 12;
      year -= 1;
    }
    if (month === m.getUTCMonth() && year === m.getUTCFullYear() && day === m.getUTCDate() && pay !== maturity) break;
  }
  return flows.reverse();
}

/**
 * Macaulay duration in years: the present-value-weighted average time to
 * receive the bond's cash flows, discounted at `ytmPercent` (annual,
 * compounded with the same frequency as the schedule).
 *
 * Null on degenerate input (no flows, non-finite yield, yield <= -100%,
 * non-positive PV) — the caller renders "—" (Rule 16).
 */
export function macaulayDuration(
  flows: BondCashFlow[],
  ytmPercent: number,
  settlement: string,
): number | null {
  if (!flows.length) return null;
  if (!Number.isFinite(ytmPercent) || ytmPercent <= -100) return null;
  const sett = Date.parse(settlement);
  if (!Number.isFinite(sett)) return null;
  const perPeriod = ytmPercent / 100; // annual effective here (annual coupons)
  let pvTotal = 0;
  let pvWeighted = 0;
  for (const f of flows) {
    const t = yearFraction(settlement, f.date);
    if (t === null || t < 0) continue;
    const df = Math.pow(1 + perPeriod, -t);
    const pv = f.amount * df;
    pvTotal += pv;
    pvWeighted += pv * t;
  }
  if (pvTotal <= 0) return null;
  return pvWeighted / pvTotal;
}

/** Modified duration = Macaulay / (1 + y). Null under the same rules. */
export function modifiedDuration(
  flows: BondCashFlow[],
  ytmPercent: number,
  settlement: string,
): number | null {
  const mac = macaulayDuration(flows, ytmPercent, settlement);
  if (mac === null) return null;
  const y = ytmPercent / 100;
  if (1 + y === 0) return null;
  return mac / (1 + y);
}
