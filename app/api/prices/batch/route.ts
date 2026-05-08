import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice } from '../../../../lib/livePrice';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { symbols } = await request.json();
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }
    
    const prices: Record<string, any> = {};
    const results = await Promise.allSettled(
      symbols.slice(0, 200).map(async (symbol: string) => {
        try {
          const price = await Promise.race([
            fetchLivePrice(symbol),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
          ]);
          return { symbol, price };
        } catch (e) {
          return { symbol, price: null };
        }
      })
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.price) {
        const p = result.value.price;
        prices[result.value.symbol] = {
          price:            p.price,
          change:           p.change,
          changePercent24h: p.changePercent24h ?? p.change,  // Fallback for compatibility
          volume24h:        p.volume24h || 0,
          lastUpdated:      p.lastUpdated,
        };
      }
    });
    
    return NextResponse.json(prices, {
      headers: { 
        'Cache-Control': 'public, s-maxage=30',
        'Content-Type': 'application/json' 
      },
    });
  } catch (error) {
    console.error('[batch prices]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}