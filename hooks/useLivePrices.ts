'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { latestObservedAt } from '../lib/pricePresentation';

export interface PriceData {
  /** G6 (audit 2026-10-02, Coder Directions): every field is nullable — a
   *  missing provider field is UNAVAILABILITY, never zero. `0%` is a real
   *  market observation and must never stand in for "the provider did not
   *  report this". Consumers must handle null explicitly (render an em
   *  dash / skip); no consumer may infer null → 0. */
  price: number | null;
  change: number | null;
  changePercent24h: number | null;
  /** 24h volume when the transport carried one, else null — never 0
   *  (absent volume is unavailability, not zero trading; audit
   *  2026-10-02 P1). */
  volume24h: number | null;
  /** Corrective gate 3: the server's ORIGINAL observation time, or null when
   *  the upstream disclosed none. The client never substitutes its own
   *  fetch time here — that would fabricate an observation timestamp. */
  lastUpdated: string | null;
  /** Round 9 (directive 14): the server's provenance status for THIS entry
   *  (LIVE / CACHED / STATIC / DERIVED / UNAVAILABLE), verbatim from the
   *  wire — null when the transport carried none. Page-level badges are
   *  DERIVED from these (lib/pricePresentation.aggregatePresentationState),
   *  never from "a fetch happened". */
  status: string | null;
  /** Round 9: the entry's upstream source id, verbatim from the wire —
   *  needed so an aggregate LIVE badge can honestly downgrade to DELAYED
   *  for delayed transports (yahoo). Null when not transported. */
  source: string | null;
}

/** The NSE market state the batch payload carries top-level (U2). */
export interface WireMarketState {
  open: boolean;
  ttlSeconds: number | null;
  freshness: "live-delayed" | "close";
  sessionDate: string;
}

/**
 * U2 (founder round 7): market-aware polling cadence. NSE open (or market
 * state unknown) → the caller's interval. NSE closed → slowed to at least
 * 5 minutes: the requested symbols may still include 24/7 classes
 * (crypto/forex), and the equity rows are the honest close (server-labelled),
 * so polling them every 60 s buys nothing. PURE — directly testable.
 */
