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
 * Audit retest 2026-10-02, finding B.1: every page's <head> references
 * /apple-touch-icon.png (app/layout.tsx metadata.icons.apple) but the file
 * did not exist — iOS saved a blank icon. M6 fix ships a real 180x180 PNG
 * (the apple-touch-icon convention size).
 */
describe('apple-touch-icon (referenced by every page head)', () => {
  const p = join(publicDir, 'apple-touch-icon.png');

  it('exists in public/', () => {
    expect(existsSync(p)).toBe(true);
  });

  it('is a real PNG of 180x180 (Apple touch icon convention)', () => {
    expect(existsSync(p)).toBe(true);
    const buf = readFileSync(p);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect([...buf.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR: length(4) + "IHDR" + width(4 BE) + height(4 BE)
    expect(buf.slice(12, 16).toString('ascii')).toBe('IHDR');
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(180);
    expect(height).toBe(180);
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
