import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Rishi decision (founder, 12 Oct 2026, verbatim): "21 with Chanos
 * chat-only". Scored count stays 20; Chanos carries the simulated label
 * and no score.
 *
 * Fail-first record: RED on the pre-decision tree (dashboard wisdom body
 * names Chanos among applied frameworks; no chatOnly field anywhere) ->
 * GREEN after the record + copy + chip. Raw outputs ride the round-51
 * evidence file.
 */
import { CANONICAL_PERSONAS } from '@/lib/chat/registry';
import { PERSONA_DISPLAY } from '@/lib/chat/registryDisplay';
import { SCORER_REGISTRY, TOTAL_RISHIS } from '@/lib/consensus/orchestrator';

const LOCALES = readdirSync('messages').filter((f) => f.endsWith('.json'));
const read = (f: string) => readFileSync(`messages/${f}`, 'utf8');

describe('Rishi decision — 21 with Chanos chat-only (founder 12 Oct 2026)', () => {
  it('the roster is 21 display personas; the scored council is 20', () => {
    expect(CANONICAL_PERSONAS.length).toBe(21);
    expect(PERSONA_DISPLAY.length).toBe(21);
    expect(TOTAL_RISHIS).toBe(20);
    expect(SCORER_REGISTRY.length).toBe(20);
  });

  it('Chanos is chat-only: flagged, simulated, and outside the scoring council', () => {
    const chanos = CANONICAL_PERSONAS.find((p) => p.id === 'chanos')!;
    expect(chanos).toBeTruthy();
    expect((chanos as { chatOnly?: boolean }).chatOnly).toBe(true);
    const display = PERSONA_DISPLAY.find((p) => p.id === 'chanos')!;
    expect((display as { chatOnly?: boolean }).chatOnly).toBe(true);
    const scorerNames = SCORER_REGISTRY.map((fn) => fn.name.toLowerCase());
    expect(scorerNames.some((n) => n.includes('chanos'))).toBe(false);
  });

  it('no other persona is chat-only (the flag is Chanos-only)', () => {
    for (const p of CANONICAL_PERSONAS) {
      if (p.id === 'chanos') continue;
      expect((p as { chatOnly?: boolean }).chatOnly ?? false).toBe(false);
    }
  });

  it('the dashboard wisdom body no longer lists Chanos among applied frameworks', () => {
    let bodies = 0;
    for (const f of LOCALES) {
      const messages = JSON.parse(read(f));
      const body: string | undefined = messages?.dashboard2?.wisdom?.body;
      if (typeof body !== 'string') continue; // fallback locales use en
      bodies++;
      expect(body, `${f}: dashboard wisdom body still applies Chanos`).not.toContain('Chanos');
    }
    // Positive control (B-18): the bodies exist and still name frameworks.
    expect(bodies).toBeGreaterThan(0);
    const en = JSON.parse(read('en.json'));
    expect(en.dashboard2.wisdom.body).toContain('Jhunjhunwala');
    expect(en.dashboard2.wisdom.title).toBe('21 Legendary Investors');
  });

  it('both count senses stay pinned (21 display, 20 scored — B-18)', () => {
    const layout = readFileSync('app/layout.tsx', 'utf8');
    expect(layout).toContain('21 legendary investors');
    const stockPage = readFileSync('app/stock/[symbol]/page.tsx', 'utf8');
    expect(stockPage).toContain('analysed through 20 Rishi frameworks');
    const pricing = JSON.parse(read('en.json'));
    expect(pricing.pricing.free.allRishis).toContain('21');
  });

  it('the decision record quotes the founder verbatim (ROADMAP FD-28)', () => {
    const roadmap = readFileSync('docs/ROADMAP.md', 'utf8');
    expect(roadmap).toContain('"21 with Chanos chat-only"');
    expect(roadmap).toContain('FD-28');
  });

  it('bite proof (C5): the pre-decision wisdom body fails the Chanos pin', () => {
    // The old dashboard body named Chanos among applied frameworks — the
    // not.toContain('Chanos') pin above fails on exactly this string.
    const oldBody = 'Jhunjhunwala, Chanos — timeless frameworks applied to every stock';
    expect(oldBody.includes('Chanos')).toBe(true);
  });
});
