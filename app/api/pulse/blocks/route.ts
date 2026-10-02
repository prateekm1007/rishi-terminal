import { NextResponse } from 'next/server';
import { nseBlockDealsSchema, type NseBlockDeal } from '@/lib/validation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://www.nseindia.com/api/block-deal', {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/',
        'Origin': 'https://www.nseindia.com',
      },
    });

    if (!res.ok) throw new Error('NSE block-deal HTTP ' + res.status);

    // R4: trust boundary — validate NSE's payload shape before use.
    const parsed = nseBlockDealsSchema.safeParse(await res.json());
    if (!parsed.success) {
      throw new Error('NSE block-deal schema mismatch: ' + parsed.error.issues[0]?.message);
    }
    const raw: NseBlockDeal[] = parsed.data.data ?? [];
    const timestamp: string = parsed.data.timestamp ?? new Date().toISOString();

    const deals = raw.slice(0, 20).map((d) => {
      const qty   = d.totalTradedVolume ?? 0;
      const price = d.lastPrice ?? 0;
      const value = parseFloat(((qty * price) / 1e7).toFixed(2)); // in Cr

      const pchange = d.pchange ?? 0;
      const side =
        pchange > 0 ? 'BUY' :
        pchange < 0 ? 'SELL' : 'BUY';

      const time = d.lastUpdateTime
        ? d.lastUpdateTime.split(' ')[1]?.slice(0, 5) ?? '--:--'
        : '--:--';

      return {
        time,
        symbol:   d.symbol ?? '',
        name:     d.symbol ?? '',
        quantity: qty,
        price,
        value,
        change:   d.change ?? 0,
        changePct: pchange,
        side,
        series:   d.series ?? '',
      };
    }).filter(d => d.symbol && d.value > 0);

    return NextResponse.json(
      {
        deals,
        count: deals.length,
        timestamp,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } }
    );

  } catch (err) {
    // Rule 10 (R9 §18): generic outward, detailed inward — the previous body
    // leaked `detail: String(err)` (upstream exception text) to the client.
    console.error('[/api/pulse/blocks] fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch block deals' },
      { status: 500 }
    );
  }
}
