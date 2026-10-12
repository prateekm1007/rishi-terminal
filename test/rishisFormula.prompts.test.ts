import { vi, describe, it, expect } from 'vitest';

/**
 * Round 53 (founder item 4, words verbatim: "Update the system-prompt
 * formula lines to match the scorer weights in the same PR or a follow-up.
 * This blocks chat going live, not the demo."): the chat SYSTEM PROMPTS
 * still carried the old hand-typed formulas while the displayed formula
 * (this PR's main change) is now generated from the scorer config. A
 * persona whose prompt states different weights than the scorer computes
 * would make the character explain a framework the product does not run —
 * the chat-side twin of the /rishis drift this PR fixes.
 *
 * Contract: for every persona WITH a scorer, every WEIGHTED formula line
 * in the systemPrompt (a line carrying at least two "(N%)" components)
 * must contain the scorer-generated formula text — the same
 * formulaTextFor(runAllScorers(...)) source the display strings use
 * (Rule 14: one source of truth; the test is the mechanical enforcement).
 *
 * Chanos is chat-only (no scorer by founder decision): out of scope,
 * pinned present, never equated to code.
 *
 * Fail-first record: RED on the pre-fix tree (the drifted prompt lines
 * listed below) -> GREEN after every formula line is regenerated. Raw
 * outputs ride the round-51 evidence file.
 */
import { CANONICAL_PERSONAS } from '@/lib/chat/registry';
import { runAllScorers } from '@/lib/consensus/orchestrator';
import type { ScoringContext } from '@/lib/consensus/orchestrator';
import type { Stock } from '@/lib/types';
import { formulaTextFor } from '@/lib/scorers/formulaText';

vi.mock('@/lib/licensing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/licensing')>();
  return { ...actual, priceScoresPublic: () => true };
});

const LIVE: ScoringContext = { unknownFields: new Set<string>() };
const FIXTURE: Stock = {
  symbol: 'TEST', name: 'Test Ltd', sector: 'FMCG', exchange: 'NSE',
  price: 100, pe: 20, roe: 15, mktcap: 10000, ocf: 500, rev: 4000,
  revcagr: 12, epscagr: 14, opm: 15, roce: 16, de: 0.5, fcf: 100,
  promo: 45, ca: 800, tl: 400, sh: 100, np: 300, dep: 60, capex: 80,
  bvps: 250,
};

describe('RISHIS-FORMULA — the chat system prompts state the scorer formula (founder round-53 item 4)', () => {
  it('every weighted formula line in every scorer persona\'s systemPrompt matches the generated text', () => {
    const generatedByFull = new Map<string, string>();
    for (const r of runAllScorers(FIXTURE, LIVE)) {
      generatedByFull.set(r.full, formulaTextFor(r.comps));
    }
    expect(generatedByFull.size).toBeGreaterThan(0);

    const mismatches: string[] = [];
    const checked = new Set<string>();

    for (const p of CANONICAL_PERSONAS) {
      const generated = generatedByFull.get(p.fullName);
      if (!generated) continue; // chat-only persona (Chanos) — no scorer
      checked.add(p.id);

      for (const rawLine of p.systemPrompt.split('\n')) {
        const line = rawLine.trim();
        const weightClaims = line.match(/\(\d+%\)/g) ?? [];
        if (weightClaims.length < 2) continue; // not a weighted formula line
        if (!line.includes(generated)) {
          mismatches.push(
            `${p.id}: "${line.slice(0, 110)}…" does not state the scorer formula "${generated}"`,
          );
        }
      }
    }

    // Positive control (B-18): the suite actually reached the scorer
    // personas — at least the founder's named case must have been checked.
    expect(checked.has('jhunjhunwala')).toBe(true);
    expect(mismatches).toEqual([]);
  });

  it('the founder\'s named case: Jhunjhunwala\'s prompt no longer says "Sentiment (10%)" — the scorer holds Neutral Base', () => {
    const jhunjhunwala = CANONICAL_PERSONAS.find((p) => p.id === 'jhunjhunwala');
    expect(jhunjhunwala).toBeTruthy();
    const formulaLines = jhunjhunwala!.systemPrompt
      .split('\n')
      .filter((l) => (l.match(/\(\d+%\)/g) ?? []).length >= 2);
    expect(formulaLines.length).toBeGreaterThanOrEqual(1);
    for (const line of formulaLines) {
      expect(line).toContain('Neutral Base (10%)');
      expect(line).not.toContain('Sentiment (10%)');
    }
  });
});
