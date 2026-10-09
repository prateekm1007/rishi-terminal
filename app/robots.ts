import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo/site';

/**
 * Audit 2026-10-01 M6 (retest 2026-10-02 confirmed open): /robots.txt 404'd.
 * Served at /robots.txt by the App Router convention (see
 * node_modules/next/dist/docs/.../metadata/robots.md).
 *
 * Policy:
 * - Public surfaces (stock pages, screener, markets, gurus) are all allowed.
 * - /api/ is excluded: JSON endpoints are not crawlable content and hitting
 *   them wastes crawl budget (some are also upstream-scraping surfaces).
 * - /lab and /alerts are auth-gated (proxy redirects signed-out users to
 *   sign-in) — crawling them can only ever index a redirect.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/lab', '/alerts', '/evidence-fixtures'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
