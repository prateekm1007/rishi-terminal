import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * RULES-3 (founder order, 12 Oct 2026): one wording everywhere —
 * "21 Rishis: 20 scored, Jim Chanos chat-only". Replaces the "All 21"
 * bullets (8 locales) and the "All 20" / "VIEW ALL 20" labels.
 *
 * Fail-first record: RED on the pre-wording tree (old bullets + old
 * labels present) -> GREEN after the replacement. Raw outputs ride the
 * round-51 evidence file.
 */
const WORDING = '21 Rishis: 20 scored, Jim Chanos chat-only';

const LOCALES = readdirSync('messages').filter((f) => f.endsWith('.json'));
const read = (f: string) => readFileSync(`messages/${f}`, 'utf8');
const parsed = (f: string) => JSON.parse(read(f));

// Message paths that must carry the one wording (where the key exists;
// fallback locales without the key follow en).
const WORDING_PATHS: Array<(m: Record<string, unknown>) => unknown> = [
  (m) => (m.pricing as Record<string, unknown>)?.free &&
    ((m.pricing as Record<string, { allRishis?: unknown }>).free.allRishis),
  (m) => (m.stock as Record<string, unknown>)?.wisdomDesc,
  (m) => (m.stock as Record<string, unknown>)?.viewAll20,
  (m) => (m.asset as Record<string, unknown>)?.viewAll20,
];

// Retired count wordings — gone from every catalog.
const BANNED: RegExp[] = [
  /All 21 Rishis/,
  /VIEW ALL 20/,
  /View All 20/,
  /All 20 Philosopher Scores/,
];

describe('RULES-3 — one Rishi-count wording everywhere', () => {
  it('the one wording on every count surface, in every locale that carries the key', () => {
    let pinned = 0;
    for (const f of LOCALES) {
      const m = parsed(f);
      for (const get of WORDING_PATHS) {
        const v = get(m);
        if (typeof v !== 'string') continue;
        pinned++;
        expect(v, `${f}: count wording is not the one wording`).toContain(WORDING);
      }
    }
    // Positive control (B-18): the keys exist — an empty sweep proves nothing.
    expect(pinned).toBeGreaterThan(20);
  });

  it('no retired count wording in any catalog', () => {
    for (const f of LOCALES) {
      const src = read(f);
      for (const pat of BANNED) {
        expect(src, `${f}: retired wording ${pat} still present`).not.toMatch(pat);
      }
    }
  });

  it('bite proof (C5): the old wordings fail these pins', () => {
    expect('All 21 Rishis — every persona, every framework').not.toContain(WORDING);
    expect('VIEW ALL 20').not.toContain(WORDING);
  });
});
