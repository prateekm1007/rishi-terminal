/**
 * X3-07 (Round 14 A6) — XIRR acceptance.
 *
 * Roadmap acceptance (verbatim):
 *   npx vitest run test/portfolio.xirr.test.ts
 *   → XIRR matches a reference implementation to 1e-6 on 10 fixtures
 *
 * The reference is INDEPENDENT by construction: a dense grid scan over
 * [-0.99, 10] at 1e-7 resolution followed by local refinement — a
 * different algorithm, different code path, no shared helpers with the
 * implementation under test. The 10 fixtures include analytic cases
 * with closed-form answers (a single-period return MUST equal the
 * obvious rate) and multi-flow cases where only the reference
 * constrains the value.
 */
import { describe, expect, it } from 'vitest';
import { xirr, type DatedFlow } from '@/lib/portfolio/xirr';

const DAY = 86_400_000;

/** Independent reference: dense scan + bisection refinement. */
function referenceXirr(flows: DatedFlow[]): number | null {
  const t0 = Math.min(...flows.map((f) => f.at));
  const f = (r: number) =>
    flows.reduce((acc, fl) => acc + fl.amount / Math.pow(1 + r, (fl.at - t0) / (DAY * 365)), 0);

  // sign change scan
  let prevR = -0.9999999;
  let prevF = f(prevR);
  if (!Number.isFinite(prevF)) return null;
  let found: [number, number] | null = null;
  for (let r = -0.99; r <= 10.0000001; r += 1e-5) {
    const fr = f(r);
    if (!Number.isFinite(fr)) break;
    if (prevF === 0) return prevR;
    if (prevF * fr < 0) {
      found = [prevR, r];
      break;
    }
    prevR = r;
    prevF = fr;
  }
  if (!found) return null;
  let [lo, hi] = found;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (f(lo) * fm <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function d(base: Date, offsetDays: number): number {
  return base.getTime() + offsetDays * DAY;
}

const T0 = new Date('2023-01-01T00:00:00Z');

interface Fixture {
  name: string;
  flows: DatedFlow[];
  /** Closed-form expected value, when one exists. */
  analytic?: number;
}

const FIXTURES: Fixture[] = [
  {
    name: 'single period 10% gain',
    flows: [
      { amount: -100, at: d(T0, 0) },
      { amount: 110, at: d(T0, 365) },
    ],
    analytic: 0.1,
  },
  {
    name: 'single period loss',
    flows: [
      { amount: -100, at: d(T0, 0) },
      { amount: 80, at: d(T0, 365) },
    ],
    analytic: -0.2,
  },
  {
    name: 'half-year 5% gain annualizes to ~10.25%',
    flows: [
      { amount: -100, at: d(T0, 0) },
      { amount: 105, at: d(T0, 182.5) },
    ],
    analytic: Math.pow(105 / 100, 365 / 182.5) - 1,
  },
  {
    name: 'two buys, one exit (SIP)',
    flows: [
      { amount: -1000, at: d(T0, 0) },
      { amount: -1000, at: d(T0, 365) },
      { amount: 2310, at: d(T0, 730) },
    ],
    // 1000(1+r)^2 + 1000(1+r) = 2310 balances exactly at r = 0.10
    analytic: 0.1,
  },
  {
    name: 'staggered SIP with final value',
    flows: [
      { amount: -500, at: d(T0, 0) },
      { amount: -500, at: d(T0, 90) },
      { amount: -500, at: d(T0, 180) },
      { amount: -500, at: d(T0, 270) },
      { amount: 2260, at: d(T0, 400) },
    ],
  },
  {
    name: 'partial redemption then final value',
    flows: [
      { amount: -10000, at: d(T0, 0) },
      { amount: 3000, at: d(T0, 200) },
      { amount: 8500, at: d(T0, 500) },
    ],
  },
  {
    name: 'long horizon decade',
    flows: [
      { amount: -1000, at: d(T0, 0) },
      { amount: -500, at: d(T0, 1095) },
      { amount: 9000, at: d(T0, 3650) },
    ],
  },
  {
    name: 'monthly salary-like SIP',
    flows: [
      { amount: -100, at: d(T0, 0) },
      { amount: -100, at: d(T0, 30) },
      { amount: -100, at: d(T0, 60) },
      { amount: -100, at: d(T0, 90) },
      { amount: -100, at: d(T0, 120) },
      { amount: 590, at: d(T0, 150) },
    ],
  },
  {
    name: 'high return within range',
    flows: [
      { amount: -100, at: d(T0, 0) },
      { amount: 900, at: d(T0, 365) },
    ],
    analytic: 8.0,
  },
  {
    name: 'near-total loss',
    flows: [
      { amount: -1000, at: d(T0, 0) },
      { amount: 1, at: d(T0, 365) },
    ],
    analytic: -0.999,
  },
];

describe('X3-07 portfolio.xirr — matches the independent reference to 1e-6', () => {
  it.each(FIXTURES)('$name', (fx) => {
    const got = xirr(fx.flows);
    const ref = referenceXirr(fx.flows);
    expect(ref).not.toBeNull();
    expect(got).not.toBeNull();
    if (got !== null && ref !== null) {
      expect(Math.abs(got - ref)).toBeLessThan(1e-6);
    }
    if (fx.analytic !== undefined && got !== null) {
      expect(Math.abs(got - fx.analytic)).toBeLessThan(1e-6);
    }
  });
});

describe('X3-07 portfolio.xirr — degenerate inputs are null, never lies', () => {
  it('all-positive flows -> null (no root exists)', () => {
    expect(xirr([{ amount: 100, at: d(T0, 0) }, { amount: 110, at: d(T0, 365) }])).toBeNull();
  });

  it('all-negative flows -> null', () => {
    expect(xirr([{ amount: -100, at: d(T0, 0) }, { amount: -110, at: d(T0, 365) }])).toBeNull();
  });

  it('single flow -> null', () => {
    expect(xirr([{ amount: -100, at: d(T0, 0) }])).toBeNull();
  });

  it('empty -> null', () => {
    expect(xirr([])).toBeNull();
  });

  it('non-finite amounts -> null (never NaN out)', () => {
    expect(
      xirr([
        { amount: Number.NaN, at: d(T0, 0) },
        { amount: 110, at: d(T0, 365) },
      ]),
    ).toBeNull();
  });

  it('zero-span dates -> null', () => {
    expect(
      xirr([
        { amount: -100, at: d(T0, 10) },
        { amount: 110, at: d(T0, 10) },
      ]),
    ).toBeNull();
  });

  it('return beyond +1000%/yr is outside the search range -> null', () => {
    expect(
      xirr([
        { amount: -1, at: d(T0, 0) },
        { amount: 100_000, at: d(T0, 30) },
      ]),
    ).toBeNull();
  });
});

describe('X3-07 rule 14 — the lab calcXIRR delegates to the one implementation', () => {
  it('calcXIRR returns the shared solver value in percent (contract preserved)', async () => {
    const { calcXIRR } = await import('@/components/lab/helpers');
    const flows: DatedFlow[] = [
      { amount: -100, at: d(T0, 0) },
      { amount: 110, at: d(T0, 365) },
    ];
    const rate = xirr(flows);
    expect(rate).not.toBeNull();
    const pct = calcXIRR(flows.map((f) => ({ date: new Date(f.at), amount: f.amount })));
    expect(pct).not.toBeNull();
    if (rate !== null && pct !== null) {
      expect(Math.abs(pct - rate * 100)).toBeLessThan(1e-6);
    }
  });

  it('no-root flows return null from the wrapper too (old bisection returned a bogus midpoint)', async () => {
    const { calcXIRR } = await import('@/components/lab/helpers');
    const bogus = calcXIRR([
      { date: new Date(d(T0, 0)), amount: 100 },
      { date: new Date(d(T0, 365)), amount: 110 },
    ]);
    expect(bogus).toBeNull();
  });
});
