import { describe, it, expect } from 'vitest';
import nextConfig from '../next.config';

/**
 * Audit retest 2026-10-02, finding A.1:
 * `upgrade-insecure-requests` was carried inside the Content-Security-Policy
 * Report-Only policy. Per spec the directive is ignored in report-only mode,
 * and Chrome logs a console error for it on EVERY pageview
 * ("The Content Security Policy directive 'upgrade-insecure-requests' is
 * ignored when delivered in a report-only policy") — the sole console error
 * on the whole site, capping Lighthouse best-practices at 96.
 *
 * Fix: drop it from Report-Only; keep it on the small ENFORCED CSP instead
 * (the site is HTTPS-only with HSTS preload, so enforcing the upgrade is
 * belt-and-braces and cannot break anything).
 */
// next.config.ts now exports through the bundle-analyzer wrapper whose
// TS type is opaque at this boundary; at runtime (ANALYZE unset) it is the
// plain NextConfig object. Narrow once here.
const cfg = nextConfig as unknown as {
  headers: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
};
const applied = await cfg.headers();

// next.config's inferred Header type unions in irrelevant shapes; at runtime
// every entry is a flat { key, value: string } pair. Narrow once at the boundary.
const headerPairs = (applied.find((e: { source: string }) => e.source === '/:path*')
  ?.headers ?? []) as { key: string; value: string }[];

describe('next.config.ts security headers', () => {
  it('applies a header set to every path', () => {
    expect(applied.some((e: { source: string }) => e.source === '/:path*')).toBe(true);
    expect(headerPairs.length).toBeGreaterThan(0);
  });

  it('enforced CSP keeps frame-ancestors none (regression guard, T9)', () => {
    const enforced =
      headerPairs.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
    expect(enforced).toContain("frame-ancestors 'none'");
  });

  it('upgrade-insecure-requests is NOT delivered in the Report-Only policy (A.1)', () => {
    const reportOnly =
      headerPairs.find(h => h.key === 'Content-Security-Policy-Report-Only')?.value ?? '';
    // The directive is spec-ignored in report-only and consoles an error per pageview.
    expect(reportOnly).not.toContain('upgrade-insecure-requests');
  });

  it('upgrade-insecure-requests is ENFORCED (belt-and-braces, site is HSTS-preloaded)', () => {
    const enforced =
      headerPairs.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
    expect(enforced).toContain('upgrade-insecure-requests');
  });
});
