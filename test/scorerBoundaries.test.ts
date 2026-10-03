import { describe, it, expect } from 'vitest';

/**
 * W4 closure (founder round-11, directions 10/11/12): the retuned
 * scorers must be audited for METHODOLOGY DRIFT, not merely a nicer
 * distribution. Pinned here, per scorer:
 *
 *  - exact boundary values of every ramp (direction 10: the Pabrai
 *    docstring said "0 at promoter 35%" while the code produces 35 —
 *    the CODE is the intended ramp, the words were wrong; these tests
 *    pin the real boundaries so neither can drift silently again);
 *  - monotonic direction across a grid (a "graded ramp" that is not
 *    monotone is a mislabeled ladder);
 *  - degenerate denominators (direction 12): a negative/zero book
 *    value, NCAV or total-liabilities input must NOT be hidden behind a
 *    Math.max(1, ...) floor that fabricates a display ratio ("Price/
 *    NCAV 245.00x" for a negative-NCAV stock is a fabricated number,
 *    rule 3) — the component scores 0 with an HONEST detail string,
 *    because the component's premise (a discount to asset value) does
 *    not exist. Universe incidence measured on the 916 seed:
 *    bvps <= 0: 0 rows; tl <= 0: 0 rows; ncav <= 0: 37 rows (the old
 *    code's Math.max(1, ncav) masked them — the component scored 0
 *    while the detail fabricated "Price/NCAV <price>x" as if a
 *    positive NCAV existed; verified by scripts/w4Audit.ts on all 37
 *    rows).
 *  - weights still sum to 100; scores stay 0-100 and finite;
 *  - detail strings describe the formula actually used (rule 2).
 */
import { scorePabrai } from '@/lib/scorers/pabrai';
import { scorePorinju } from '@/lib/scorers/porinju';
import { scoreSoros } from '@/lib/scorers/soros';
import type { Stock } from '@/lib/types';

function stock(overrides: Partial<Stock>): Stock {
  return {
    symbol: 'TEST', name: 'Test Ltd', sector: 'Diversified', exchange: 'NSE',
    price: 100, pe: 20, roe: 15, mktcap: 10000, ocf: 500, rev: 4000,
    revcagr: 12, epscagr: 14, opm: 15, roce: 16, de: 0.5, fcf: 100,
    promo: 45, ca: 800, tl: 400, sh: 100, np: 300, dep: 60, capex: 80,
    bvps: 250,
    ...overrides,
  };
}

const weightsSum = (comps: Array<{ wt: number }>) => comps.reduce((a, c) => a + c.wt, 0);

