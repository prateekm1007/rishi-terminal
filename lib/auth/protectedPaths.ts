/**
 * The single list of page paths that still require a signed-in session
 * (proxy.ts redirect). Extracted as a pure module so the redirect contract
 * is unit-testable without spinning the Supabase proxy client.
 *
 * Founder decision 2026-10-03: the Portfolio Lab (/lab) works WITHOUT
 * sign-in — its data is browser-local (lib/portfolio, lib/watchlist), so
 * there is nothing to authenticate. /alerts keeps its gate (out of scope
 * for that decision). '/portfolio' is not listed either: no such route
 * exists (the lab lives at /lab), and protecting a dead path only
 * converts an honest 404 into a sign-in wall.
 */
export const PROTECTED_PATHS: readonly string[] = ['/alerts'];

/**
 * R9 path-segment matching: '/alerts' must not also swallow '/alerts-foo'.
 * Query strings are decided by the caller (proxy passes pathname only).
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  );
}
