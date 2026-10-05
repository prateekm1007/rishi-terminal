import { NextResponse } from 'next/server';
import { getChatPersonas } from '@/lib/chat/personaAccess';

/**
 * R3 + Commit M3: chat persona availability is decided SERVER-side, and
 * under the free-access product it is no longer a gate at all: the roster
 * served here is the canonical registry with NO tier filtering (founder
 * decision 2026-10-02) and NO sign-in requirement (founder decision
 * 2026-10-02 — the roster is public marketing content, also rendered on
 * /rishis). POST /api/chat re-validates each persona id against the same
 * canonical registry per request; abuse is bounded there by quota/burst,
 * not by hiding the roster.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
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
