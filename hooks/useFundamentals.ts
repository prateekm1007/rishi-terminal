'use client';

// hooks/useFundamentals.ts
// Fetches full live fundamentals: P/E, EPS, Market Cap, ROE, ROCE, Book Value, D/E, OPM, CAGR, Promoter
// Falls back to STOCKS static data if API unavailable
// Cache: localStorage, 24 hours

import { useState, useEffect, useRef } from 'react';
import { STOCKS } from '@/data/stocks/index';

export interface FullFundamentals {
  symbol: string;
  pe: number;
  eps: number;
  marketCap: number;
  roe: number;
  roce: number;
  bookValue: number;
  dividendYield: number;
  faceValue: number;
  debtToEquity: number;
  opm: number;
  revCagr3y: number;
  epsCagr: number;
  promoterHolding: number;
  fcf: number;
  roa: number;
  lastUpdated: string;
  source?: string;
  isLive: boolean;
}

export interface QuarterlyData {
  symbol: string;
  quarters: { period: string; revenue: number; netProfit: number; opm: number }[];
  source?: string;
}

export interface ShareholdingData {
  symbol: string;
  history: { period: string; promoter: number; fii: number; dii: number; public: number }[];
  source?: string;
}

const CACHE_KEY = 'rishi_fundamentals_cache_v2';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function loadCache(): Record<string, { data: any; cachedAt: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(cache: Record<string, { data: any; cachedAt: number }>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function getFromCache(key: string): any | null {
  const cache = loadCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) return null;
  return entry.data;
}

function setInCache(key: string, data: any) {
  const cache = loadCache();
  cache[key] = { data, cachedAt: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    const oldest = keys.sort((a, b) => cache[a].cachedAt - cache[b].cachedAt).slice(0, 100);
    oldest.forEach(k => delete cache[k]);
  }
  saveCache(cache);
}

function buildStaticFundamentals(symbol: string): FullFundamentals {
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
    debtToEquity: stock?.de ?? 0,
    opm: stock?.opm ?? 0,
    revCagr3y: stock?.revcagr ?? 0,
    epsCagr: stock?.epscagr ?? 0,
    promoterHolding: stock?.promo ?? 0,
    fcf: stock?.fcf ?? 0,
    roa: 0,
    lastUpdated: '',
    isLive: false,
  };
}

export function useFundamentals(symbol: string): {
  fundamentals: FullFundamentals | null;
  loading: boolean;
  isLive: boolean;
} {
  const [fundamentals, setFundamentals] = useState<FullFundamentals | null>(() => {
    const cached = getFromCache(`fund:${symbol}`);
    if (cached) return { ...cached, isLive: cached.source !== 'static' };
    return buildStaticFundamentals(symbol);
  });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = getFromCache(`fund:${symbol}`);
    if (cached) { setFundamentals({ ...cached, isLive: cached.source !== 'static' }); return; }

    setLoading(true);
    fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted.current) return;
        if (data && data.pe !== undefined) {
          const live: FullFundamentals = { ...data, isLive: data.source !== 'static' };
          setFundamentals(live);
          setInCache(`fund:${symbol}`, live);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted.current) setLoading(false); });

    return () => { mounted.current = false; };
  }, [symbol]);

  return {
    fundamentals,
    loading,
    isLive: fundamentals?.isLive ?? false,
  };
}

export function useQuarterly(symbol: string): {
  quarterly: QuarterlyData | null;
  loading: boolean;
} {
  const [quarterly, setQuarterly] = useState<QuarterlyData | null>(() => getFromCache(`qtr:${symbol}`));
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = getFromCache(`qtr:${symbol}`);
    if (cached) { setQuarterly(cached); return; }

    setLoading(true);
    fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}&type=quarterly`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted.current || !data) return;
        setQuarterly(data);
        setInCache(`qtr:${symbol}`, data);
      })
      .catch(() => {})
      .finally(() => { if (mounted.current) setLoading(false); });

    return () => { mounted.current = false; };
  }, [symbol]);

  return { quarterly, loading };
}

export function useShareholding(symbol: string): {
  shareholding: ShareholdingData | null;
  loading: boolean;
} {
  const [shareholding, setShareholding] = useState<ShareholdingData | null>(() => getFromCache(`sh:${symbol}`));
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = getFromCache(`sh:${symbol}`);
    if (cached) { setShareholding(cached); return; }

    setLoading(true);
    fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}&type=shareholding`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted.current || !data) return;
        setShareholding(data);
        setInCache(`sh:${symbol}`, data);
      })
      .catch(() => {})
      .finally(() => { if (mounted.current) setLoading(false); });

    return () => { mounted.current = false; };
  }, [symbol]);

  return { shareholding, loading };
}

// Bulk fundamentals hook (used by CompareTab, StockTable, PeerComparison)
export function useBulkFundamentals(symbols: string[]): {
  fundamentals: Record<string, FullFundamentals>;
  loading: boolean;
} {
  const symbolsKey = symbols.slice().sort().join(',');

  const [fundamentals, setFundamentals] = useState<Record<string, FullFundamentals>>(() => {
    const result: Record<string, FullFundamentals> = {};
    for (const sym of symbols) {
      const cached = getFromCache(`fund:${sym}`);
      result[sym] = cached ?? buildStaticFundamentals(sym);
    }
    return result;
  });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const toFetch = symbols.filter(s => !getFromCache(`fund:${s}`));
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
              const live: FullFundamentals = { ...data[sym], isLive: data[sym].source !== 'static' };
              next[sym] = live;
              setInCache(`fund:${sym}`, live);
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

export type { FullFundamentals as Fundamentals };