'use client';

import { useState, useEffect } from 'react';
import { presentationState, statusLabel, statusColor, type PresentationState } from '@/lib/pricePresentation';

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
 * Live price tile — Phase 5 T44/T47/T48/T57 compliant (Phase 5.1 corrected).
 *
 * - T44: ALL data flows through the canonical API route (/api/prices/batch),
 *   never a provider URL from the browser.
 * - T48: the response's `source` is shown, not a hard-coded exchange name.
 * - T57: when no live observation exists the tile renders "—" and
 *   UNAVAILABLE. It never renders a seed/placeholder number as a price.
 * - Phase 5.1 (T47): the presentation state derives from the SERVER's
 *   status field — LIVE / CACHED / DERIVED / STATIC / UNAVAILABLE each
 *   render with their own label. A numeric value with status STATIC is
 *   shown as a static reference value, never as "LIVE". Yahoo-transported
 *   observations render "DELAYED" (matrix: Yahoo is a delayed snapshot,
 *   never labelled realtime).
 */
export function LivePriceWidget({ symbol }: Props) {
  const [entry, setEntry] = useState<LiveEntry | null>(null);
  const [state, setState] = useState<PresentationState>('loading');

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
          // Phase 5.1: store the entry and derive the presentation state from
          // the server's status — never "live" just because a number exists.
          if (e) {
            setEntry(e);
            setState(presentationState(e));
            return;
          }
        }
        // No observation: honest unavailability (T57).
        setEntry(null);
        setState('unavailable');
      } catch {
        if (!cancelled) {
          setEntry(null);
          setState('unavailable');
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
  // Numeric display: any state with a usable value shows the number; the
  // LABEL carries the honest freshness semantics. Unavailable/loading show "—".
  const showNumber = state === 'live' || state === 'cached' || state === 'derived' || state === 'static';
  const formatted = showNumber
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
        color: !showNumber ? '#64748B' : positive ? '#22C55E' : '#EF4444',
        fontWeight: 600,
      }}>
        {showNumber ? `${arrow} ${Math.abs(change).toFixed(2)}%` : '—'}
      </div>
      <div style={{
        marginTop: 4,
        fontSize: 10,
        fontFamily: 'monospace',
        color: statusColor(state),
      }}>
        {statusLabel(state, entry?.source)}
      </div>
    </div>
  );
}
