import { describe, it, expect } from 'vitest';
import robots from '../app/robots';
import { SITE_URL } from '../lib/seo/site';

/**
 * Audit 2026-10-01 M6 (retest 2026-10-02 confirmed fully open): the site had
 * no robots.txt — it 404'd. For a product whose roadmap gates growth (G7) on
 * discoverability, zero crawler infrastructure. app/robots.ts is the App
 * Router convention that serves /robots.txt.
 */
describe('app/robots.ts (served at /robots.txt)', () => {
  const doc = robots();

  it('references the sitemap (absolute URL)', () => {
    expect(doc.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('allows public pages for all crawlers', () => {
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    const all = rules.find(r =>
      r.userAgent === '*' || (Array.isArray(r.userAgent) && r.userAgent.includes('*'))
    );
    expect(all?.allow).toContain('/');
  });

  it('keeps crawlers out of the JSON API surface', () => {
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    const all = rules.find(r =>
      r.userAgent === '*' || (Array.isArray(r.userAgent) && r.userAgent.includes('*'))
    );
    const disallow = all?.disallow ?? [];
    const disallowList: string[] = Array.isArray(disallow) ? disallow : [disallow];
    expect(disallowList.some(d => d.startsWith('/api'))).toBe(true);
  });

  it('keeps crawlers out of the auth-gated routes (/lab, /alerts)', () => {
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    const all = rules.find(r =>
      r.userAgent === '*' || (Array.isArray(r.userAgent) && r.userAgent.includes('*'))
    );
    const disallow = all?.disallow ?? [];
    const disallowList: string[] = Array.isArray(disallow) ? disallow : [disallow];
    expect(disallowList).toContain('/lab');
    expect(disallowList).toContain('/alerts');
  });

  it('does NOT disallow any public stock/screener surface', () => {
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    const disallow = rules.flatMap(r => r.disallow ?? []);
    const bannedPublic = ['/stocks', '/stock', '/rishis', '/news', '/crypto', '/bonds'];
    for (const b of bannedPublic) {
      expect(disallow.some(d => d === b || d.startsWith(b + '/')), `unexpectedly disallowed: ${b}`).toBe(false);
    }
  });
});
