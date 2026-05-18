import { NextRequest, NextResponse } from 'next/server';
import { fetchBulkNSEPrices } from '@/lib/nse/bulkFetch';
import { fetchLivePrice } from '@/lib/livePrice';

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }

    if (symbols.length > 1000) {
      return NextResponse.json({ error: 'Max 1000 symbols' }, { status: 400 });
    }

    const prices: Record<string, any> = {};
    const t0 = Date.now();

    // Step 1: Bulk NSE fetch (covers ~800 stocks in ~3s, cached 60s)
    const bulk = await fetchBulkNSEPrices();
    const missing: string[] = [];

    for (const sym of symbols) {
      const hit = bulk[sym];
      if (hit) {
        prices[sym] = {
          price: hit.price,
          change: hit.change,
          changePercent24h: hit.change,
          volume24h: hit.volume,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        missing.push(sym);
      }
    }

    // Step 2: Individual fallback for unmatched symbols
    // (crypto, forex, bonds, commodities, or small-cap not in any index)
    if (missing.length > 0) {
      const cap = Math.min(missing.length, 200);
      const toFetch = missing.slice(0, cap);

      const settled = await Promise.allSettled(
        toFetch.map((s) => fetchLivePrice(s)),
      );

      settled.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          prices[toFetch[i]] = r.value;
        }
      });
    }

    const ms = Date.now() - t0;
    console.log(
      '[batch] ' +
        Object.keys(prices).length + '/' + symbols.length +
        ' in ' + ms + 'ms' +
        ' (bulk=' + Object.keys(bulk).length +
        ', fallback=' + missing.length + ')',
    );

    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=30' },
    });
  } catch (error) {
    console.error('[/api/prices/batch] error:', error);
    return NextResponse.json(
      { error: 'Batch fetch failed' },
      { status: 500 },
    );
  }
}