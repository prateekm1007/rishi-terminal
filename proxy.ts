import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 proxy (the file convention formerly known as middleware).
 *
 * Refreshes the Supabase auth session on every matched request so that
 * server components and route handlers always see valid cookies.
 * Verified against node_modules/next/dist/docs: in Next.js 16 the
 * `middleware` file convention is deprecated and renamed to `proxy`.
 */
export async function proxy(request: NextRequest) {
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
  // R9: match on PATH SEGMENTS — startsWith('/lab') also matched
  // '/laboratory' and '/alerts-foo', redirecting legitimate public pages.
  const protectedPaths = ['/lab', '/portfolio', '/alerts'];
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPaths.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  );
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
     * - api/payment/webhook (R9: Razorpay server-to-server — no session
     *   cookies; the supabase.auth.getUser() round-trip was wasted latency
     *   on every webhook delivery)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/ingest|api/payment/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
