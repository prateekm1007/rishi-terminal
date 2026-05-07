import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice } from '../../../lib/livePrice';

export const dynamic = 'force-dynamic'; // Never cache

export async function GET(request: NextRequest) {
  try {
    const prices: Record<string, any> = {};
    
    // Crypto: BTC, ETH, SOL, BNB
    const cryptoFetches = [
      { key: 'BTC', symbol: 'BTC=F' },
      { key: 'ETH', symbol: 'ETH=F' },
      { key: 'SOL', symbol: 'SOL=F' },
      { key: 'BNB', symbol: 'BNB=F' },
    ];
    
    // Forex: USD/INR, EUR/INR, GBP/INR, JPY/INR
    const forexFetches = [
      { key: 'INR', symbol: 'USD/INR' },
      { key: 'EUR_INR', symbol: 'EUR/INR' },
      { key: 'GBP_INR', symbol: 'GBP/INR' },
      { key: 'JPY_INR', symbol: 'JPY/INR' },
    ];
    
    // Commodities: GOLD, SILVER, CRUDE, NAT GAS
    const commodityFetches = [
      { key: 'GOLD', symbol: 'GC=F' },
      { key: 'SILVER', symbol: 'SI=F' },
      // CRUDE and NAT GAS - we'll use mock for now as APIs are limited
    ];
    
    // Fetch all in parallel
    const allFetches = [...cryptoFetches, ...forexFetches, ...commodityFetches];
    
    const results = await Promise.all(
      allFetches.map(async (item) => {
        try {
          const price = await fetchLivePrice(item.symbol);
          if (price) {
            return { key: item.key, price };
          }
        } catch (e) {
          console.warn(`Failed to fetch ${item.symbol}:`, e);
        }
        return null;
      })
    );
    
    results.forEach(result => {
      if (result) {
        prices[result.key] = result.price;
      }
    });
    
    // Add mock data for items we couldn't fetch
    if (!prices.CRUDE) {
      prices.CRUDE = { price: 82.60, change: -1.34, lastUpdated: new Date().toISOString() };
    }
    if (!prices.NAT_GAS) {
      prices.NAT_GAS = { price: 2.84, change: 2.10, lastUpdated: new Date().toISOString() };
    }

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Price API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}