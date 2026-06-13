'use client';

// hooks/useFundamentals.ts
// Fetches live fundamentals: P/E, EPS, Market Cap, ROE, Book Value
// Falls back to STOCKS static data if API unavailable
// Cache: localStorage, 24 hours

import { useState, useEffect, useRef } from 'react';
import { STOCKS } from '@/data/stocks/index';

export interface Fundamentals {
  symbol: string;
  pe: number;
  eps: number;
  marketCap: number;
  roe: number;
  roce: number;
  bookValue: number;
  dividendYield: number;
  faceValue: number;
  lastUpdated: string;
  isLive: boolean;
}

const CACHE_KEY = 'rishi_fundamentals_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function loadCache(): Record<string, { data: Fundamentals; cachedAt: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(cache: Record<string, { data: Fundamentals; cachedAt: number }>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function getFromCache(symbol: string): Fundamentals | null {
  const cache = loadCache();
  const entry = cache[symbol];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) return null;
  return entry.data;
}

function setInCache(symbol: string, data: Fundamentals) {
  const cache = loadCache();
  cache[symbol] = { data, cachedAt: Date.now() };
  // Trim cache to 200 entries
  const keys = Object.keys(cache);
  if (keys.length > 200) {
    const oldest = keys.sort((a, b) => cache[a].cachedAt - cache[b].cachedAt).slice(0, 50);
    oldest.forEach(k => delete cache[k]);
  }
  saveCache(cache);
}

// Build static fallback from STOCKS data
function buildStaticFundamentals(symbol: string): Fundamentals {
  const stock = (STOCKS as any)[symbol];
  return {
    symbol,
    pe: stock?.pe ?? 0,
    eps: stock?.np && stock?.sh ? Math.round((stock.np / stock.sh) * 100) / 100 : 0,
    marketCap: stock?.mktcap ?? 0,
    roe: stock?.roe ?? 0,
    roce: stock?.roce ?? 0,
    bookValue: stock?.bvps ?? 0,
    dividendYield: 0,
    faceValue: 10,
    lastUpdated: '',
    isLive: false,
  };
}

// Single symbol
export function useFundamentals(symbol: string): {
  fundamentals: Fundamentals | null;
  loading: boolean;
  isLive: boolean;
} {
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(() => {
    const cached = getFromCache(symbol);
    if (cached) return cached;
    return buildStaticFundamentals(symbol);
  });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = getFromCache(symbol);
    if (cached) { setFundamentals(cached); return; }

    setLoading(true);
    fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted.current) return;
        if (data && data.pe !== undefined) {
          const live: Fundamentals = { ...data, isLive: true };
          setFundamentals(live);
          setInCache(symbol, live);
        }
        // else keep static fallback
      })
      .catch(() => {}) // keep static fallback
      .finally(() => { if (mounted.current) setLoading(false); });

    return () => { mounted.current = false; };
  }, [symbol]);

  return {
    fundamentals,
    loading,
    isLive: fundamentals?.isLive ?? false,
  };
}

// Bulk symbols
export function useBulkFundamentals(symbols: string[]): {
  fundamentals: Record<string, Fundamentals>;
  loading: boolean;
} {
  const symbolsKey = symbols.slice().sort().join(',');

  const [fundamentals, setFundamentals] = useState<Record<string, Fundamentals>>(() => {
    const result: Record<string, Fundamentals> = {};
    for (const sym of symbols) {
      const cached = getFromCache(sym);
      result[sym] = cached ?? buildStaticFundamentals(sym);
    }
    return result;
  });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (symbols.length === 0) return;

    const toFetch = symbols.filter(s => !getFromCache(s));
    if (toFetch.length === 0) return;

    setLoading(true);
    fetch('/api/fundamentals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: toFetch }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted.current || !data) return;
        setFundamentals(prev => {
          const next = { ...prev };
          for (const sym of toFetch) {
            if (data[sym]) {
              const live: Fundamentals = { ...data[sym], isLive: true };
              next[sym] = live;
              setInCache(sym, live);
            }
          }
          return next;
        });
      })
      .catch(() => {})
      .finally(() => { if (mounted.current) setLoading(false); });

    return () => { mounted.current = false; };
  }, [symbolsKey]);

  return { fundamentals, loading };
}