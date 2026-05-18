// lib/nse/bulkFetch.ts
// Bulk price fetching from NSE India index endpoints
// 3 parallel calls cover ~800 stocks (replaces 999 individual calls)
// 60-second in-memory cache

const NSE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.nseindia.com/',
};

const NSE_BULK_INDICES = [
  'NIFTY 500',
  'NIFTY MIDCAP 150',
  'NIFTY SMALLCAP 250',
];

export interface BulkPriceEntry {
  price: number;
  change: number;
  volume: number;
}

// In-memory cache (lives for serverless function lifetime)
let cache: Record<string, BulkPriceEntry> = {};
let cacheTs = 0;
let inflight: Promise<Record<string, BulkPriceEntry>> | null = null;
const TTL = 60_000;

// Parse number safely (handles comma-separated strings from NSE)
function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0;
  return 0;
}

// Fetch one NSE index endpoint and parse all stock prices
async function fetchIndex(
  index: string,
): Promise<Record<string, BulkPriceEntry>> {
  const out: Record<string, BulkPriceEntry> = {};
  try {
    const url =
      'https://www.nseindia.com/api/equity-stockIndices?index=' +
      encodeURIComponent(index);
    const res = await fetch(url, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return out;
    const json = await res.json();
    const rows = json?.data;
    if (!Array.isArray(rows)) return out;
    for (const r of rows) {
      // Skip index-summary rows (symbol contains spaces like "NIFTY 500")
      if (!r.symbol || r.symbol.includes(' ') || r.lastPrice == null) continue;
      out[r.symbol] = {
        price: num(r.lastPrice),
        change: num(r.pChange),
        volume: num(r.totalTradedVolume),
      };
    }
  } catch (e) {
    console.warn('[NSE-Bulk] ' + index + ': ' + (e as Error).message);
  }
  return out;
}

// Main entry -- parallel fetch all indices, merge, cache 60s
export async function fetchBulkNSEPrices(): Promise<
  Record<string, BulkPriceEntry>
> {
  const now = Date.now();

  // Return fresh cache
  if (now - cacheTs < TTL && Object.keys(cache).length > 0) return cache;

  // Deduplicate concurrent callers
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const settled = await Promise.allSettled(
        NSE_BULK_INDICES.map(fetchIndex),
      );
      const merged: Record<string, BulkPriceEntry> = {};
      for (const s of settled) {
        if (s.status === 'fulfilled') Object.assign(merged, s.value);
      }
      const n = Object.keys(merged).length;
      console.log(
        '[NSE-Bulk] ' + n + ' prices from ' + NSE_BULK_INDICES.length + ' indices',
      );
      if (n > 0) {
        cache = merged;
        cacheTs = now;
      }
      return n > 0 ? merged : cache;
    } catch (e) {
      console.error('[NSE-Bulk] fatal:', e);
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}