export function effectivePollInterval(baseMs: number, marketOpen?: boolean): number {
  if (marketOpen === false) return Math.max(baseMs, 300_000);
  return baseMs;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** The /api/prices/batch response entry: either an observation or an
 * explicit UNAVAILABLE marker (T57 — total provider failure is a status,
 * not a zeroed price). */
export interface BatchPriceEntry {
  status?: string;
  price?: number;
  change?: number;
  changePercent24h?: number;
  volume24h?: number;
  lastUpdated?: string | null;
  /** Round 9: the wire's upstream source id (for honest delayed-source
   *  labelling in aggregate badges). */
  source?: string;
}

/**
 * G6: transport-level normalization is a PURE function so the null contract
 * is directly testable. Rules:
 *   - UNAVAILABLE (or missing) entry → null (no observation exists);
 *   - a field the provider did not report → null (never 0, never a
 *     different metric's value — the old code used `change` as a
 *     changePercent24h stand-in, mixing an absolute Δ with a percent);
 *   - a reported field passes through verbatim when finite.
 */
export function normalizeBatchEntry(
  raw: BatchPriceEntry | undefined,
): PriceData | null {
  if (!raw || raw.status === 'UNAVAILABLE') return null;
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  return {
    price: num(raw.price),
    change: num(raw.change),
    changePercent24h: num(raw.changePercent24h),
    volume24h: num(raw.volume24h),
    lastUpdated:
      typeof raw.lastUpdated === 'string' && raw.lastUpdated ? raw.lastUpdated : null,
    // Round 9: the wire's provenance status and source id ride through
    // verbatim (the fields the badge derivation needs); absent → null,
    // never guessed.
    status: typeof raw.status === 'string' && raw.status ? raw.status : null,
    source: typeof raw.source === 'string' && raw.source ? raw.source : null,
  };
}

async function fetchChunk(symbols: string[]): Promise<{ entries: Record<string, BatchPriceEntry>; market: WireMarketState | null }> {
  const response = await fetch('/api/prices/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!response.ok) throw new Error('Price API returned ' + response.status);
  const data = await response.json();
  return {
    // U2: the batch payload is { prices: ..., market?: ... , ...legacy } —
    // read the wrapper when present (legacy spread falls back to data itself).
    entries: data?.prices ?? data,
    market: (data?.market ?? null) as WireMarketState | null,
  };
}

/** LP (founder directives 7+8, 2026-10-06): the chunked batch fetch as an
 *  injectable, INCREMENTAL orchestration. The live defect it replaces: the
 *  Stocks table fetched its 50-symbol chunks sequentially and applied state
 *  only after ALL chunks settled — 16/19 chunks had returned HTTP 200 while
 *  the table still rendered 0/916 prices (production probe, 2026-10-06
 *  ~05:10Z), and a single failed chunk would have discarded every other
 *  chunk's data. Contract (pinned by test/lp.chunkWaterfall.test.ts):
 *   - each completed chunk is delivered AS IT LANDS (onChunk) — consumers
 *     render progressively, never gated on the slowest chunk;
 *   - a chunk that rejects does not discard the others — the failure is
 *     counted and the partial result stands (honest nulls for the missing
 *     symbols, exactly as before);
 *   - chunks run in a small bounded-parallel pool (default 4) instead of a
 *     sequential waterfall — the route is designed for batch sweeps and
 *     the per-IP limiter (60/min) sees the same request count either way;
 *   - the 50-symbol batch cap (the route contract) is preserved;
 *   - market state from any chunk's payload is surfaced (the cadence stays
 *     server-decided, U2). */
export async function fetchPricesChunked(
  symbols: string[],
  deps: {
    fetchChunk: (symbols: string[]) => Promise<{
      entries: Record<string, BatchPriceEntry>;
      market: WireMarketState | null;
    }>;
    onChunk?: (normalized: Record<string, PriceData>) => void;
    concurrency?: number;
  },
): Promise<{
  merged: Record<string, PriceData>;
  markets: WireMarketState[];
  failures: number;
}> {
  const chunks = chunkArray(symbols, 50);
  const pool = Math.max(1, Math.min(deps.concurrency ?? 4, chunks.length || 1));
  const merged: Record<string, PriceData> = {};
  const markets: WireMarketState[] = [];
  let failures = 0;
  let next = 0;

  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= chunks.length) return;
      const chunkSymbols = chunks[i];
      try {
        const { entries, market } = await deps.fetchChunk(chunkSymbols);
        if (market) markets.push(market);
        const normalized: Record<string, PriceData> = {};
        for (const sym of chunkSymbols) {
          const n = normalizeBatchEntry(entries[sym]);
          if (n) {
            normalized[sym] = n;
            merged[sym] = n;
          }
        }
        deps.onChunk?.(normalized);
      } catch {
        // Tolerant by contract: this chunk's symbols stay honestly absent
        // (never zeroed); the other chunks' data stands.
        failures += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: pool }, worker));
  return { merged, markets, failures };
}

