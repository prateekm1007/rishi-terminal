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
  recordBulkRun,
  recordUpstreamAttempt,
  type HttpFailureClass,
} from '../health/measurement';
import { yahooChangeFromMeta } from '../livePrice';

/**
 * Corrective gate (deep-audit finding 2): each bulk invocation owns its
 * attempt accounting. The previous implementation derived per-run counts
 * from GLOBAL ledger deltas (before snapshot → concurrent work → after
 * snapshot), so two overlapping batch requests could charge each other's
 * upstream attempts. The accumulator is created per run, shared by that
 * run's chunks (they all belong to the run), and the global ledger event
 * stream (recordUpstreamAttempt) is unchanged — T59.4 reconciliation still
 * sees every attempt; only per-RUN attribution became exact.
 */
interface BulkAttemptAccumulator {
  attempts: number;
  failures: number;
}

export interface BulkPriceEntry {
  price: number;
  /** Commit O (Coder Directions #9/#10, Rule 16): number|null — the change
   *  comes from the ONE unified chart-meta parser (yahooChangeFromMeta);
   *  a change the payload does not disclose is null, never a fabricated
   *  flat day (the old `previousClose || price` fallback is retired). */
  change: number | null;
  /** 24h volume when the upstream disclosed one, else null — null is NOT 0. */
  volume: number | null;
  /** T60.1 provenance: ORIGINAL upstream observation time (ISO), null if
   *  the transport did not disclose one. NEVER the fetch/serve time. */
  observedAt: string | null;
}

// In-memory cache
const priceCache: Record<string, BulkPriceEntry> = {};
let cacheTimestamp = 0;
let inflightPromise: Promise<Record<string, BulkPriceEntry>> | null = null;
const CACHE_TTL = 60_000; // 60 seconds

// LP2 (founder directives 7+8, 2026-10-06 audit): the true bulk transport.
// The previous "bulk" sweep issued ONE v8/chart HTTP call PER SYMBOL in
// 20-per-lane SEQUENTIAL batches — a 50-symbol chunk cost 3 lanes x 17
// sequential round-trips ≈ 5-10 s of pure upstream wall time, which is the
// measured dominant component of the ~10 s per stale chunk (and 17.4 s to
// first price) on the /stocks table. Yahoo's v7/spark endpoint accepts up
// to 20 symbols per call WITHOUT a crumb (v7/quote is 401-gated), so the
// same symbol set now costs ceil(N/20) PARALLEL calls (≈0.1-0.3 s each).
// Symbols spark does not return (unknown/renamed instruments) fall back to
// the original per-symbol chart path — bounded parallel, same .NS/.BO
// suffix semantics, same honest-null miss.
const SPARK_CHUNK = 20;
const SPARK_POOL = 8; // bounded parallel spark calls (the warmer's 916 → 46 groups)

function sparkMetaToEntry(
  meta: Record<string, unknown> | null | undefined,
): BulkPriceEntry | null {
  if (!meta) return null;
  const price = Number(meta.regularMarketPrice);
  // ADR/masquerade gate at the ROOT: a suffixed (.NS/.BO) query is an INR
  // instrument, so the honest discriminator is the payload's own currency,
  // NOT a price floor. The previous `price < 20` rejection misfired on
  // every legitimate sub-₹20 NSE stock (IDEA, YESBANK-class names never
  // got a price at all — part of the never-fresh set within the 916).
  // Fail closed: an absent/USD currency is a rejected instrument (C2).
  if (String(meta.currency ?? "") !== "INR") return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  const parsed = yahooChangeFromMeta(meta);
  if (!parsed) return null;
  const volumeNum = Number(meta.regularMarketVolume);
  const rt = Number(meta.regularMarketTime);
  return {
    price,
    change: parsed.change,
    volume: Number.isFinite(volumeNum) ? volumeNum : null,
    observedAt: Number.isFinite(rt) && rt > 0 ? new Date(rt * 1000).toISOString() : null,
  };
}

