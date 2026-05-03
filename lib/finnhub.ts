/**
 * Finnhub API Configuration
 * Free tier: 60 API calls/minute
 * Sign up at: https://finnhub.io/
 * 
 * To enable: Add NEXT_PUBLIC_FINNHUB_KEY to .env.local
 */

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY || '';

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High
  l: number;  // Low
  o: number;  // Open
  pc: number; // Previous close
  t: number;  // Timestamp
}

export async function fetchFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!FINNHUB_API_KEY) {
    console.warn('[Finnhub] API key not configured');
    return null;
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}.NS&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.c ? data : null;
  } catch (error) {
    console.warn('[Finnhub] Fetch failed:', error);
    return null;
  }
}