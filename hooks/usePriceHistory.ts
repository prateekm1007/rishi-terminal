// hooks/usePriceHistory.ts
// WORLD_CLASS_CHART_V1
'use client';
import { useState, useEffect, useRef } from 'react';

export type Timeframe = '1D'|'1W'|'1M'|'3M'|'6M'|'1Y'|'3Y'|'5Y'|'MAX';

export interface PricePoint { t: number; v: number; }

export interface PriceHistoryResult {
  points:  PricePoint[];
  loading: boolean;
  error:   string | null;
  source:  string | null;
}

export function usePriceHistory(symbol: string, tf: Timeframe): PriceHistoryResult {
  const [points,  setPoints]  = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [source,  setSource]  = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!symbol) return;

    // cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&tf=${tf}`, {
      signal: ctrl.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (ctrl.signal.aborted) return;
        setPoints(d.points ?? []);
        setSource(d.source ?? null);
        setLoading(false);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setError(String(e));
        setPoints([]);
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [symbol, tf]);

  return { points, loading, error, source };
}