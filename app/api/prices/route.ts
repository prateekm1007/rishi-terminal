import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrice } from '../../../lib/livePrice';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const prices: Record<string, any> = {};
    
    // All symbol fetches
    const allSymbols = [
      // CRYPTO
      { key: 'BTC', symbol: 'BTC' },
      { key: 'ETH', symbol: 'ETH' },
      { key: 'SOL', symbol: 'SOL' },
      { key: 'BNB', symbol: 'BNB' },
      
      // FOREX
      { key: 'INR', symbol: 'USD/INR' },
      { key: 'EUR_INR', symbol: 'EUR/INR' },
      { key: 'GBP_INR', symbol: 'GBP/INR' },
      { key: 'JPY_INR', symbol: 'JPY/INR' },
      
      // COMMODITIES
      { key: 'GOLD', symbol: 'GOLD' },
      { key: 'SILVER', symbol: 'SILVER' },
      { key: 'CRUDE', symbol: 'CRUDE' },
      { key: 'NAT_GAS', symbol: 'NAT_GAS' },
      
      // BONDS
      { key: 'IN_10Y', symbol: 'IN_10Y' },
      { key: 'IN_2Y', symbol: 'IN_2Y' },
      { key: 'US_10Y', symbol: 'US_10Y' },
      { key: 'US_30Y', symbol: 'US_30Y' },
      
      // TOP 20 STOCKS (most commonly searched)
      { key: 'TCS', symbol: 'TCS' },
      { key: 'INFY', symbol: 'INFY' },
      { key: 'RELIANCE', symbol: 'RELIANCE' },
      { key: 'HDFC', symbol: 'HDFC' },
      { key: 'ICICI', symbol: 'ICICI' },
      { key: 'SBIN', symbol: 'SBIN' },
      { key: 'WIPRO', symbol: 'WIPRO' },
      { key: 'ITC', symbol: 'ITC' },
      { key: 'BAJAJFINSV', symbol: 'BAJAJFINSV' },
      { key: 'LT', symbol: 'LT' },
      { key: 'ASIANPAINT', symbol: 'ASIANPAINT' },
      { key: 'MARUTI', symbol: 'MARUTI' },
      { key: 'HDFCBANK', symbol: 'HDFCBANK' },
      { key: 'AXIS', symbol: 'AXIS' },
      { key: 'BHARTIARTL', symbol: 'BHARTIARTL' },
      { key: 'SUNPHARMA', symbol: 'SUNPHARMA' },
      { key: 'TITAN', symbol: 'TITAN' },
      { key: 'NESTLEIND', symbol: 'NESTLEIND' },
      { key: 'POWERGRID', symbol: 'POWERGRID' },
      { key: 'ULTRACEMCO', symbol: 'ULTRACEMCO' },
    ];
    
    // Fetch all in parallel with timeout protection
    const results = await Promise.allSettled(
      allSymbols.map(async (item) => {
        try {
          const price = await Promise.race([
            fetchLivePrice(item.symbol),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 5000)
            )
          ]);
          
          if (price) {
            return { key: item.key, price };
          }
        } catch (e) {
          console.warn(`Failed to fetch ${item.symbol}:`, e);
        }
        return null;
      })
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        prices[result.value.key] = result.value.price;
      }
    });
    
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