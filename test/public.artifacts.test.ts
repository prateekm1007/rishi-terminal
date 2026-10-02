import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(process.cwd(), 'public');

/**
 * Audit retest 2026-10-02, finding B.2:
 * public/favicon-generator.html — a developer tooling page — was shipping to
 * production (HTTP 200 on the live deployment). public/ is deploy surface:
 * only assets the app actually references belong there.
 */
describe('public/ ships no developer tooling pages', () => {
  it('favicon-generator.html is absent from the deploy surface', () => {
    expect(
      existsSync(join(publicDir, 'favicon-generator.html')),
      'public/favicon-generator.html exists — dev artifact on the public surface'
    ).toBe(false);
  });
});

/**
 * Guard the one favicon the app actually serves. Next.js App Router serves
 * it from app/favicon.ico (the file convention), not public/.
 */
describe('referenced public assets exist', () => {
  it('app/favicon.ico exists and is a real ICO', () => {
    const p = join(process.cwd(), 'app', 'favicon.ico');
    expect(existsSync(p)).toBe(true);
    const buf = readFileSync(p);
    // ICO magic: 00 00 01 00 (reserved, type=1 icon directory)
    expect(buf[0]).toBe(0x00);
    expect(buf[1]).toBe(0x00);
    expect(buf[2]).toBe(0x01);
    expect(buf[3]).toBe(0x00);
  });
});
