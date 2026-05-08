'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceData {
  price: number;
  change: number;
  lastUpdated: string;
}

export function useLivePrices(symbols: string[], refreshInterval = 60000) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (symbols.length === 0) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/prices/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) throw new Error('Failed to fetch prices');
      const data = await response.json();
      setPrices(data);
    } catch (err) {
      console.error('Price fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  // Fetch on mount and set up interval
  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error };
}

export function usePrice(symbol: string) {
  const { prices, loading } = useLivePrices([symbol]);
  return { price: prices[symbol] || null, loading };
}