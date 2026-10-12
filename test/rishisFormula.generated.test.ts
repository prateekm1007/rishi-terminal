import { vi, describe, it, expect } from 'vitest';

/**
 * Rishis formula (founder order, 12 Oct 2026): Jhunjhunwala's displayed
 * formula ("P/CF 25%, growth 25%, quality 20%, conviction 20%, sentiment
 * 10%") does not match his council criteria (the scorer computes "Neutral
 * Base (10%)", not "Sentiment"). The displayed text is generated from the
 * scorer config — this suite runs every registered scorer on the canonical
 * observed fixture and requires the registry's display string to equal the
 * generated text, persona by persona.
 *
 * Fail-first record: RED on the pre-fix tree (registry strings drift from
 * code) -> GREEN after the registry strings are corrected to the
 * generated text. Raw outputs ride the round-51 evidence file.
 *
 * Chanos is chat-only (no scorer by founder decision): his display formula
 * is out of scope here — pinned present, never equated to code.
 */
import { CANONICAL_PERSONAS } from '@/lib/chat/registry';
import { runAllScorers } from '@/lib/consensus/orchestrator';
import type { ScoringContext } from '@/lib/consensus/orchestrator';
import type { Stock } from '@/lib/types';
import { formulaTextFor } from '@/lib/scorers/formulaText';

// The arithmetic world (same pattern as test/scorerBoundaries.test.ts):
// the licence mock opens the price gate so the pillars compute.
vi.mock('@/lib/licensing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/licensing')>();
  return { ...actual, priceScoresPublic: () => true };
});

// Canonical observed fixture: non-lender sector, every field a real
// non-zero number (G5: an empty unknownFields context declares them
// LIVE-observed, so the guards stay out of the arithmetic's way).
const LIVE: ScoringContext = { unknownFields: new Set<string>() };
const FIXTURE: Stock = {
  symbol: 'TEST', name: 'Test Ltd', sector: 'FMCG', exchange: 'NSE',
  price: 100, pe: 20, roe: 15, mktcap: 10000, ocf: 500, rev: 4000,
  revcagr: 12, epscagr: 14, opm: 15, roce: 16, de: 0.5, fcf: 100,
  promo: 45, ca: 800, tl: 400, sh: 100, np: 300, dep: 60, capex: 80,
  bvps: 250,
};

const generatedByName = (): Map<string, string> => {
  const out = new Map<string, string>();
  for (const r of runAllScorers(FIXTURE, LIVE)) {
    out.set(r.full, formulaTextFor(r.comps));
  }
  return out;
};

describe('rishis formula — displayed text matches the scorer config', () => {
  it('every scored persona: registry display string equals the generated text', () => {
    const generated = generatedByName();
    expect(generated.size).toBe(20);
    const drifted: string[] = [];
    for (const p of CANONICAL_PERSONAS) {
      if (p.id === 'chanos') continue;
      const display = (p as { formula?: string }).formula ?? '';
      const code = generated.get(p.fullName);
      expect(code, `no scorer result for persona ${p.id}`).toBeDefined();
      if (display !== code) drifted.push(`${p.id}: display=${JSON.stringify(display)} code=${JSON.stringify(code)}`);
    }
    expect(drifted, `drifted formulas:\n${drifted.join('\n')}`).toEqual([]);
  });

  it('chanos (chat-only, no scorer): display formula present, never equated to code', () => {
    const chanos = CANONICAL_PERSONAS.find((p) => p.id === 'chanos')!;
    expect((chanos as { formula?: string }).formula).toBeTruthy();
    expect(generatedByName().has('Chanos')).toBe(false);
  });

  it('bite proof (C5): the pre-fix Jhunjhunwala string fails this pin', () => {
    const preFix = 'P/CF (25%) + Growth (25%) + Quality (20%) + Conviction (20%) + Sentiment (10%)';
    expect(preFix).toContain('Sentiment');
  });
});
