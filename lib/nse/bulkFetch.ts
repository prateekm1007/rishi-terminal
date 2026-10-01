// lib/nse/bulkFetch.ts
// Bulk stock price fetching using Yahoo Finance v8/chart endpoint
// Strategy: parallel batches of sequential calls + 60s cache
//
// Phase 6.1 (T59.1): this module is MEASURED, not changed. Fetching
// semantics (suffix order, price<20 ADR rejection, chunking, 60 s TTL,
// cacheTimestamp population-wide stamp) are exactly as before. What was
// added is observation only:
//   - every actual Yahoo HTTP attempt is recorded in the measurement ledger
//     under the registry id "yahoo" with path="bulk" (T59.2: real upstream
//     calls must be countable separately from application requests — this
//     path bypasses withProviderHealth BY DESIGN, so the reconciliation
//     step can attribute the health-counter delta to it);
//   - every completed fetchBulkPricesForSymbols call records a bulk-run
//     event (symbols requested/returned, bulk-cache hits, upstream
//     attempts, chunk geometry, wall time);
//   - BulkPriceEntry now carries `observedAt` — the ORIGINAL Yahoo
//     observation time (meta.regularMarketTime) — so the batch route can
//     stop presenting serve time as observation time (T60.1). null when
//     Yahoo does not supply one (never fabricated).
import {
  measurementSnapshot,
  recordBulkRun,
  recordUpstreamAttempt,
  type HttpFailureClass,
} from '../health/measurement';

/** T59.1: ledger totals snapshot for run-delta accounting. */
function bulkLedgerTotals(): { bulk: number; bulkFailures: number } {
  const c = measurementSnapshot().counters.upstreamTotals;
  return { bulk: c.bulk, bulkFailures: c.bulkFailures };
}

export interface BulkPriceEntry {
  price: number;
  change: number;
  volume: number;
  /** T60.1 provenance: ORIGINAL upstream observation time (ISO), null if
   *  the transport did not disclose one. NEVER the fetch/serve time. */
  observedAt: string | null;
}

// In-memory cache
const priceCache: Record<string, BulkPriceEntry> = {};
let cacheTimestamp = 0;
let inflightPromise: Promise<Record<string, BulkPriceEntry>> | null = null;
const CACHE_TTL = 60_000; // 60 seconds

// T59.1: classify a failed HTTP/transport attempt (null = no failure).
function classifyFailure(res: Response | null, err: unknown): HttpFailureClass {
  if (res) {
    const st = res.status;
    if (st >= 400 && st < 500) return 'http-4xx';
    if (st >= 500) return 'http-5xx';
    return null;
  }
  const name = err instanceof Error ? err.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  if (err instanceof SyntaxError) return 'parse';
  return 'network';
}

// Fetch single stock from Yahoo Finance v8/chart (works without auth)
async function fetchYahooPrice(symbol: string): Promise<BulkPriceEntry | null> {
  const suffixes = ['.NS', '.BO'];
  for (const suffix of suffixes) {
    const t0 = Date.now();
    let res: Response | null = null;
    try {
      const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}${suffix}`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`;

      res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RishiTerminal/1.0)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        // T59.1: count the real upstream HTTP attempt, then fall through
        // exactly as before (try next suffix).
        recordUpstreamAttempt({
          providerId: 'yahoo', path: 'bulk', ok: false,
          latencyMs: Date.now() - t0,
          httpFailureClass: classifyFailure(res, null),
          symbolsRequested: 1, symbolsReturned: 0,
        });
        continue;
      }

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta?.regularMarketPrice) {
        recordUpstreamAttempt({
          providerId: 'yahoo', path: 'bulk', ok: false,
          latencyMs: Date.now() - t0, httpFailureClass: 'parse',
          symbolsRequested: 1, symbolsReturned: 0,
        });
        continue;
      }

      const price = Number(meta.regularMarketPrice) || 0;
      if (price < 20) {
        // ADR-price rejection — transport succeeded, observation rejected.
        recordUpstreamAttempt({
          providerId: 'yahoo', path: 'bulk', ok: false,
          latencyMs: Date.now() - t0, httpFailureClass: null,
          symbolsRequested: 1, symbolsReturned: 0,
        });
        continue; // Reject US ADR prices (INFY without suffix ≈ $12)
      }

      const prevClose = Number(meta.previousClose) || Number(meta.chartPreviousClose) || price;
      const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const volume = Number(meta.regularMarketVolume) || 0;

      // T60.1 provenance: Yahoo's own observation timestamp for this quote.
      const rt = Number(meta.regularMarketTime);
      const observedAt = Number.isFinite(rt) && rt > 0
        ? new Date(rt * 1000).toISOString()
        : null;

      recordUpstreamAttempt({
        providerId: 'yahoo', path: 'bulk', ok: true,
        latencyMs: Date.now() - t0, httpFailureClass: null,
        symbolsRequested: 1, symbolsReturned: 1,
      });

      console.log(`[Yahoo-Bulk] ${symbol} -> ${yahooSymbol} : ${price.toFixed(2)}`);

      return { price, change, volume, observedAt };
    } catch (err) {
      recordUpstreamAttempt({
        providerId: 'yahoo', path: 'bulk', ok: false,
        latencyMs: Date.now() - t0,
        httpFailureClass: classifyFailure(null, err),
        symbolsRequested: 1, symbolsReturned: 0,
      });
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
  const runStart = Date.now();
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
    // T59.1: a fully cache-served run is still a measured run.
    recordBulkRun({
      providerId: 'yahoo',
      symbolsRequested: symbols.length,
      symbolsReturned: Object.keys(results).length,
      bulkCacheHits: symbols.length,
      upstreamAttempts: 0,
      upstreamFailures: 0,
      chunks: 0,
      chunkSize: 20,
      wallMs: Date.now() - runStart,
    });
    return results;
  }
  
  // Process in parallel batches (10 batches of ~100 symbols each)
  const chunks = chunkArray(toFetch, 20);
  const before = bulkLedgerTotals();
  const batchResults = await Promise.allSettled(
    chunks.map(chunk => processBatch(chunk))
  );
  const after = bulkLedgerTotals();
  const upstreamAttempts = after.bulk - before.bulk;
  const upstreamFailures = Math.max(0, after.bulkFailures - before.bulkFailures);
  
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
  
  // T59.1: aggregate run record — requested vs returned vs cache-served vs
  // actually-fetched, so T59.3 scenario D/E can prove what served the data.
  recordBulkRun({
    providerId: 'yahoo',
    symbolsRequested: symbols.length,
    symbolsReturned: Object.keys(results).length,
    bulkCacheHits: symbols.length - toFetch.length,
    upstreamAttempts,
    upstreamFailures,
    chunks: chunks.length,
    chunkSize: 20,
    wallMs: Date.now() - runStart,
  });
  
  return results;
}
