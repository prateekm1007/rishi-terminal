'use client';

import { useState, useEffect, useRef } from 'react';
import { Stock } from '../../lib/types';
import { presentationState, statusLabel, statusColor, absChangeFromPercent, type PresentationState } from '../../lib/pricePresentation';

interface LiveEntry {
  price?: number;
  change?: number;
  changePercent24h?: number;
  source?: string;
  status?: string;
}

interface LivePriceWidgetProps {
  stock: Stock;
}

/**
 * Phase 5.1 (T47/T57 correction): the seed price is NEVER rendered as a
 * live quote. Until the canonical API supplies an observation the tile
 * shows "—"; the status label derives from the server's provenance status
 * (LIVE/CACHED/DERIVED/STATIC/UNAVAILABLE, with Yahoo-transported quotes
 * labelled DELAYED). The previous behavior — seed price on screen with a
 * pulsing "LIVE" badge even when the API returned UNAVAILABLE — was a
 * provenance violation and is removed.
 */
export function LivePriceWidget({ stock }: LivePriceWidgetProps) {
  const [displayPrice, setDisplayPrice]       = useState<number | null>(null);
  const [changePercent, setChangePercent]     = useState<number | null>(null);
  const [changeAbs, setChangeAbs]             = useState<number | null>(null);
  const [state, setState]                     = useState<PresentationState>('loading');
  const [source, setSource]                   = useState<string | undefined>(undefined);
  const [loading, setLoading]                 = useState(true);
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const [flashGreen, setFlashGreen]           = useState(false);
  const [flashRed, setFlashRed]               = useState(false);
  const prevPriceRef                          = useRef<number | null>(null);

  const fetchPrice = async () => {
    try {
      const res = await fetch('/api/prices/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbols: [stock.symbol] }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const entry = data?.[stock.symbol] as LiveEntry | undefined;
      if (!entry) {
        setState('unavailable');
        return;
      }

      const next = presentationState(entry);
      setSource(entry.source);
      setState(next);

      // Only a usable observation updates the displayed number. UNAVAILABLE
      // responses leave the previous observation on screen but relabel it —
      // they never fabricate a price and never show the seed value.
      if (typeof entry.price === 'number' && Number.isFinite(entry.price) && entry.price > 0) {
        const newPrice  = entry.price;
        const prevPrice = prevPriceRef.current;

        // Flash animation on price change
        if (prevPrice !== null && newPrice > prevPrice) {
          setFlashGreen(true);
          setTimeout(() => setFlashGreen(false), 600);
        } else if (prevPrice !== null && newPrice < prevPrice) {
          setFlashRed(true);
          setTimeout(() => setFlashRed(false), 600);
        }

        prevPriceRef.current = newPrice;
        setDisplayPrice(newPrice);
        // The API transports only a PERCENT change (lib/livePrice.ts reads
        // regularMarketChangePercent / pChange — `change` and
        // `changePercent24h` are the same number). The absolute move is
        // derived from this observation's own price + percent (H2): mixing
        // the live price with the seed `stock.price` produced
        // "−1.63% (−1332.30)" on /stock/RELIANCE.
        const pct =
          typeof entry.changePercent24h === 'number' ? entry.changePercent24h :
          typeof entry.change           === 'number' ? entry.change           : null;
        setChangePercent(pct ?? 0);
        setChangeAbs(pct !== null ? absChangeFromPercent(newPrice, pct) : null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('[LivePriceWidget] fetch error:', err);
      setState('unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [stock.symbol]);

  const isPositive = (changePercent ?? 0) >= 0;
  const hasPrice = displayPrice !== null;

  const flashBg = flashGreen
    ? 'rgba(0,186,124,0.15)'
    : flashRed
    ? 'rgba(244,33,46,0.15)'
    : 'var(--bg-card)';

  return (
    <div style={{
      background:    flashBg,
      border:        '1px solid var(--border-primary)',
      borderRadius:  12,
      padding:       '20px 24px',
      minWidth:      220,
      transition:    'background 0.3s ease',
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2 }}>
          PRICE
        </span>
        {loading ? (
          <span style={{ fontSize: 9, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
            ⟳ FETCHING
          </span>
        ) : (
          <span style={{
            fontSize:   9,
            fontFamily: 'monospace',
            color:      statusColor(state) === '#64748B' ? 'var(--text-muted)' : statusColor(state),
            display:    'flex',
            alignItems: 'center',
            gap:        4,
          }}>
            {state === 'live' && (
              <span style={{
                width:        6,
                height:       6,
                borderRadius: '50%',
                background:   statusColor(state),
                display:      'inline-block',
                animation:    'pulse 2s infinite',
              }} />
            )}
            {statusLabel(state, source)}
          </span>
        )}
      </div>

      {/* Main price — "—" until a real server observation exists (T57) */}
      <div style={{
        fontSize:    36,
        fontFamily:  'monospace',
        fontWeight:  700,
        color:       'var(--text-primary)',
        lineHeight:  1,
        marginBottom: 8,
        letterSpacing: -1,
      }}>
        {hasPrice
          ? displayPrice.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '—'}
      </div>

      {/* Change row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize:   13,
          fontFamily: 'monospace',
          fontWeight: 700,
          color:      hasPrice ? (isPositive ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-muted)',
        }}>
          {hasPrice ? `${isPositive ? '▲' : '▼'} ${isPositive ? '+' : ''}${(changePercent ?? 0).toFixed(2)}%` : '—'}
        </span>
        <span style={{
          fontSize:   11,
          fontFamily: 'monospace',
          color:      'var(--text-muted)',
        }}>
          {hasPrice ? `(${isPositive ? '+' : ''}${(changeAbs ?? 0).toFixed(2)})` : '—'}
        </span>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 10 }}>
          Updated {lastUpdated.toLocaleTimeString('en-IN')}
        </div>
      )}

      {/* 52W range bar — only meaningful once a server observation exists */}
      {displayPrice !== null && (stock as any).metadata?.high52w && (stock as any).metadata?.low52w && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
            <span>52W LOW {(stock as any).metadata?.low52w.toLocaleString('en-IN')}</span>
            <span>{(stock as any).metadata?.high52w.toLocaleString('en-IN')} HIGH</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              borderRadius: 2,
              width: Math.min(100, Math.max(0,
                ((displayPrice - (stock as any).metadata?.low52w) / ((stock as any).metadata?.high52w - (stock as any).metadata?.low52w)) * 100
              )) + '%',
              background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-green))',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}