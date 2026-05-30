export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice } from '@/lib/livePrice';

const DEFAULT_SYMBOLS = [
  'NIFTY50', 'SENSEX', 'BANK_NIFTY',
  'BTC', 'ETH', 'SOL', 'BNB',
  'GOLD', 'SILVER', 'WTI', 'BRENT',
  'USD/INR', 'EUR/INR', 'GBP/INR',
  'TCS', 'RELIANCE', 'INFY', 'WIPRO',
];

export async function GET(req: NextRequest) {
  try {
    const prices: Record<string, any> = {};

    const results = await Promise.allSettled(
      DEFAULT_SYMBOLS.map(sym => fetchLivePrice(sym))
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        prices[DEFAULT_SYMBOLS[i]] = result.value;
      }
    });

    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[/api/prices] error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
