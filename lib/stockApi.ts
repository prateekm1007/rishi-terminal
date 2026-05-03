/**
 * Rishi Terminal - Robust Lightweight Stock API
 * Uses Yahoo Finance unofficial endpoint with resilience
 */

export interface LiveQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  lastUpdated: string;
}

interface CacheEntry {
  data: LiveQuote;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(symbol: string): LiveQuote | null {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(symbol);
    return null;
  }
  return entry.data;
}

function setCache(symbol: string, data: LiveQuote) {
  cache.set(symbol, { data, timestamp: Date.now() });
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (res.ok) return res;

      if (i < retries) {
        await new Promise(r => setTimeout(r, 800 * (i + 1)));
      }
    } catch (e) {
      if (i === retries) return null;
    }
  }
  return null;
}

export async function fetchLiveQuote(symbol: string): Promise<LiveQuote | null> {
  const upperSymbol = symbol.toUpperCase();
  const cached = getCached(upperSymbol);
  if (cached) return cached;

  try {
    const yahooSymbol = upperSymbol.endsWith('.NS') ? upperSymbol : `${upperSymbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${yahooSymbol}`;

    const res = await fetchWithRetry(url);
    if (!res) return null;

    const json = await res.json();
    const result = json?.quoteResponse?.result?.[0];

    if (!result || !result.regularMarketPrice) return null;

    const liveData: LiveQuote = {
      symbol: upperSymbol,
      price: result.regularMarketPrice,
      change: result.regularMarketChange ?? 0,
      changePct: result.regularMarketChangePercent ?? 0,
      volume: result.regularMarketVolume ?? 0,
      marketCap: result.marketCap,
      pe: result.trailingPE,
      lastUpdated: new Date().toISOString(),
    };

    setCache(upperSymbol, liveData);
    return liveData;
  } catch (error) {
    console.warn(`[StockApi] Single fetch failed for ${symbol}`);
    return null;
  }
}

export async function fetchLiveQuotes(symbols: string[]): Promise<Map<string, LiveQuote>> {
  const results = new Map<string, LiveQuote>();
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const upper = sym.toUpperCase();
    const cached = getCached(upper);
    if (cached) {
      results.set(upper, cached);
    } else {
      toFetch.push(upper);
    }
  }

  if (toFetch.length === 0) return results;

  try {
    const yahooSymbols = toFetch.map(s => s.endsWith('.NS') ? s : `${s}.NS`).join(',');
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${yahooSymbols}`;

    const res = await fetchWithRetry(url);
    if (!res) {
      // Fallback: fetch one by one
      console.warn('[StockApi] Batch failed. Falling back to individual fetches...');
      for (const symbol of toFetch) {
        const single = await fetchLiveQuote(symbol);
        if (single) results.set(symbol, single);
      }
      return results;
    }

    const json = await res.json();
    const quoteList = json?.quoteResponse?.result ?? [];

    for (const result of quoteList) {
      if (result?.symbol && result.regularMarketPrice) {
        const cleanSymbol = result.symbol.replace('.NS', '').toUpperCase();

        const liveData: LiveQuote = {
          symbol: cleanSymbol,
          price: result.regularMarketPrice,
          change: result.regularMarketChange ?? 0,
          changePct: result.regularMarketChangePercent ?? 0,
          volume: result.regularMarketVolume ?? 0,
          marketCap: result.marketCap,
          pe: result.trailingPE,
          lastUpdated: new Date().toISOString(),
        };

        setCache(cleanSymbol, liveData);
        results.set(cleanSymbol, liveData);
      }
    }
  } catch (error) {
    console.error('[StockApi] Batch fetch error:', error);
  }

  return results;
}

export function createFallbackQuote(symbol: string, staticPrice: number): LiveQuote {
  return {
    symbol: symbol.toUpperCase(),
    price: staticPrice,
    change: 0,
    changePct: 0,
    volume: 0,
    lastUpdated: new Date().toISOString(),
  };
}