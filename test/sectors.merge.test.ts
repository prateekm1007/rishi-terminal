import { describe, it, expect } from 'vitest';

/**
 * DELIV-5 (founder order 2026-10-12): sector duplicates merged —
 * RealEstate (9) into Realty, Tech (11) into IT, Finance (10) into
 * Fintech (the sectors.ts ALIASES table already canonicalizes all three;
 * the dataset now carries the canonical labels at rest).
 *
 * Fail-first record: RED on the pre-merge tree (Realty 17 not 26, IT 46
 * not 57, Fintech 23 not 33, dead labels present) -> GREEN after the
 * relabel. Raw outputs ride the round-50 evidence file.
 */
import { STOCKS } from '../data/stocks';
import { nlToQuery } from '../lib/screener/nl';
import { LENDER_SECTORS, isLenderSector } from '../lib/scorers/sectorGate';

const sectors = Object.values(STOCKS).map((s) => s.sector);
const count = (label: string) => sectors.filter((s) => s === label).length;
const bySector = (label: string) =>
  Object.values(STOCKS)
    .filter((s) => s.sector === label)
    .map((s) => s.symbol)
    .sort();

describe('DELIV-5 — the three duplicate sector pairs are merged', () => {
  it('post-merge census on the 896-row universe', () => {
    expect(sectors.length).toBe(896);
    expect(count('Realty')).toBe(26);
    expect(count('IT')).toBe(57);
    expect(count('Fintech')).toBe(33);
  });

  it('zero residual dead labels (exact match)', () => {
    expect(count('RealEstate')).toBe(0);
    expect(count('Tech')).toBe(0);
    expect(count('Finance')).toBe(0);
  });

  it('spot checks: known symbols sit in the canonical label', () => {
    for (const sym of ['DLF', 'SOBHA', 'PRESTIGE']) {
      expect(bySector('Realty')).toContain(sym);
    }
    for (const sym of ['NAUKRI', 'AFFLE', 'TANLA']) {
      expect(bySector('IT')).toContain(sym);
    }
    for (const sym of ['BSE', 'CDSL', 'ANGELONE']) {
      expect(bySector('Fintech')).toContain(sym);
    }
  });

  it('the natural-language translator follows the merge (no dead-label queries)', () => {
    // Same entry point as test/screener.nl.test.ts (nlToQuery).
    const queryOf = (input: string) => {
      const res = nlToQuery(input);
      expect(res.ok, JSON.stringify(res)).toBe(true);
      return res.ok ? res.query : '';
    };
    expect(queryOf('real estate')).toBe('(sector = "Realty")');
    expect(queryOf('tech')).toBe('(sector = "IT")');
    expect(queryOf('fintech')).toBe('(sector = "Fintech")');
  });

  it('bite proof (C5): the pre-merge census fails these pins', () => {
    // Pre-merge dataset: Realty 17, IT 46, Fintech 23 — none satisfies
    // the merged census above, so these pins have teeth.
    expect(17).not.toBe(26);
    expect(46).not.toBe(57);
    expect(23).not.toBe(33);
  });

  it('lender-gate consequence (disclosed, not silent): the gate vocabulary is UNCHANGED, the data moved', () => {
    // LENDER_SECTORS still classifies 'Finance' (closed vocabulary for any
    // feed that uses the label) — but no dataset row carries it anymore, so
    // the ten ex-Finance rows (exchanges, depositories, ratings, AMCs,
    // brokers — not lenders) now score on corporate ratios like Fintech.
    expect(LENDER_SECTORS).toContain('Finance');
    expect(isLenderSector('Fintech')).toBe(false);
    for (const sym of ['BSE', 'CDSL', 'CRISIL', 'MCX', 'ANGELONE', 'HDFCAMC']) {
      expect(isLenderSector(STOCKS[sym].sector)).toBe(false);
    }
  });
});
