import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath } from '@/lib/auth/protectedPaths';
import { resolveTickerSymbol } from '@/lib/registry/registryAudit';

/**
 * Next.js 16 proxy (the file convention formerly known as middleware).
 *
 * Refreshes the Supabase auth session on every matched request so that
 * server components and route handlers always see valid cookies.
 * Verified against node_modules/next/dist/docs: in Next.js 16 the
 * `middleware` file convention is deprecated and renamed to `proxy`.
 */
export async function proxy(request: NextRequest) {
  // ── U5 (founder round 6): unknown stock symbols return a REAL 404. ──
  // The page component calls notFound(), but the segment's loading.tsx
  // streams the shell first and a streamed notFound() cannot change the
  // status (Next.js docs, loading.md "Status Codes": "ensure the resource
  // exists before the response body is streamed ... run this check in
  // proxy"). The security master is an in-memory Set over the seed
  // registry — an O(1) check, no upstream fetch (docs: "keep proxy checks
  // fast"). Alias forms pass through so the page's 308 canonical redirect
  // stays the single redirect authority.
  const pathname = request.nextUrl.pathname;
  const stockMatch = /^\/stock\/([^/]+)$/.exec(pathname);
  if (stockMatch) {
    const key = decodeURIComponent(stockMatch[1]).toUpperCase();
    if (key.length > 25 || (key.length >= 2 && !resolveTickerSymbol(key))) {
      return new NextResponse(null, { status: 404 });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured (e.g. preview builds) — pass through untouched.
  if (!url || !anonKey) return supabaseResponse;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and supabase.auth.getUser()
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes: signed-out users are sent to sign-in.
  // R9: match on PATH SEGMENTS — a prefix like '/alerts' must not also
  // match '/alerts-foo', redirecting legitimate public pages.
  // Founder decision 2026-10-03: /lab is PUBLIC (the Portfolio Lab is
  // browser-local data; no sign-in required) — see lib/auth/protectedPaths.
  const isProtected = isProtectedPath(pathname);
  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/signin';
    // Round-5 audit (finding 20): preserve the QUERY STRING too —
    // /compare -> /lab?tab=compare used to become next=/lab and the tab
    // was lost after login. safeNextPath (R7) allows same-origin
    // relative paths with query strings, so '?tab=compare' survives.
    redirectUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon.ico and static files with extensions
     * - api/ingest (cron-authenticated, cookie handling unnecessary)
     * - api/payment/webhook (R9-era exclusion, kept for the retired route:
     *   the 410 responder needs no session cookies and no
     *   supabase.auth.getUser() round-trip on any delivery)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/ingest|api/payment/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
