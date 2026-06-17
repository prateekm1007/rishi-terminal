// lib/nse/bulkFetch.ts
// Bulk stock price fetching using Yahoo Finance v8/chart endpoint
// Strategy: parallel batches of sequential calls + 60s cache

export interface BulkPriceEntry {
  price: number;
  change: number;
  volume: number;
}

// In-memory cache
let priceCache: Record<string, BulkPriceEntry> = {};
let cacheTimestamp = 0;
let inflightPromise: Promise<Record<string, BulkPriceEntry>> | null = null;
const CACHE_TTL = 60_000; // 60 seconds

// Fetch single stock from Yahoo Finance v8/chart (works without auth)
async function fetchYahooPrice(symbol: string): Promise<BulkPriceEntry | null> {
  const suffixes = ['.NS', '.BO'];
  for (const suffix of suffixes) {
    try {
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}${suffix}`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RishiTerminal/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta?.regularMarketPrice) continue;

      const price = Number(meta.regularMarketPrice) || 0;
      if (price < 20) continue; // Reject US ADR prices (INFY without suffix ≈ $12)

      const prevClose = Number(meta.previousClose) || Number(meta.chartPreviousClose) || price;
      const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const volume = Number(meta.regularMarketVolume) || 0;

      console.log(`[Yahoo-Bulk] ${symbol} -> ${yahooSymbol} : ${price.toFixed(2)}`);

      return { price, change, volume };
    } catch (err) {
      continue; // Try next suffix
    }
  }

  console.warn(`[Yahoo-Bulk] Failed to fetch ${symbol} after .NS + .BO`);
  return null;
}

// Process one batch of symbols sequentially
async function processBatch(symbols: string[]): Promise<Record<string, BulkPriceEntry>> {
  const results: Record<string, BulkPriceEntry> = {};
  
  for (const sym of symbols) {
    const data = await fetchYahooPrice(sym);
    if (data) {
      results[sym] = data;
    }
  }
  
  return results;
}

// Split array into chunks
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetch bulk prices for Indian stocks
 * Uses Yahoo Finance v8/chart (works from cloud without auth)
 * Processes in parallel batches + caches for 60s
 */
export async function fetchBulkNSEPrices(): Promise<Record<string, BulkPriceEntry>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (now - cacheTimestamp < CACHE_TTL && Object.keys(priceCache).length > 0) {
    return priceCache;
  }
  
  // Return existing inflight request if any
  if (inflightPromise) {
    return inflightPromise;
  }
  
  // Start new fetch
  inflightPromise = (async () => {
    try {
      // Get all Indian stock symbols from data/stocks.ts
      // For now, return empty and let fallback handle it
      // (route.ts will call this with specific symbols)
      return priceCache;
    } finally {
      inflightPromise = null;
    }
  })();
  
  return inflightPromise;
}

/**
 * Fetch prices for a specific list of symbols
 * Used by /api/prices/batch with requested symbols only
 */
export async function fetchBulkPricesForSymbols(
  symbols: string[]
): Promise<Record<string, BulkPriceEntry>> {
  const now = Date.now();
  const results: Record<string, BulkPriceEntry> = {};
  const toFetch: string[] = [];
  
  // Check cache first
  for (const sym of symbols) {
    if (priceCache[sym] && now - cacheTimestamp < CACHE_TTL) {
      results[sym] = priceCache[sym];
    } else {
      toFetch.push(sym);
    }
  }
  
  if (toFetch.length === 0) {
    return results;
  }
  
  // Process in parallel batches (10 batches of ~100 symbols each)
  const chunks = chunkArray(toFetch, 20);
  const batchResults = await Promise.allSettled(
    chunks.map(chunk => processBatch(chunk))
  );
  
  // Merge results
  for (const settled of batchResults) {
    if (settled.status === 'fulfilled') {
      Object.assign(results, settled.value);
      // Update cache
      Object.assign(priceCache, settled.value);
    }
  }
  
  if (Object.keys(results).length > 0) {
    cacheTimestamp = now;
  }
  
  console.log(
    `[Yahoo-Bulk] Fetched ${Object.keys(results).length}/${symbols.length} prices ` +
    `(cached: ${symbols.length - toFetch.length}, new: ${toFetch.length})`
  );
  
  return results;
}
