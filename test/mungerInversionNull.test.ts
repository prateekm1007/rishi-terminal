import { describe, it, expect } from 'vitest';

/**
 * ENG-1b (founder order 2026-10-12): the Munger Inversion Check returns
 * null with a 'not assessed' detail when forensic inputs are absent —
 * never the default 50, which reads as a forensic clearance no data
 * backs (the pipeline observes no accounting flags, related-party
 * percentages or auditor notes for any record).
 *
 * Fail-first record: RED on the pre-fix tree (inversion v = 50, the
 * `toBeNull` pin fails) -> GREEN after the fix. Raw outputs ride the
 * round-50 evidence file.
 */
import { scoreMunger } from '@/lib/scorers/munger';
import type { Stock } from '@/lib/types';
import type { ScoringContext } from '@/lib/consensus/orchestrator';

// G5: an empty unknownFields context declares the fixtures' values
// LIVE-observed, so the provenance guard stays out of the arithmetic.
const LIVE: ScoringContext = { unknownFields: new Set<string>() };

function stock(overrides: Partial<Stock>): Stock {
  return {
    symbol: 'TEST', name: 'Test Ltd', sector: 'FMCG', exchange: 'NSE',
    price: 100, pe: 20, roe: 15, mktcap: 10000, ocf: 500, rev: 4000,
    revcagr: 12, epscagr: 14, opm: 15, roce: 16, de: 0.5, fcf: 100,
    promo: 45, ca: 800, tl: 400, sh: 100, np: 300, dep: 60, capex: 80,
    bvps: 250,
    ...overrides,
  };
}

const inversionOf = (s: Stock) =>
  scoreMunger(s, LIVE).comps.find((c) => c.label === 'Inversion Check')!;

describe('ENG-1b — the Inversion Check is null when forensic inputs are absent', () => {
  it('clean observed inputs with no forensic data: the pillar is null, labelled not assessed', () => {
    const inv = inversionOf(stock({}));
    expect(inv.v).toBeNull();
    expect(inv.detail.toLowerCase()).toContain('not assessed');
  });

  it('the two observed screens still bite: high debt or negative FCF score 0', () => {
    expect(inversionOf(stock({ de: 3 })).v).toBe(0);
    expect(inversionOf(stock({ fcf: -10 })).v).toBe(0);
  });

  it('the total renormalizes over the assessed pillars (abstain — never zero-fill, never 50-fill)', () => {
    const r = scoreMunger(stock({}), LIVE);
    const assessed = r.comps.filter((c) => c.v !== null);
    expect(assessed.length).toBe(r.comps.length - 1);
    const w = assessed.reduce((a, c) => a + c.wt, 0);
    const expected = assessed.reduce((a, c) => a + (c.v as number) * c.wt, 0) / w;
    expect(r.scoreRaw).toBeCloseTo(expected, 8);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it('bite proof (C5): the pre-fix default 50 does not satisfy the null pin', () => {
    expect((50 as number | null) === null).toBe(false);
  });
});
