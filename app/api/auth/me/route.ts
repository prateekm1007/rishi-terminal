import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

/**
 * GET /api/auth/me — the SERVER's view of the caller.
 *
 * The tier comes from public.users (via getSessionUser), never from any
 * client-supplied value. Anonymous callers get { user: null } so the client
 * can distinguish "signed out" from "error".
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null, tier: 'seeker' });
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email },
    tier: user.tier,
    tierExpiresAt: user.tierExpiresAt,
  });
}