async function fetchSparkGroup(
  symbols: string[],
  acc: BulkAttemptAccumulator,
): Promise<Record<string, BulkPriceEntry>> {
  const out: Record<string, BulkPriceEntry> = {};
  const t0 = Date.now();
  const url =
    `https://query1.finance.yahoo.com/v7/finance/spark?symbols=` +
    // literal commas: the wire form verified against the real endpoint
    // (encodeURIComponent per symbol; %2C-joined lists are unverified)
    symbols.map((s) => encodeURIComponent(s.includes(".") ? s : `${s}.NS`)).join(",") +
    `&range=1d&interval=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RishiTerminal/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      acc.attempts += 1;
      acc.failures += 1;
      recordUpstreamAttempt({
        providerId: "yahoo", path: "bulk", ok: false,
        latencyMs: Date.now() - t0, httpFailureClass: classifyFailure(res, null),
        symbolsRequested: symbols.length, symbolsReturned: 0,
      });
      return out;
    }
    const data = await res.json();
    const results: Array<{ symbol: string; response: Array<{ meta: Record<string, unknown> }> }> =
      data?.spark?.result ?? [];
    let returned = 0;
    for (const r of results) {
      const entry = sparkMetaToEntry(r?.response?.[0]?.meta);
      if (entry) {
        // The spark result echoes the YAHOO symbol ("RELIANCE.NS"); the
        // caller keys by the REGISTRY symbol ("RELIANCE").
        const registrySymbol = r.symbol.replace(/\.(NS|BO)$/, "");
        out[registrySymbol] = entry;
        returned += 1;
      }
    }
    acc.attempts += 1;
    recordUpstreamAttempt({
      providerId: "yahoo", path: "bulk", ok: true,
      latencyMs: Date.now() - t0, httpFailureClass: null,
      symbolsRequested: symbols.length, symbolsReturned: returned,
    });
    return out;
  } catch (err) {
    acc.attempts += 1;
    acc.failures += 1;
    recordUpstreamAttempt({
      providerId: "yahoo", path: "bulk", ok: false,
      latencyMs: Date.now() - t0, httpFailureClass: classifyFailure(null, err),
      symbolsRequested: symbols.length, symbolsReturned: 0,
    });
    return out;
  }
}

/** One spark pass over ≤SPARK_CHUNK-sized groups, bounded-parallel. */
async function fetchSparkPrices(symbols: string[], acc: BulkAttemptAccumulator): Promise<Record<string, BulkPriceEntry>> {
  const groups = chunkArray(symbols, SPARK_CHUNK);
  const pool = Math.max(1, Math.min(SPARK_POOL, groups.length));
  const results: Record<string, BulkPriceEntry> = {};
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= groups.length) return;
      Object.assign(results, await fetchSparkGroup(groups[i], acc));
    }
  };
  await Promise.all(Array.from({ length: pool }, worker));
  return results;
}

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

// Fetch single stock from Yahoo Finance v8/chart (works without auth).
// Every attempt increments the CALLER's local accumulator (exact per-run
// attribution) AND the global ledger (T59.4 reconciliation stream).
async function fetchYahooPrice(
  symbol: string,
  acc: BulkAttemptAccumulator,
): Promise<BulkPriceEntry | null> {
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
        acc.attempts += 1;
        acc.failures += 1;
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
        acc.attempts += 1;
        acc.failures += 1;
        recordUpstreamAttempt({
          providerId: 'yahoo', path: 'bulk', ok: false,
          latencyMs: Date.now() - t0, httpFailureClass: 'parse',
          symbolsRequested: 1, symbolsReturned: 0,
        });
        continue;
      }

      const price = Number(meta.regularMarketPrice) || 0;
      // ADR/masquerade gate (LP2, 2026-10-06): the suffixed query (.NS/.BO)
      // is an INR instrument — the honest discriminator is the payload's
      // own currency, not a price floor. The old `price < 20` rejection
      // misfired on every legitimate sub-₹20 NSE stock (they could NEVER
      // be priced — a structural hole in the 916-universe freshness).
      // Fail closed: absent/USD currency → rejected instrument (C2).
      if (String(meta.currency ?? "") !== "INR") {
        // ADR-price rejection — transport succeeded, observation rejected.
        acc.attempts += 1;
        acc.failures += 1;
        recordUpstreamAttempt({
          providerId: 'yahoo', path: 'bulk', ok: false,
          latencyMs: Date.now() - t0, httpFailureClass: null,
          symbolsRequested: 1, symbolsReturned: 0,
        });
        continue; // e.g. a US-line masquerade for a dead/renamed ticker
      }
      if (!Number.isFinite(price) || price <= 0) {
        acc.attempts += 1;
        acc.failures += 1;
        recordUpstreamAttempt({
          providerId: 'yahoo', path: 'bulk', ok: false,
          latencyMs: Date.now() - t0, httpFailureClass: 'parse',
          symbolsRequested: 1, symbolsReturned: 0,
        });
        continue;
      }

      // Commit O: ONE unified Yahoo chart-meta parser for the whole codebase
      // (Coder Directions #9) — the third competing interpretation
      // (`previousClose || price` → change 0) is retired; an unestablishable
      // change is null, and a missing volume is null (Rule 16).
      const parsed = yahooChangeFromMeta(meta);
      if (!parsed) continue;
      const change = parsed.change;
      const volumeNum = Number(meta.regularMarketVolume);
      const volume = Number.isFinite(volumeNum) ? volumeNum : null;

      // T60.1 provenance: Yahoo's own observation timestamp for this quote.
      const rt = Number(meta.regularMarketTime);
      const observedAt = Number.isFinite(rt) && rt > 0
        ? new Date(rt * 1000).toISOString()
        : null;

      acc.attempts += 1;
      recordUpstreamAttempt({
        providerId: 'yahoo', path: 'bulk', ok: true,
        latencyMs: Date.now() - t0, httpFailureClass: null,
        symbolsRequested: 1, symbolsReturned: 1,
      });

      console.log(`[Yahoo-Bulk] ${symbol} -> ${yahooSymbol} : ${price.toFixed(2)}`);

      return { price, change, volume, observedAt };
    } catch (err) {
      acc.attempts += 1;
      acc.failures += 1;
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
async function processBatch(
  symbols: string[],
  acc: BulkAttemptAccumulator,
): Promise<Record<string, BulkPriceEntry>> {
  const results: Record<string, BulkPriceEntry> = {};
  
  for (const sym of symbols) {
    const data = await fetchYahooPrice(sym, acc);
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
  
  // LP2: spark-first — ceil(N/20) parallel multi-symbol calls; only the
  // symbols spark did not resolve fall back to the per-symbol chart path
  // (bounded parallel lanes, unchanged .NS/.BO semantics, honest miss).
  // Corrective gate (kept from the deep-audit): this run owns a fresh
  // accumulator — attempts made by any OTHER concurrent bulk run never
  // enter this run's counts.
  const own: BulkAttemptAccumulator = { attempts: 0, failures: 0 };
  const sparkResults = await fetchSparkPrices(toFetch, own);
  Object.assign(results, sparkResults);
  const missed = toFetch.filter((s) => results[s] === undefined);

  // Fallback for spark misses: the original per-symbol path, bounded-parallel
  // lanes of 20 (sequential inside a lane — the same load profile as before,
  // now covering only the residual set).
  let fallbackChunks: string[][] = [];
  if (missed.length > 0) {
    fallbackChunks = chunkArray(missed, 20);
    const fallbackResults = await Promise.allSettled(
      fallbackChunks.map((chunk) => processBatch(chunk, own)),
    );
    for (const settled of fallbackResults) {
      if (settled.status === 'fulfilled') Object.assign(results, settled.value);
    }
  }
  const upstreamAttempts = own.attempts;
  const upstreamFailures = own.failures;

  // Update cache (both transports' results feed the same 60 s instance cache)
  if (Object.keys(results).length > 0) {
    Object.assign(priceCache, results);
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
    chunks: Math.ceil(toFetch.length / SPARK_CHUNK) + fallbackChunks.length,
    chunkSize: SPARK_CHUNK,
    wallMs: Date.now() - runStart,
  });
  
  return results;
}
