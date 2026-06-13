// app/api/fundamentals/route.ts
// Live fundamentals endpoint: P/E, EPS, Market Cap, ROE, Book Value
// Free sources: NSE India API + Yahoo Finance fallback
// Cache: 24 hours (fundamentals change quarterly)

import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveFundamentals, fetchBulkFundamentals } from '@/lib/nse/fundamentals';

// In-memory cache: symbol -> { data, cachedAt }
const cache = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function getCached(symbol: string) {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) { cache.delete(symbol); return null; }
  return entry.data;
}

function setCache(symbol: string, data: any) {
  cache.set(symbol, { data, cachedAt: Date.now() });
}

// GET /api/fundamentals?symbol=TCS
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const cached = getCached(symbol);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  }

  const data = await fetchLiveFundamentals(symbol);
  if (!data) return NextResponse.json({ error: 'Not found', symbol }, { status: 404 });

  setCache(symbol, data);
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=86400' },
  });
}

// POST /api/fundamentals  body: { symbols: string[] }
export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }
    if (symbols.length > 100) {
      return NextResponse.json({ error: 'Max 100 symbols per request' }, { status: 400 });
    }

    const result: Record<string, any> = {};
    const toFetch: string[] = [];

    // Serve from cache where possible
    for (const sym of symbols) {
      const cached = getCached(sym.toUpperCase());
      if (cached) result[sym.toUpperCase()] = { ...cached, fromCache: true };
      else toFetch.push(sym.toUpperCase());
    }

    // Fetch missing
    if (toFetch.length > 0) {
      const fresh = await fetchBulkFundamentals(toFetch);
      for (const [sym, data] of Object.entries(fresh)) {
        setCache(sym, data);
        result[sym] = data;
      }
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed', details: (err as Error).message }, { status: 500 });
  }
}