// hooks/useTechnicalData.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { TechnicalIndicators } from "@/lib/technical";

const cache = new Map<string, { data: TechnicalIndicators; ts: number }>();
const CACHE_TTL = 60_000;

export function useTechnicalData(symbol: string) {
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    const sym = (symbol ?? "").trim();
    if (!sym) {
      setIndicators(null);
      setLoading(false);
      setError("Missing symbol");
      return;
    }

    const cached = cache.get(sym);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setIndicators(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/technical?symbol=${encodeURIComponent(sym)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const data: TechnicalIndicators | undefined = json?.indicators;
      if (!data) throw new Error("No indicators returned");

      cache.set(sym, { data, ts: Date.now() });
      setIndicators(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchData, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [fetchData]);

  return { indicators, loading, error, refetch: fetchData };
}