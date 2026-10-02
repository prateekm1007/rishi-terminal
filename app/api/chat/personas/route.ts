import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getChatPersonas } from '@/lib/chat/personaAccess';

/**
 * R3 + Commit M3: chat persona availability is decided SERVER-side, and
 * under the free-access product (founder decision 2026-10-02) every
 * authenticated caller receives the SAME full roster — the canonical
 * registry, with no tier filtering. The roster itself is public marketing
 * content (bundled + shown on /rishis); what this route decides is only
 * that the caller is signed in (401 otherwise — abuse control, not a
 * tier). POST /api/chat re-validates each persona id against the same
 * canonical registry per request.
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

  const personas = getChatPersonas();
  return NextResponse.json({
    personas: personas.map((p) => ({
      id: p.id,
      name: p.name,
      fullName: p.fullName,
      emoji: p.emoji,
      color: p.color,
      rank: p.rank ?? null,
      philosophy: p.philosophy,
    })),
  });
}
