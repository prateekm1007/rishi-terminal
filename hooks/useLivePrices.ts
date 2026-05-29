'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PriceData {
  price: number;
  change: number;
  changePercent24h: number;
  volume24h: number;
  lastUpdated: string;
}

// Split array into chunks of given size
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Fetch one batch chunk (max 150 symbols)
async function fetchChunk(symbols: string[]): Promise<Record<string, any>> {
  const response = await fetch('/api/prices/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!response.ok) throw new Error('Price API returned ' + response.status);
  return response.json();
}

export function useLivePrices(symbols: string[], refreshInterval = 60000) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const symbolsRef = useRef(symbols);


  const fetchPrices = useCallback(async () => {
    const currentSymbols = symbolsRef.current;
    if (currentSymbols.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Split into chunks of 150 (well under the 200 API limit)
      const chunks = chunkArray(currentSymbols, 150);

      // Fetch all chunks sequentially to avoid hammering Yahoo Finance
      const merged: Record<string, any> = {};
      for (const chunk of chunks) {
        const chunkData = await fetchChunk(chunk);
        Object.assign(merged, chunkData);
      }

      // Normalize — ensure every field exists with a safe fallback
      const normalized: Record<string, PriceData> = {};
      for (const sym of currentSymbols) {
        const raw = merged[sym];
        if (raw) {
          normalized[sym] = {
            price:            typeof raw.price            === 'number' ? raw.price            : 0,
            change:           typeof raw.change           === 'number' ? raw.change           : 0,
            changePercent24h: typeof raw.changePercent24h === 'number' ? raw.changePercent24h
                            : typeof raw.change           === 'number' ? raw.change           : 0,
            volume24h:        typeof raw.volume24h        === 'number' ? raw.volume24h        : 0,
            lastUpdated:      raw.lastUpdated || new Date().toISOString(),
          };
        }
      }

      setPrices(normalized);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useLivePrices] fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads symbols from ref

  // Sync symbols ref, fetch immediately when symbols change, then poll
  useEffect(() => {
    symbolsRef.current = symbols;
    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols, fetchPrices, refreshInterval]);

  return { prices, loading, error, lastUpdated, refetch: fetchPrices };
}

// Convenience: single symbol
export function usePrice(symbol: string) {
  const { prices, loading, error, lastUpdated } = useLivePrices([symbol]);
  return { price: prices[symbol] || null, loading, error, lastUpdated };
}