'use client';

import { useState, useEffect, useRef } from 'react';
import { Stock } from '../../lib/types';
import {
  presentationState,
  statusLabel,
  statusColor,
  absChangeFromPercent,
  formatChangePair,
  observationDateFromEntry,
  type PresentationState,
} from '../../lib/pricePresentation';

interface LiveEntry {
  price?: number | null;
  change?: number | null;
  changePercent24h?: number | null;
  source?: string | null;
  status?: string | null;
  /** The server's upstream observation time (ISO) — null when the
   *  upstream disclosed none. Round 9: this, never `new Date()`, is the
   *  "Updated …" clock. */
  observedAt?: string | null;
  lastUpdated?: string | null;
}

interface LivePriceWidgetProps {
  stock: Stock;
  /** X3 (founder round 11): the server's read-only peek of the shared
   *  quote cache — boots the tile with a real observation so the FIRST
   *  BYTE carries a price and an honest label (never a fetch spinner
   *  placeholder). The mount revalidation below still runs through the
   *  normal API path. */
  initialEntry?: LiveEntry | null;
}

/**
 * Phase 5.1 (T47/T57 correction): the seed price is NEVER rendered as a
 * live quote. Until the canonical API supplies an observation the tile
 * shows "—"; the status label derives from the server's provenance status
 * (LIVE/CACHED/DERIVED/STATIC/UNAVAILABLE, with Yahoo-transported quotes
 * labelled DELAYED). The previous behavior — seed price on screen with a
 * pulsing "LIVE" badge even when the API returned UNAVAILABLE — was a
 * provenance violation and is removed.
 *
 * X3: the tile no longer BOOTS as a fetch placeholder. With a server
 * entry it starts settled on that observation (label CACHED/DELAYED per
 * lib/pricePresentation); without one it starts on the honest
 * unavailable state — the fetch flash is gone from the first byte.
 */
export function LivePriceWidget({ stock, initialEntry }: LivePriceWidgetProps) {
  const [displayPrice, setDisplayPrice]       = useState<number | null>(initialEntry && typeof initialEntry.price === 'number' ? initialEntry.price : null);
  const [changePercent, setChangePercent]     = useState<number | null>(
    initialEntry
      ? (typeof initialEntry.changePercent24h === 'number' ? initialEntry.changePercent24h
        : typeof initialEntry.change === 'number' ? initialEntry.change
        : null)
      : null,
  );
  const [changeAbs, setChangeAbs]             = useState<number | null>(
    displayPrice !== null && changePercent !== null ? absChangeFromPercent(displayPrice, changePercent) : null,
  );
  const [state, setState]                     = useState<PresentationState>(presentationState(initialEntry));
  const [source, setSource]                   = useState<string | undefined>(initialEntry?.source ?? undefined);
  // X3: there is no fetch-spinner state anymore — the tile boots settled
  // on the server's entry (or on the honest unavailable state when the
  // cache could not serve one); mount revalidation updates in place,
  // silently.
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(initialEntry ? observationDateFromEntry(initialEntry) : null);
  const [flashGreen, setFlashGreen]           = useState(false);
  const [flashRed, setFlashRed]               = useState(false);
  const prevPriceRef                          = useRef<number | null>(displayPrice);

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
      setSource(entry.source ?? undefined);
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
        // Round 9 (Rule 16): a MISSING change stays null — it renders as
        // "—", never as a fabricated 0.00% / +0.00 move.
        const pct =
          typeof entry.changePercent24h === 'number' ? entry.changePercent24h :
          typeof entry.change           === 'number' ? entry.change           : null;
        setChangePercent(pct);
        setChangeAbs(pct !== null ? absChangeFromPercent(newPrice, pct) : null);
        // Round 9: the clock is the UPSTREAM observation time when the
        // server disclosed one — never the browser fetch time. No disclosed
        // time → the "Updated" line does not render at all.
        setLastUpdated(observationDateFromEntry(entry));
      }
    } catch (err) {
      console.error('[LivePriceWidget] fetch error:', err);
      setState('unavailable');
    }
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [stock.symbol]);

  // Round 9: the display pair (and its direction/color claim) comes from
  // the shared formatter — a missing change renders "—" with no arrow and
  // no green/red claim; a genuine 0.00% is a real observation.
  const change = formatChangePair(changePercent, changeAbs);
  const hasPrice = displayPrice !== null;
  const changeColor =
    !hasPrice || change.positive === null
      ? 'var(--text-muted)'
      : change.positive
        ? 'var(--accent-green)'
        : 'var(--accent-red)';

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
        {/* X3: the honest label always — a settled observation renders its
            provenance (LIVE/CACHED/DELAYED · source); a tile the server
            could not fill renders UNAVAILABLE. The first byte never shows
            a fetch placeholder. */}
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

      {/* Change row — Round 9 (Rule 16): a missing change is "—", never a
          fabricated 0.00% with an arrow (formatChangePair owns the shape). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize:   13,
          fontFamily: 'monospace',
          fontWeight: 700,
          color:      changeColor,
        }}>
          {hasPrice ? change.pctText : '—'}
        </span>
        <span style={{
          fontSize:   11,
          fontFamily: 'monospace',
          color:      'var(--text-muted)',
        }}>
          {hasPrice ? change.absText : '—'}
        </span>
      </div>

      {/* Last updated — the UPSTREAM observation time when disclosed
          (Round 9); absent a disclosed time, the line does not render —
          there is no honest clock to show. */}
      {lastUpdated && (
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 10 }}>
          Observed {lastUpdated.toLocaleTimeString('en-IN')}
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