describe('W4 closure — Pabrai ramp boundaries (direction 10)', () => {
  it('Clone ramp: 0 at promoter 0%, 35 at 35%, 100 from exactly 57.75% (code is the truth, docstring corrected)', () => {
    const at = (promo: number) =>
      scorePabrai(stock({ promo })).comps.find((c) => c.label === 'Clone Score')!.v;
    expect(at(0)).toBe(0);
    expect(at(35)).toBe(35);   // the documented contradiction: 35, NOT 0
    expect(at(50)).toBe(78);   // 35 + 15 x 100/35 = 77.86 -> 78 (still ramping)
    expect(at(57.75)).toBe(100); // the EXACT clamp point: 35 + 22.75 x 100/35
    expect(at(60)).toBe(100);
    expect(at(90)).toBe(100);  // clamped above the ramp top
    expect(at(20)).toBe(0);    // 35 + (20-35)*100/35 = -7.86 -> clamped to 0
  });

  it('Owner ramp: 0 at 20%, 100 from 60%', () => {
    const at = (promo: number) =>
      scorePabrai(stock({ promo })).comps.find((c) => c.label === 'Owner Operator')!.v;
    expect(at(20)).toBe(0);
    expect(at(40)).toBe(50);
    expect(at(60)).toBe(100);
  });

  it('Uncertainty ramp: 100 at P/E <= 10, 0 at P/E 40; detail says target <10', () => {
    const at = (pe: number) =>
      scorePabrai(stock({ pe })).comps.find((c) => c.label === 'High Uncertainty Discount')!;
    expect(at(10).v).toBe(100);
    expect(at(25).v).toBe(50);
    expect(at(40).v).toBe(0);
    expect(at(10).detail).toContain('target <10');
  });

  it('Low risk: 100 at D/E 0 with FCF; the FCF-less multiplier 0.6 applies; 0 at D/E 100/45', () => {
    const lowRisk = (de: number, fcf: number) =>
      scorePabrai(stock({ de, fcf })).comps.find((c) => c.label === 'Low Risk')!.v;
    expect(lowRisk(0, 100)).toBe(100);
    expect(lowRisk(1, 100)).toBe(55);          // 100 - 45
    expect(lowRisk(0, 0)).toBe(60);            // 100 * 0.6
    expect(Math.round(lowRisk(100 / 45, 100))).toBe(0); // the exact zero of the ramp
  });

  it('weights sum to 100 and the score stays finite in 0-100 across a wide grid', () => {
    for (let promo = 0; promo <= 90; promo += 15) {
      for (const pe of [5, 10, 25, 40, 60]) {
        for (const [de, fcf] of [[0, 100], [1, 0], [3, -50]] as const) {
          const r = scorePabrai(stock({ promo, pe, de, fcf }));
          expect(weightsSum(r.comps)).toBe(100);
          expect(r.score).not.toBeNull();
          expect(r.score as number).toBeGreaterThanOrEqual(0);
          expect(r.score as number).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('the docstring no longer claims a 0-at-35% ramp (direction 10: words = code)', () => {
    // Read the module source: the Clone comment must state the real ramp.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'lib', 'scorers', 'pabrai.ts'), 'utf8');
    expect(src).not.toContain('0 at promoter 35%');
    expect(src).toContain('35 at promoter 35%');
  });
});

describe('W4 closure — Porinju boundaries + degenerate book value (direction 12)', () => {
  it('Contrarian ramp: 100 at P/E <= 10, 0 at 60', () => {
    const at = (pe: number) =>
      scorePorinju(stock({ pe })).comps.find((c) => c.label === 'Contrarian')!.v;
    expect(at(10)).toBe(100);
    expect(at(35)).toBe(50);
    expect(at(60)).toBe(0);
  });

  it('Management ramp: 0 at 25%, 100 from 65%', () => {
    const at = (promo: number) =>
      scorePorinju(stock({ promo })).comps.find((c) => c.label === 'Management')!.v;
    expect(at(25)).toBe(0);
    expect(at(45)).toBe(50);
    expect(at(65)).toBe(100);
  });

  it('Undervaluation ramp with a REAL book value: 100 at P/B <= 1, 0 at 4; detail shows the true P/B', () => {
    // price 200, bvps 200 -> P/B 1.0
    const atPb = (price: number, bvps: number) =>
      scorePorinju(stock({ price, bvps })).comps.find((c) => c.label === 'Undervaluation')!;
    expect(atPb(200, 200).v).toBe(100);
    expect(atPb(400, 200).v).toBe(67); // 100 - (2-1)*(100/3) = 66.67 -> rounded component
    expect(atPb(800, 200).v).toBe(0);
    expect(atPb(300, 200).detail).toBe('P/B 1.5x');
  });

  it('NEGATIVE or ZERO book value: Undervaluation scores 0 and the detail says so — never a fabricated P/B', () => {
    for (const bvps of [-50, 0]) {
      const comp = scorePorinju(stock({ price: 100, bvps })).comps.find((c) => c.label === 'Undervaluation')!;
      expect(comp.v, `bvps=${bvps}`).toBe(0);
      expect(comp.detail.toLowerCase()).toContain('no asset backing');
      expect(comp.detail).not.toMatch(/P\/B \d/); // no fabricated ratio
    }
  });

  it('monotone direction: score never rises as P/E rises (hated price = better entry)', () => {
    let prev = scorePorinju(stock({ pe: 8 })).score as number;
    for (const pe of [10, 12, 15, 20, 30, 45, 60, 80]) {
      const v = scorePorinju(stock({ pe })).score as number;
      expect(v, `pe=${pe}`).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('weights sum to 100; score stays finite in 0-100 across degenerate inputs', () => {
    for (const bvps of [-50, 0, 1, 250]) {
      const r = scorePorinju(stock({ bvps, pe: 70, promo: 10, revcagr: -5 }));
      expect(weightsSum(r.comps)).toBe(100);
      expect(r.score).not.toBeNull();
      expect(r.score as number).toBeGreaterThanOrEqual(0);
      expect(r.score as number).toBeLessThanOrEqual(100);
    }
  });
});

describe('W4 closure — Soros boundaries + degenerate NCAV/liabilities (direction 12)', () => {
  it('Reflexivity ramp with POSITIVE NCAV: 100 at price/NCAV 1.5, 0 at 6.5', () => {
    // ca 800, tl 400, sh 100 -> NCAV = (800-400)/100 = 4/share.
    // price 6 -> P/NCAV 1.5; price 16 -> 4; price 26 -> 6.5.
    const at = (price: number) =>
      scoreSoros(stock({ price, ca: 800, tl: 400, sh: 100 })).comps.find((c) => c.label === 'Reflexivity Signal')!.v;
    expect(at(6)).toBe(100);
    expect(at(16)).toBe(50);
    expect(at(26)).toBe(0);
  });

  it('NEGATIVE or ZERO NCAV: Reflexivity scores 0 and the detail says so — never a fabricated Price/NCAV', () => {
    // ca 300, tl 500, sh 100 -> ncav = -2
    for (const [ca, tl] of [[300, 500], [400, 400]] as const) {
      const comp = scoreSoros(stock({ price: 100, ca, tl, sh: 100 })).comps.find((c) => c.label === 'Reflexivity Signal')!;
      expect(comp.v, `ca=${ca}, tl=${tl}`).toBe(0);
      expect(comp.detail).toContain('NCAV');
      expect(comp.detail).not.toMatch(/Price\/NCAV \d/); // no fabricated ratio
    }
  });

  it('Leverage ramp: 100 at D/E 0.5, 0 from 2.5', () => {
    const at = (de: number) =>
      scoreSoros(stock({ de })).comps.find((c) => c.label === 'Leverage Tolerance')!.v;
    expect(at(0.5)).toBe(100);
    expect(at(1.5)).toBe(50);
    expect(at(2.5)).toBe(0);
    expect(at(4)).toBe(0);
  });

  it('Momentum ramp: 0 at EPS CAGR 0, 100 from 25%; Macro ramp: 0 at 0, 100 from 20%', () => {
    const mom = (epscagr: number) =>
      scoreSoros(stock({ epscagr })).comps.find((c) => c.label === 'Momentum Confirm')!.v;
    expect(mom(0)).toBe(0);
    expect(mom(12.5)).toBe(50);
    expect(mom(25)).toBe(100);
    const mac = (revcagr: number) =>
      scoreSoros(stock({ revcagr })).comps.find((c) => c.label === 'Macro Tailwind')!.v;
    expect(mac(0)).toBe(0);
    expect(mac(10)).toBe(50);
    expect(mac(20)).toBe(100);
  });

  it('Liquidity ramp with real liabilities: 50 at current ratio 1, 100 from 2; NON-POSITIVE liabilities -> 0 with an honest detail', () => {
    const liq = (ca: number, tl: number) =>
      scoreSoros(stock({ ca, tl })).comps.find((c) => c.label === 'Liquidity Buffer')!;
    expect(liq(400, 400).v).toBe(50);   // cr = 1
    expect(liq(800, 400).v).toBe(100);  // cr = 2
    const degenerate = liq(400, 0);
    expect(degenerate.v).toBe(0);
    expect(degenerate.detail).toContain('not computable');
  });

  it('weights sum to 100; score stays finite in 0-100 across degenerate inputs', () => {
    for (const [ca, tl, sh] of [[300, 500, 100], [400, 400, 100], [800, 400, 100]] as const) {
      const r = scoreSoros(stock({ ca, tl, sh, price: 100, revcagr: -10, epscagr: -10, de: 4 }));
      expect(weightsSum(r.comps)).toBe(100);
      expect(r.score).not.toBeNull();
      expect(r.score as number).toBeGreaterThanOrEqual(0);
      expect(r.score as number).toBeLessThanOrEqual(100);
    }
  });
});
