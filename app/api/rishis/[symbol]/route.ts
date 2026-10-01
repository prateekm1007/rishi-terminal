import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { STOCKS } from '@/data/stocks';
import { normalizeSymbolInput } from '@/lib/registry/validateInput'; // R5: unified input gate (registry + aliases)
import { getStockScore } from '@/lib/scoring';
import { sanitizeConsensus } from '@/lib/consensus/sanitize';
import { buildEliteKnowledgeGraph } from '@/lib/consensus/eliteGraph';
import { TIER_CONFIG } from '@/lib/premium';

/**
 * R3: per-Rishi verdicts are served ONLY from this server route.
 *
 * - Anonymous callers get 401 (the public stock pages embed the free set
 *   server-side at build/render time; this route is for signed-in upgrades).
 * - The tier comes from getSessionUser() (server-resolved from
 *   public.users) — a client-supplied tier cannot widen the response.
 * - The response contains only the tier's verdict slice; verdicts beyond it
 *   are never serialized.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to view Rishi verdicts' },
      { status: 401 },
    );
  }

  const key = normalizeSymbolInput(symbol);
  if (!key) {
    return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 });
  }
  const stock = STOCKS[key];
  if (!stock) {
    return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 });
  }

  const consensus = getStockScore(stock);
  const visibleCount = TIER_CONFIG[user.tier].rishisVisible;
  const sanitized = sanitizeConsensus(consensus, visibleCount);

  // N1 (round 3): the knowledge graph is rebuilt here for the caller's
  // tier — the engine no longer runs client-side, so paid users receive
  // their richer graph from this response instead of recomputing it.
  return NextResponse.json({
    symbol: key,
    tier: user.tier,
    totalRishis: consensus.scores.length,
    ...sanitized,
    knowledgeGraph: buildEliteKnowledgeGraph(stock, sanitized.verdicts),
  });
}
