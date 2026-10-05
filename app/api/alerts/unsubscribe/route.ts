import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/alerts/unsubToken';
import { setOptedOut } from '@/lib/alerts/store';

/**
 * X3-08 (Round 16 C7): one-click unsubscribe — the acceptance requires
 * "unsubscribe link in every email; unsubscribe stops delivery".
 *
 * Stateless HMAC token (lib/alerts/unsubToken.ts): no auth, no database
 * read to verify, no user enumeration (a wrong token is just invalid).
 * On success the user's alerts_preferences.opted_out is set and every
 * future delivery is skipped (recorded 'skipped_unsubscribed' — the
 * in-app history stays honest).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  let userId: string | null = null;
  try {
    userId = verifyUnsubscribeToken(token);
  } catch {
    // Missing CRON_SECRET/ALERTS_UNSUB_SECRET — fail closed.
    return new NextResponse('Unsubscribe is not configured.', { status: 503 });
  }
  if (!userId) {
    return new NextResponse('This unsubscribe link is not valid.', { status: 400 });
  }
  try {
    await setOptedOut(userId);
    return new NextResponse(
      'You are unsubscribed from Rishi Terminal alert emails. Your alerts remain visible in the app.',
      { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  } catch (err) {
    console.error('[alerts:unsubscribe]', err);
    return new NextResponse('Could not process the unsubscribe right now — please try again.', { status: 500 });
  }
}
