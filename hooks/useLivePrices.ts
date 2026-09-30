'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface PriceData {
  price: number;
  change: number;
  changePercent24h: number;
  volume24h: number;
  lastUpdated: string;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function fetchChunk(symbols: string[]): Promise<Record<string, any>> {
  const response = await fetch('/api/prices/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!response.ok) throw new Error('Price API returned ' + response.status);
  const data = await response.json();
  return data?.prices ?? data;
}

export function useLivePrices(symbols: string[], refreshInterval = 60000) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const symbolsRef = useRef<string[]>(symbols);
  const initialLoadDone = useRef(false);
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

      const chunks = chunkArray(currentSymbols, 150);
      const merged: Record<string, any> = {};
      for (const chunk of chunks) {
        const chunkData = await fetchChunk(chunk);
        Object.assign(merged, chunkData);
      }

      const normalized: Record<string, PriceData> = {};
      for (const sym of currentSymbols) {
        const raw = merged[sym];
        if (raw) {
          normalized[sym] = {
            price: typeof raw.price === 'number' ? raw.price : 0,
            change: typeof raw.change === 'number' ? raw.change : (typeof raw.changePercent24h === 'number' ? raw.changePercent24h : 0),
            changePercent24h: typeof raw.changePercent24h === 'number' ? raw.changePercent24h : (typeof raw.change === 'number' ? raw.change : 0),
            volume24h: typeof raw.volume24h === 'number' ? raw.volume24h : 0,
            lastUpdated: raw.lastUpdated || new Date().toISOString(),
          };
        }
      }

      setPrices(normalized);
      setLastUpdated(new Date());
      initialLoadDone.current = true;
    } catch (err) {
      console.error('[useLivePrices] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads symbols from ref

  // Reset and re-fetch when symbol set changes
  useEffect(() => {
    initialLoadDone.current = false;
    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, refreshInterval]);

  return { prices, loading, error, lastUpdated, refetch: fetchPrices };
}

// Convenience: single symbol — stable key prevents re-mount loop
export function usePrice(symbol: string) {
  // T18 fix: ref mutation during render replaced with memoized state
  const symbols = useMemo(() => [symbol], [symbol]);
  const { prices, loading, error, lastUpdated } = useLivePrices(symbols);
  return { price: prices[symbol] || null, loading, error, lastUpdated };
}
