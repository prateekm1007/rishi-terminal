import { NextRequest, NextResponse } from 'next/server';
import { STOCKS, SEED_STATUS, SEED_CAPTURED_AT } from '@/data/stocks';
import { normalizeSymbolInput } from '@/lib/registry/validateInput'; // R5: unified input gate

/**
 * N1 (round 3): single-symbol free display record.
 *
 * The seed dataset is server-only, so client surfaces that need ONE
 * stock's full display record (the chat fallback context) fetch it here
 * instead of importing STOCKS. This is the same data /stock/[symbol]
 * already embeds in its RSC props — free display fields, never the
 * per-Rishi verdicts (those stay behind the tier-gated
 * GET /api/rishis/[symbol]).
 *
 * R5: symbol validated through the registry gate (aliases resolved).
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const key = normalizeSymbolInput(symbol);
  if (!key) {
    return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 });
  }
  const stock = STOCKS[key];
  if (!stock) {
    return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 });
  }

  return NextResponse.json(
    {
      stock,
      seedStatus: SEED_STATUS,
      seedCapturedAt: SEED_CAPTURED_AT,
    },
    {
      headers: {
        // The record is a build-time constant per symbol: safe to cache
        // hard at the edge until the dataset itself changes.
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
