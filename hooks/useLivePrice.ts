'use client';

import { useState, useEffect, useCallback } from 'react';

interface LivePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  previousClose: number;
  isMarketOpen: boolean;
  lastUpdated: string;
}

export function useLivePrice(symbol: string, refreshInterval: number = 60000) {
  const [price, setPrice] = useState<LivePrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch('/api/prices?symbol=' + symbol);
      
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }

      const data = await response.json();
      setPrice(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchPrice();

    const interval = setInterval(fetchPrice, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchPrice, refreshInterval]);

  return { price, loading, error, refresh: fetchPrice };
}

export function useBatchPrices(symbols: string[], refreshInterval: number = 120000) {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/prices?symbols=' + symbols.join(','));
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      setPrices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbols.join(',')]);

  useEffect(() => {
    fetchPrices();

    const interval = setInterval(fetchPrices, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error, refresh: fetchPrices };
}