export function useLivePrices(
  symbols: string[],
  refreshInterval = 60000,
  /** U2: SSR hydration snapshot (lib/dashboardSnapshot) — first paint
   *  carries server-fetched prices; the mount revalidation still runs. */
  initialPrices?: Record<string, PriceData> | null,
) {
  const [prices, setPrices] = useState<Record<string, PriceData>>(initialPrices ?? {});
  const [loading, setLoading] = useState(!initialPrices);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  /** Round 9 (directive 14): the LATEST SERVER-disclosed observation time
   *  across the fetched entries — the honest clock for "updated …" labels.
   * `lastUpdated` (fetch/check time) remains for surfaces that mean
   *  exactly that ("last checked"); it must never be presented as an
   *  observation time. Null when no entry disclosed one. */
  const [observedAt, setObservedAt] = useState<Date | null>(null);

  const symbolsRef = useRef<string[]>(symbols);
  const marketRef = useRef<WireMarketState | null>(null);
  // With an SSR snapshot there is nothing "loading" about the first paint —
  // the mount revalidation is a refresh, not the initial load.
  const initialLoadDone = useRef(Boolean(initialPrices));
  const symbolsKey = symbols.slice().sort().join(',');

  // T18 fix: the ref was mutated during render (react-hooks/refs). Syncing it
  // in an effect keeps fetchPrices reading a fresh list without breaking
  // render purity.
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbolsKey]);

  const fetchPrices = useCallback(async () => {
    const currentSymbols = symbolsRef.current;
    if (currentSymbols.length === 0) {
      setLoading(false);
      return;
    }

    // Only show loading spinner on very first fetch
    if (!initialLoadDone.current) {
      setLoading(true);
    }

    try {
      setError(null);

      // LP (2026-10-06): the incremental chunk orchestration — every
      // completed chunk updates state as it lands (progressive rendering:
      // the first rows light up after the FIRST chunk, not after all 19),
      // and a failed chunk cannot discard the rest. Honest-null
      // normalization (G6) and the server-decided market state (U2) are
      // unchanged — only the delivery schedule changed.
      // C9 correction (Lighthouse ratchet, measured): the first version ran
      // the chunks 4-wide and /screener's measured performance dropped
      // 69 -> 63, below the 65 floor, from load-window contention. The
      // stated goal (the floor) wins over the speed optimization: the
      // production default is SEQUENTIAL (one chunk at a time — the same
      // load profile main always had) with incremental delivery. The
      // bounded-pool capability stays in fetchPricesChunked (unit-pinned)
      // for a future idle-deferred design that keeps the floor.
      const { merged, markets, failures } = await fetchPricesChunked(currentSymbols, {
        fetchChunk,
        concurrency: 1,
        onChunk: (normalized) => {
          setPrices((prev) => ({ ...prev, ...normalized }));
        },
      });
      if (markets.length > 0) marketRef.current = markets[markets.length - 1];

      // The final state is the pruned full map: symbols no longer in the
      // list are dropped (same replace semantics the old code had), while
      // every chunk's data survived.
      setPrices(merged);
      setLastUpdated(new Date());
      // Round 9: the observation clock is the LATEST upstream-disclosed
      // timestamp (never the fetch time). latestObservedAt ignores
      // unparsable/absent values, so no disclosed time → null stays null.
      const latestIso = latestObservedAt(Object.values(merged));
      setObservedAt(latestIso ? new Date(Date.parse(latestIso)) : null);
      initialLoadDone.current = true;
      if (failures > 0) {
        // Partial delivery with at least one failed chunk: surface the
        // error WITHOUT discarding what landed (the old code lost every
        // chunk's data on a single failure — the exact live defect).
        setError(`Price API: ${failures} of ${Math.ceil(currentSymbols.length / 50)} chunk(s) failed`);
      }
    } catch (err) {
      console.error('[useLivePrices] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads symbols from ref

  // U2: self-scheduling timer chain — the delay AFTER each completed fetch
  // adapts to the server-provided market state. (Also fixes the pre-U2
  // overlap: setInterval could start a new fetch while the previous one was
  // still in flight.)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      await fetchPrices();
      if (cancelled) return;
      const delay = effectivePollInterval(refreshInterval, marketRef.current?.open);
      timer = setTimeout(tick, delay);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, refreshInterval]);
  return { prices, loading, error, lastUpdated, observedAt, refetch: fetchPrices };
}

// Convenience: single symbol — stable key prevents re-mount loop
export function usePrice(symbol: string) {
  // T18 fix: ref mutation during render replaced with memoized state
  const symbols = useMemo(() => [symbol], [symbol]);
  const { prices, loading, error, lastUpdated, observedAt } = useLivePrices(symbols);
  return { price: prices[symbol] || null, loading, error, lastUpdated, observedAt };
}
