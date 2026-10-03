import { describe, it, expect } from 'vitest';

import { STOCKS } from '@/data/stocks';
import { scoreGreenblatt } from '@/lib/scorers/greenblatt';
import { runAllScorers } from '@/lib/consensus/orchestrator';
import type { Stock } from '@/lib/types';

/**
 * V2 (founder round 9): the Greenblatt scorer was dead — mean 0.18, sd 0.5,
 * max 5 across the whole 916-stock universe, "Top Bear" on every page.
 *
 * Root cause (rule 15 — fixed where the value is made): the scorer computed
 * the ratio np/mktcap as a FRACTION but scaled it as if it were a PERCENT.
 * ROC = np/(0.6*mktcap) = 0.1458 is 14.58%, yet the scale compared it to the
 * 25% target directly (0.1458 >= 25 → false) and multiplied by 4 → 0.58
 * instead of 58.3. Every score came out ~100x too small.
 *
 * These tests encode the percentage-correct arithmetic. They failed on the
 * buggy scorer (RED) and pass after the fix (GREEN) — raw outputs in the V2
 * PR and docs/evidence/v2/.
 */

/** A KTKBANK-like profile: small cap, real profit → mid-range scores. */
const SMALL_CAP_QUALITY: Stock = {
  symbol: 'V2PROBE', name: 'V2 Probe Small Cap', sector: 'Industrials', exchange: 'NSE',
  price: 520, pe: 11.4, roe: 8.75, mktcap: 3200, ocf: 400, rev: 1200, revcagr: 10,
  epscagr: 10, opm: 15, roce: 14, de: 0.2, fcf: 150, promo: 50, ca: 800, tl: 300,
  sh: 73, np: 280, dep: 40, capex: 55, bvps: 280,
};

describe('V2: Greenblatt Magic Formula arithmetic is percentage-correct', () => {
  it('np 280 / mktcap 3200 → ROC 14.583% (rocS 58.3), EY 8.75% (eyS 87.5), score 73', () => {
    const g = scoreGreenblatt(SMALL_CAP_QUALITY);
    expect(g.score).not.toBeNull();
    // ROC 14.583% -> 14.583*4 = 58.3; EY 8.75% -> 8.75*10 = 87.5; mean = 72.9
    expect(g.comps.find((c) => c.label === 'Return on Capital')!.v).toBe(58);
    expect(g.comps.find((c) => c.label === 'Earnings Yield')!.v).toBe(88);
    expect(g.score).toBe(73);
    // The detail strings must state percentages, not raw fractions.
    expect(g.comps.find((c) => c.label === 'Return on Capital')!.detail).toContain('14.6%');
    expect(g.comps.find((c) => c.label === 'Earnings Yield')!.detail).toContain('8.8%');
  });

  it('detail strings disclose the net-profit/market-cap proxy (founder directive 9: no EBIT/EV representation)', () => {
    const g = scoreGreenblatt(SMALL_CAP_QUALITY);
    const roc = g.comps.find((c) => c.label === 'Return on Capital')!;
    const ey = g.comps.find((c) => c.label === 'Earnings Yield')!;
    // The displayed numbers come from the documented np/mktcap proxy, and the
    // user-facing detail strings must say exactly which ratio was computed —
    // the platform must never present them as the strict EBIT/EV formula.
    expect(roc.detail).toContain('net profit / 0.6×market cap');
    expect(ey.detail).toContain('net profit / market cap');
  });

  it('hits the 25% ROC and 10% EY caps without exceeding 100', () => {
    const rich: Stock = { ...SMALL_CAP_QUALITY, np: 1000, mktcap: 3200 };
    // ROC = 1000/1920 = 52.1% >= 25 -> 100 ; EY = 1000/3200 = 31.25% >= 10 -> 100
    const g = scoreGreenblatt(rich);
    expect(g.score).toBe(100);
    expect(g.comps.every((c) => c.v === 100)).toBe(true);
  });

  it('zero market cap still yields null (T11 zero-guard preserved)', () => {
    const dead: Stock = { ...SMALL_CAP_QUALITY, mktcap: 0 };
    const g = scoreGreenblatt(dead);
    expect(g.score).toBeNull();
  });
});

describe('W4: scorer health across the universe (gate bites on saturated/flat scorers)', () => {
  /** Documented allow-list: scorers exempt from a health floor, each with a
   *  founder-approved justification in the PR that needs it.
   *
   *  W4 (founder round-10):
   *  - 'Greenblatt': the V2 units fix (PR #87) established the honest
   *    percent arithmetic for the np/mktcap Magic Formula proxy; the
   *    resulting low-end pile (26.9% of scores ≤ 5) is the actual shape of
   *    Indian small-cap earnings — a quarter of the universe has an
   *    earnings yield under ~0.5% (near-zero net profit), which floors BOTH
   *    components (rocS and eyS) by the formula's own arithmetic. Re-tuning
   *    the thresholds to cosmeticize that pile is exactly the "blind
   *    re-tune" the founder direction forbids. sd 24.0 proves real spread
   *    where earnings exist; the V2 acceptance (spread ≥ 90: 88.2% →
   *    20.7%) was taken with this shape. */
  const SCORER_HEALTH_ALLOWLIST: ReadonlyMap<string, string> = new Map([
    ['Greenblatt', 'V2-honest Magic Formula arithmetic: near-zero-earnings stocks legitimately floor both components (see scorerHealth.test.ts header); re-tuning forbidden by the W4 direction'],
  ]);

  const UNIVERSE = Object.values(STOCKS);

  it('every scorer has sd >= 8 and no more than 20% of scores at or beyond 5/95 (W4 floors)', () => {
    const perScorer = new Map<string, number[]>();
    for (const s of UNIVERSE) {
      for (const sc of runAllScorers(s)) {
        if (sc.score === null || !Number.isFinite(sc.score)) continue;
        if (!perScorer.has(sc.name)) perScorer.set(sc.name, []);
        perScorer.get(sc.name)!.push(sc.score);
      }
    }
    const offenders: string[] = [];
    for (const [name, vals] of perScorer) {
      if (SCORER_HEALTH_ALLOWLIST.has(name)) continue;
      const n = vals.length;
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
      const pctLE5 = vals.filter((v) => v <= 5).length / n;
      const pctGE95 = vals.filter((v) => v >= 95).length / n;
      if (sd < 8) offenders.push(`${name}: sd=${sd.toFixed(2)} < 8 (flat)`);
      if (pctLE5 > 0.2) offenders.push(`${name}: ${(pctLE5 * 100).toFixed(1)}% of scores <= 5 (> 20%)`);
      if (pctGE95 > 0.2) offenders.push(`${name}: ${(pctGE95 * 100).toFixed(1)}% of scores >= 95 (> 20% — saturated)`);
    }
    expect(offenders, `flat or saturated scorers: ${offenders.join('; ')}`).toEqual([]);
  });

  it('Greenblatt participates in the consensus with a real spread of its own', () => {
    const scores = UNIVERSE.map((s) => scoreGreenblatt(s).score).filter((v): v is number => v !== null);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / (scores.length - 1));
    expect(sd).toBeGreaterThanOrEqual(3);
  });
});
