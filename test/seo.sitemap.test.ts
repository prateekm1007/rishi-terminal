import { describe, it, expect } from 'vitest';
import sitemap from '../app/sitemap';
import { STOCKS } from '../data/stocks';
import { CRYPTO_ASSETS } from '../data/crypto';
import { COMMODITIES_DATA } from '../data/commodities';
import { INDIAN_INDEXES, GLOBAL_INDEXES } from '../data/indexes';
import { SITE_URL } from '../lib/seo/site';

/**
 * Audit 2026-10-01 M6 (retest 2026-10-02 confirmed open): no sitemap.xml —
 * /stock/[symbol] (916 pages), gurus and market pages were
 * uncrawlable-by-sitemap. app/sitemap.ts is the App Router convention that
 * serves /sitemap.xml at build time.
 */
describe('app/sitemap.ts (served at /sitemap.xml)', () => {
  const entries = sitemap();
  const urls = entries.map(e => e.url);

  it('every URL is absolute on the production origin', () => {
    for (const u of urls) {
      expect(u.startsWith(`${SITE_URL}/`), `not absolute on site origin: ${u}`).toBe(true);
    }
  });

  it('every URL is unique', () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('covers every stock page in the universe (all 916 symbols)', () => {
    const symbols = Object.keys(STOCKS);
    expect(symbols.length).toBeGreaterThanOrEqual(900); // 916 at round-5 close
    for (const s of symbols) {
      expect(urls, `missing /stock/${s}`).toContain(`${SITE_URL}/stock/${s}`);
    }
  });

  it('covers the static market surfaces', () => {
    for (const p of ['/', '/screener', '/rishis', '/news', '/pulse', '/bonds', '/crypto', '/forex', '/commodities', '/pricing', '/terms', '/privacy']) {
      expect(urls, `missing ${p}`).toContain(`${SITE_URL}${p}`);
    }
  });

  it('covers the market detail pages (crypto, commodities, indexes)', () => {
    for (const a of CRYPTO_ASSETS) {
      expect(urls).toContain(`${SITE_URL}/crypto/${a.symbol}`);
    }
    for (const c of COMMODITIES_DATA) {
      expect(urls).toContain(`${SITE_URL}/commodities/${c.symbol}`);
    }
    for (const i of [...INDIAN_INDEXES, ...GLOBAL_INDEXES]) {
      expect(urls).toContain(`${SITE_URL}/index/${i.symbol}`);
    }
  });

  it('never exposes gated or API routes', () => {
    const forbidden = urls.filter(u => /\/(api|lab|alerts|auth)(\/|$)/.test(u));
    expect(forbidden).toEqual([]);
  });

  it('every entry carries lastModified, changeFrequency and priority', () => {
    for (const e of entries) {
      expect(e.lastModified, `${e.url} missing lastModified`).toBeInstanceOf(Date);
      expect(e.changeFrequency, `${e.url} missing changeFrequency`).toBeTruthy();
      expect(typeof e.priority).toBe('number');
      expect(e.priority).toBeGreaterThan(0);
      expect(e.priority).toBeLessThanOrEqual(1);
    }
  });

  it('aliases are NOT listed (canonical symbols only — /stock/BAJAJ_AUTO 308s)', () => {
    expect(urls.some(u => u.includes('BAJAJ_AUTO'))).toBe(false);
  });
});
