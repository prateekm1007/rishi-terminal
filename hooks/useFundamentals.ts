'use client';

// hooks/useFundamentals.ts
// Fetches full live fundamentals: P/E, EPS, Market Cap, ROE, ROCE, Book Value, D/E, OPM, CAGR, Promoter
// N1 (round 3): no client-side seed fallback — the seed dataset is
// server-only. /api/fundamentals serves the labelled static fallback
// (source: 'static') server-side when live upstreams fail, so the hook
// stays honest without shipping STOCKS to the browser.
// Cache: localStorage, 24 hours

import { useState, useEffect, useRef } from 'react';

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
  /** Null when no upstream exposes a D/E (H4/T11 — never a fabricated
   *  constant, never a 0 that claims debt-free). */
  debtToEquity: number | null;
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

// v3 (H3/H4, audit 2026-10-01): the fundamentals payload contract changed —
// marketCap is now uniformly ₹ Cr and debtToEquity may be null. Entries
// cached under the old key can carry the corrupted ÷1e7 values and the
// fabricated 0.45 D/E, so the version bump forces one clean refetch.
const CACHE_KEY = 'rishi_fundamentals_cache_v3';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/** Cache payloads are opaque JSON snapshots (fundamentals / quarterly /
 * shareholding) — the consuming hooks own the narrowing, so `unknown` is
 * the honest element type (mirrors the R4 decision in the API cache). */
type CacheEntry = { data: unknown; cachedAt: number };

function loadCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, CacheEntry>;
    }
    return {};
  } catch { return {}; }
}

function saveCache(cache: Record<string, CacheEntry>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

function getFromCache(key: string): unknown {
  const cache = loadCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) return null;
  return entry.data;
}

/** Narrow an unknown cache payload back to FullFundamentals (N9). */
function isFullFundamentals(v: unknown): v is FullFundamentals {
  if (!v || typeof v !== 'object') return false;
  const f = v as Partial<FullFundamentals>;
  return typeof f.symbol === 'string' && typeof f.pe === 'number';
}

/** Cached fundamentals with the liveness flag recomputed from source. */
function fromCache(v: unknown): FullFundamentals | null {
  return isFullFundamentals(v) ? { ...v, isLive: v.source !== 'static' } : null;
}

function isQuarterlyData(v: unknown): v is QuarterlyData {
  if (!v || typeof v !== 'object') return false;
  const q = v as Partial<QuarterlyData>;
  return typeof q.symbol === 'string' && Array.isArray(q.quarters);
}

function isShareholdingData(v: unknown): v is ShareholdingData {
  if (!v || typeof v !== 'object') return false;
  const sh = v as Partial<ShareholdingData>;
  return typeof sh.symbol === 'string' && Array.isArray(sh.history);
}

function setInCache(key: string, data: unknown) {
  const cache = loadCache();
  cache[key] = { data, cachedAt: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    const oldest = keys.sort((a, b) => cache[a].cachedAt - cache[b].cachedAt).slice(0, 100);
    oldest.forEach(k => delete cache[k]);
  }
  saveCache(cache);
}

export function useFundamentals(symbol: string): {
  fundamentals: FullFundamentals | null;
  loading: boolean;
  isLive: boolean;
} {
  const [fundamentals, setFundamentals] = useState<FullFundamentals | null>(() =>
    fromCache(getFromCache(`fund:${symbol}`)),
  );
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = fromCache(getFromCache(`fund:${symbol}`));
    if (cached) { setFundamentals(cached); return; }

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
  const [quarterly, setQuarterly] = useState<QuarterlyData | null>(() => {
    const cached = getFromCache(`qtr:${symbol}`);
    return isQuarterlyData(cached) ? cached : null;
  });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = getFromCache(`qtr:${symbol}`);
    if (isQuarterlyData(cached)) { setQuarterly(cached); return; }

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
  const [shareholding, setShareholding] = useState<ShareholdingData | null>(() => {
    const cached = getFromCache(`sh:${symbol}`);
    return isShareholdingData(cached) ? cached : null;
  });
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cached = getFromCache(`sh:${symbol}`);
    if (isShareholdingData(cached)) { setShareholding(cached); return; }

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
      const cached = fromCache(getFromCache(`fund:${sym}`));
      if (cached) result[sym] = cached;
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