/**
 * Single source of truth for the production origin. Consumed by
 * app/robots.ts, app/sitemap.ts and the metadata (metadataBase, canonical,
 * Open Graph urls) in app/layout.tsx — audit 2026-10-01 M6 / retest B.3.
 *
 * If the deployment origin ever changes, this constant plus the custom
 * domain is the only place to update.
 */
export const SITE_URL = 'https://rishi-terminal.vercel.app';

export const SITE_NAME = 'Rishi Terminal';
