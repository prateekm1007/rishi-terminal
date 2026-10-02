import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

/**
 * GET /api/auth/me — the SERVER's view of the caller.
 *
 * Commit M5 (free access): the payload carries authentication state and
 * the single access state ('free'). There is no tier and no expiry —
 * nothing about the caller's legacy database row can change what the
 * client may render, because there is nothing to gate. Anonymous callers
 * get { user: null } so the client can distinguish "signed out" from
 * "error".
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email },
    access: user.access,
  });
}
