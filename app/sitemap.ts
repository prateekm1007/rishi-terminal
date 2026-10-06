import type { MetadataRoute } from 'next';
import { STOCKS } from '../data/stocks';
import { CRYPTO_ASSETS } from '../data/crypto';
import { COMMODITIES_DATA } from '../data/commodities';
import { INDIAN_INDEXES, GLOBAL_INDEXES } from '../data/indexes';
import { SITE_URL } from '../lib/seo/site';

/**
 * Audit 2026-10-01 M6 (retest 2026-10-02 confirmed open): /sitemap.xml 404'd
 * — the 916 stock pages, market detail pages and guru surface were
 * uncrawlable-by-sitemap (they were reachable only via /screener SSR links).
 * Served at /sitemap.xml by the App Router convention (see
 * node_modules/next/dist/docs/.../metadata/sitemap.md).
 *
 * lastModified honesty: every entry below is prerendered at build time, so
 * the build timestamp IS when this URL's HTML was generated — that is the
 * truthful lastmod for a static deployment (the seed dataset itself has no
 * provable capture date; SEED_CAPTURED_AT is null by design, see
 * data/stocks/seedMeta.ts). Generated once per build, cached like any other
 * static route; no request-time APIs are used.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const generatedAt = new Date();

  const staticPages: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' },
    { path: '/stocks', priority: 0.9, changeFrequency: 'daily' },
    { path: '/rishis', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/news', priority: 0.7, changeFrequency: 'daily' },
    { path: '/pulse', priority: 0.7, changeFrequency: 'daily' },
    { path: '/crypto', priority: 0.7, changeFrequency: 'daily' },
    { path: '/forex', priority: 0.6, changeFrequency: 'daily' },
    { path: '/commodities', priority: 0.6, changeFrequency: 'daily' },
    { path: '/bonds', priority: 0.6, changeFrequency: 'daily' },
    { path: '/pricing', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return [
    ...staticPages.map(p => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: generatedAt,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),

    // Every stock page in the canonical universe (aliases are not listed —
    // /stock/BAJAJ_AUTO 308-redirects to the canonical symbol, and each
    // page carries rel=canonical, so there is exactly one indexable URL
    // per company).
    ...Object.values(STOCKS).map(stock => ({
      // Follow-up fix (PR #41 acceptance): NSE symbols can carry & (J&KBANK,
      // M&M, M&MFIN). A raw & in <loc> makes the whole sitemap fail XML
      // parsing — percent-encode every symbol; it is identity for the rest
      // and the encoded URL serves the identical page (verified: both
      // /stock/J%26KBANK and /stock/J&KBANK return the same 200 HTML).
      url: `${SITE_URL}/stock/${encodeURIComponent(stock.symbol)}`,
      lastModified: generatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),

    // Market detail pages.
    ...CRYPTO_ASSETS.map(a => ({
      url: `${SITE_URL}/crypto/${encodeURIComponent(a.symbol)}`,
      lastModified: generatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...COMMODITIES_DATA.map(c => ({
      url: `${SITE_URL}/commodities/${encodeURIComponent(c.symbol)}`,
      lastModified: generatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...[...INDIAN_INDEXES, ...GLOBAL_INDEXES].map(i => ({
      url: `${SITE_URL}/index/${encodeURIComponent(i.symbol)}`,
      lastModified: generatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
