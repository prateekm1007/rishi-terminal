import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice } from '@/lib/livePrice';

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }

    if (symbols.length > 200) {
      return NextResponse.json({ error: 'Max 200 symbols' }, { status: 400 });
    }

    const prices: Record<string, any> = {};

    const results = await Promise.allSettled(
      symbols.map(sym => fetchLivePrice(sym))
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        prices[symbols[i]] = result.value;
      }
    });

    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=30' },
    });
  } catch (error) {
    console.error('[/api/prices/batch] error:', error);
    return NextResponse.json({ error: 'Batch fetch failed' }, { status: 500 });
  }
}
