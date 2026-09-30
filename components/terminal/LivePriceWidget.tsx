'use client';

import { useState, useEffect } from 'react';

interface Props {
  symbol: string;
  /** @deprecated T57: seed values are never rendered as live prices. Ignored. */
  price?: number;
  /** @deprecated T57: ignored. */
  change24h?: number;
}

interface LiveEntry {
  price?: number;
  change?: number;
  source?: string;
  status?: string;
}

/**
 * Live price tile — Phase 5 T44/T47/T48/T57 compliant.
 *
 * - T44: ALL data flows through the canonical API route (/api/prices/batch),
 *   never a provider URL from the browser. (The old direct NSE fallback
 *   violated this: unvalidated payload, no provenance, and browsers cannot
 *   even set the User-Agent header it tried to spoof.)
 * - T48: the response's `source` is shown, not a hard-coded exchange name.
 * - T57: when no live observation exists the tile renders "—" and
 *   UNAVAILABLE. It never renders a seed/placeholder number as a price.
 */
export function LivePriceWidget({ symbol }: Props) {
  const [entry, setEntry] = useState<LiveEntry | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchThroughCanonicalApi() {
      try {
        const apiRes = await fetch('/api/prices/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [symbol] }),
        });

        if (cancelled) return;

        if (apiRes.ok) {
          const data = (await apiRes.json()) as Record<string, LiveEntry>;
          const e = data?.[symbol];
          if (e && typeof e.price === 'number' && e.price > 0) {
            setEntry(e);
            setStatus('live');
            return;
          }
        }
        // No live observation: honest unavailability (T57).
        setEntry(null);
        setStatus('unavailable');
      } catch {
        if (!cancelled) {
          setEntry(null);
          setStatus('unavailable');
        }
      }
    }

    fetchThroughCanonicalApi();
    const interval = setInterval(fetchThroughCanonicalApi, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbol]);

  const price = entry?.price ?? 0;
  const change = entry?.change ?? 0;
  const positive = change >= 0;
  const arrow = positive ? '+' : '-';
  const formatted =
    status === 'live'
      ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(price)
      : '—';

  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: 16,
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.08)',
      minWidth: 140,
    }}>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        color: '#F8FAFC',
        fontFamily: 'monospace',
        letterSpacing: 1,
      }}>
        {formatted}
      </div>
      <div style={{
        marginTop: 6,
        fontSize: 13,
        color: status !== 'live' ? '#64748B' : positive ? '#22C55E' : '#EF4444',
        fontWeight: 600,
      }}>
        {status === 'live' ? `${arrow} ${Math.abs(change).toFixed(2)}%` : '—'}
      </div>
      <div style={{
        marginTop: 4,
        fontSize: 10,
        fontFamily: 'monospace',
        color: status === 'live' ? '#22C55E' : '#64748B',
      }}>
        {status === 'live'
          ? `LIVE · ${(entry?.source ?? 'canonical').toUpperCase()}`
          : status === 'unavailable'
            ? 'UNAVAILABLE'
            : 'LOADING…'}
      </div>
    </div>
  );
}
