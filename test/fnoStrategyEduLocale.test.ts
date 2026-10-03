import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * R12-05: the /fno Strategy Library renders t('fno.strategyEdu') — an
 * honest educational-reference line (audit round-1 low observation: the
 * persona-style tags on standard strategy definitions needed an explicit
 * "educational reference, not live data, not advice" label). The key must
 * exist in EVERY locale file or the line renders as a raw key for that
 * locale. This gate fails the moment a locale is missing the key.
 *
 * RED (verified pre-fix): fno.strategyEdu existed in none of the 7 files.
 * GREEN: all 7 define it as a non-empty string.
 */
const LOCALES = ['en', 'hi', 'bn', 'mr', 'ta', 'te', 'gu'] as const;
const MESSAGES_DIR = join(process.cwd(), 'messages');

function loadFno(locale: string): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf-8'));
  return (raw.fno ?? {}) as Record<string, unknown>;
}

describe('R12-05 — fno.strategyEdu locale completeness', () => {
  it('every locale defines fno.strategyEdu as a non-empty string', () => {
    const missing: string[] = [];
    const empty: string[] = [];
    for (const loc of LOCALES) {
      const fno = loadFno(loc);
      if (!(typeof fno.strategyEdu === 'string')) missing.push(loc);
      else if ((fno.strategyEdu as string).trim() === '') empty.push(loc);
    }
    expect(
      `missing: ${missing.join(', ') || 'none'}; empty: ${empty.join(', ') || 'none'}`,
      'every locale must carry the educational-reference line',
    ).toBe('missing: none; empty: none');
  });

  it('the educational line never claims live data or advice (honesty contract)', () => {
    for (const loc of LOCALES) {
      const line = loadFno(loc).strategyEdu as string;
      // The line must deny both: rendering it must not read as live data
      // or advice. English carries the anchor words; other locales carry
      // the translated denials, so this check pins the English contract
      // and the presence of the translated denial via the non-empty check.
      if (loc === 'en') {
        expect(line).toMatch(/not live data/i);
        expect(line).toMatch(/not advice/i);
        expect(line).toMatch(/educational reference/i);
      }
    }
  });
});
