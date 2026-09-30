import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getRishisByTier } from '@/lib/chat/personaAccess';

/**
 * R3: chat persona availability is decided SERVER-side.
 *
 * The persona roster itself is public marketing content (bundled + shown on
 * /rishis); what is tier-gated is WHICH personas a caller may converse with.
 * This route returns the caller's allowed subset resolved from their
 * server-side session tier. /api/chat independently re-enforces the same
 * allow-list per request (T7), so the UI list is UX only, never the control.
 */
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to chat with the Rishis' },
      { status: 401 },
    );
  }

  const allowed = getRishisByTier(user.tier);
  return NextResponse.json({
    tier: user.tier,
    personas: allowed.map((p) => ({
      id: p.id,
      name: p.name,
      fullName: p.fullName,
      emoji: p.emoji,
      color: p.color,
      tier: p.tier,
      philosophy: p.philosophy,
    })),
  });
}
