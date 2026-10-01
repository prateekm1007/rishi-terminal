import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getRishisByTier } from '@/lib/chat/personaAccess';

/**
 * R3: chat persona availability is decided SERVER-side.
 *
 * The persona roster itself is public marketing content (bundled + shown on
 * /rishis); what is tier-gated is WHICH personas a caller may converse with.
 * This route returns the caller's allowed subset resolved from their
 * server-side session tier, using the SAME canonical registry + entitlement
 * check that POST /api/chat enforces per request (audit 2026-10-02 P0 —
 * previously the two routes derived their lists from different authorities,
 * and the POST route enforced nothing).
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
      tier: p.access,
      rank: p.rank ?? null,
      philosophy: p.philosophy,
    })),
  });
}
