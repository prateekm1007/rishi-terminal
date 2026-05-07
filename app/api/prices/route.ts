import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice, fetchBatchPrices } from '../../../lib/livePrice';

export const runtime = 'edge'; // Use edge runtime for faster response
export const dynamic = 'force-dynamic'; // Never cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || [];
  const single = searchParams.get('symbol');

  try {
    if (single) {
      // Single stock request
      const price = await fetchLivePrice(single);
      
      if (!price) {
        return NextResponse.json(
          { error: 'Stock not found or market closed' },
          { status: 404 }
        );
      }

      return NextResponse.json(price, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      });
    }

    if (symbols.length > 0) {
      // Batch request (max 50 stocks)
      const limited = symbols.slice(0, 50);
      const prices = await fetchBatchPrices(limited);

      return NextResponse.json(prices, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      });
    }

    return NextResponse.json(
      { error: 'Missing symbol or symbols parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Price API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}