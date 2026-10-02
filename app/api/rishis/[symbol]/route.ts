import { NextRequest, NextResponse } from 'next/server';
import { STOCKS } from '@/data/stocks';
import { normalizeSymbolInput } from '@/lib/registry/validateInput'; // R5: unified input gate (registry + aliases)
import { getStockScore } from '@/lib/scoring';
import { sanitizeConsensus } from '@/lib/consensus/sanitize';
import { buildEliteKnowledgeGraph } from '@/lib/consensus/eliteGraph';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * R3 + Commit M3 + Commit N1 (founder decisions 2026-10-02 — every feature
 * free; Portfolio Lab works without sign-in): per-Rishi verdicts are served
 * ONLY from this server route, to EVERY caller.
 *
 * - The response contains EVERY verdict — the tier-visibility slice is
 *   gone. There is no locked remainder to tease or upsell.
 * - The same full verdict set is public on every stock page RSC, so this
 *   route gates nothing confidential; the per-IP rate limit below is
 *   compute/abuse defense for a public, deterministic dataset.
 * - Nothing about the caller changes the content of this response.
 */
export const dynamic = 'force-dynamic';

// Per-IP rate limit (defense in depth for per-request compute). Generous
// for real Lab usage (a portfolio of ~20 holdings bursts one request per
// symbol on tab mount); fails OPEN like every abuse layer that is not
// accounting — the chat quota remains the fail-closed spend control.
const VERDICTS_IP_LIMIT = 60;
const VERDICTS_IP_WINDOW = 60;

function clientIp(req: NextRequest): string {
  // Same Vercel-documented parsing contract as the chat route (N4 round 3):
  // the platform overwrites x-forwarded-for with exactly the client's
  // public IP; parsing the LAST entry stays correct behind conventional
  // appending proxies as well.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;

  const r = await checkRateLimit(
    `rishis:verdicts:${clientIp(req)}`,
    VERDICTS_IP_LIMIT,
    VERDICTS_IP_WINDOW,
  );
  if (!r.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
