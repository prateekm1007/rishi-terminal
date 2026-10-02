import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { STOCKS } from '@/data/stocks';
import { normalizeSymbolInput } from '@/lib/registry/validateInput'; // R5: unified input gate (registry + aliases)
import { getStockScore } from '@/lib/scoring';
import { sanitizeConsensus } from '@/lib/consensus/sanitize';
import { buildEliteKnowledgeGraph } from '@/lib/consensus/eliteGraph';

/**
 * R3 + Commit M3 (founder decision 2026-10-02 — every feature free):
 * per-Rishi verdicts are served ONLY from this server route.
 *
 * - Anonymous callers get 401 — the route exists for signed-in client
 *   surfaces (lab tabs) that upgrade their list-row summary slice to the
 *   full verdict set on demand; the PUBLIC per-symbol surface is the stock
 *   page RSC, which now embeds the FULL verdict set for everyone. Auth here
 *   is abuse control (per-request compute), never a paywall.
 * - The response contains EVERY verdict — the tier-visibility slice is
 *   gone. There is no locked remainder to tease or upsell.
 * - The identity comes from getSessionUser() (server-resolved); nothing
 *   about the caller changes the content of this response.
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
  const sanitized = sanitizeConsensus(consensus);

  // N1 (round 3): the knowledge graph is built here on the server — the
  // engine never runs client-side, so callers receive the computed graph
  // instead of recomputing it.
  return NextResponse.json({
    symbol: key,
    totalRishis: consensus.scores.length,
    ...sanitized,
    knowledgeGraph: buildEliteKnowledgeGraph(stock, sanitized.verdicts),
  });
}
