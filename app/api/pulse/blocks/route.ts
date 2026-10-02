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
    // R9 §17: the timestamp is the PROVIDER's own disclosure or null —
    // never `new Date()` dressed up as the deals' observation time (a
    // fabricated provider timestamp is a Rule 3/16 violation).
    const timestamp: string | null = parsed.data.timestamp ?? null;

    // R9 §17 (Rule 16): missing quantity/price/change/pchange are null —
    // never 0 (absent volume is not zero trading; a missing price is not a
    // ₹0 print). A deal missing qty or price cannot be VALUED and is
    // excluded below. A missing pchange manufactures NO BUY/SELL side (and
    // a genuine zero change carries no directional signal either — the
    // side is a derived direction claim, rendered only when the observation
    // discloses a direction).
    const deals = raw.slice(0, 20).map((d) => {
      const qty   = d.totalTradedVolume ?? null;
      const price = d.lastPrice ?? null;
      const value =
        qty !== null && price !== null
          ? parseFloat(((qty * price) / 1e7).toFixed(2)) // in Cr
          : null;

      const pchange = d.pchange ?? null;
      const side =
        pchange === null ? null :
        pchange > 0 ? 'BUY' :
        pchange < 0 ? 'SELL' : null;

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
        change:   d.change ?? null,
        changePct: pchange,
        side,
        series:   d.series ?? '',
      };
    }).filter(d => d.symbol && d.value !== null && (d.value as number) > 0);

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
    return NextResponse.json(
      { error: 'Failed to fetch block deals', detail: String(err) },
      { status: 500 }
    );
  }
}
