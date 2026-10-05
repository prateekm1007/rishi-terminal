'use client';

import { useState, useEffect, useRef } from 'react';
import { Stock } from '../../lib/types';
import {
  presentationState,
  statusLabel,
  statusColor,
  absChangeFromPercent,
  formatChangePair,
  observationLabel,
  type ObservationMarketState,
  type PresentationState,
} from '../../lib/pricePresentation';

interface LiveEntry {
  price?: number;
  change?: number;
  changePercent24h?: number;
  source?: string;
  status?: string;
  /** The server's upstream observation time (ISO) — null when the
   *  upstream disclosed none. Round 9: this, never `new Date()`, is the
   *  "Updated …" clock. */
  observedAt?: string | null;
  lastUpdated?: string | null;
}

interface LivePriceWidgetProps {
  stock: Stock;
  /** X3 (Round 11): the SSR initial observation — a read-only peek at the
   *  shared quote cache taken on the server. Null when nothing is cached;
   *  the first paint then shows the honest UNAVAILABLE state (never
   *  "FETCHING") and the client fetch on mount fills the tile. */
  initialEntry?: LiveEntry | null;
  /** Y3: the server-disclosed NSE market state at the first byte (page
   *  regeneration time, frozen into the ISR HTML). The refresh path
   *  replaces it with the state the batch payload discloses — the label
   *  never derives a market claim from the viewer's clock (Rule 18). */
  initialMarket?: ObservationMarketState | null;
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
export function LivePriceWidget({ stock, initialEntry = null, initialMarket = null }: LivePriceWidgetProps) {
  // X3: the first paint renders the SSR observation verbatim (or the
  // honest UNAVAILABLE state) — hydration and the server render produce
  // identical output, and "⟳ FETCHING" only ever appears for
  // post-hydration REfetches (an already-rendered tile refreshing), never
  // in the first byte. All values derive from the server-disclosed
  // observation (deterministic — Rule 18); nothing here reads the clock.
  const initialPrice =
    initialEntry != null &&
    typeof initialEntry.price === 'number' &&
    Number.isFinite(initialEntry.price) &&
    initialEntry.price > 0
      ? initialEntry.price
      : null;
  const initialUsable = initialPrice !== null;
  const initialPct =
    initialUsable && initialEntry != null
      ? (typeof initialEntry.changePercent24h === 'number'
          ? initialEntry.changePercent24h
          : typeof initialEntry.change === 'number'
            ? initialEntry.change
            : null)
      : null;
  const [displayPrice, setDisplayPrice]       = useState<number | null>(initialPrice);
  const [changePercent, setChangePercent]     = useState<number | null>(initialPct);
  const [changeAbs, setChangeAbs]             = useState<number | null>(initialPct !== null && initialPrice !== null ? absChangeFromPercent(initialPrice, initialPct) : null);
  const [state, setState]                     = useState<PresentationState>(presentationState(initialEntry));
  const [source, setSource]                   = useState<string | undefined>(initialEntry?.source);
  const [loading, setLoading]                 = useState(false);
  // Y3: the observed-at ISO string is kept so the observation line renders
  // from the shared label builder (date + tz + market state), and the
  // market state itself is server-disclosed (initialMarket, then the batch
  // payload's top-level `market`) — never the viewer's clock (Rule 18).
  // (The legacy `lastUpdated` Date state is gone — the label no longer
  // renders a bare toLocaleTimeString clock.)
  const [observedIso, setObservedIso]         = useState<string | null>(initialUsable && initialEntry != null ? (initialEntry.observedAt ?? initialEntry.lastUpdated ?? null) : null);
  const [market, setMarket]                   = useState<ObservationMarketState | null>(initialMarket);
  const [flashGreen, setFlashGreen]           = useState(false);
  const [flashRed, setFlashRed]               = useState(false);
  const prevPriceRef                          = useRef<number | null>(initialPrice);

  const fetchPrice = async () => {
    // X3: the ⟳ FETCHING badge only ever appears for REfetches — a tile
    // that already renders an observation refreshing itself, post-hydration.
    // It must never appear in the first byte (SSR renders the cached
    // observation or the honest UNAVAILABLE state instead).
    if (prevPriceRef.current !== null) setLoading(true);
    try {
      const res = await fetch('/api/prices/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbols: [stock.symbol] }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      // Y3: the batch payload discloses the NSE market state top-level (U2)
      // — the server decides, the label only repeats it (Rule 7).
      if (data?.market && typeof data.market.open === 'boolean' && typeof data.market.sessionDate === 'string') {
        setMarket({ open: data.market.open, sessionDate: data.market.sessionDate });
      }
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
        // Round 9 (Rule 16): a MISSING change stays null — it renders as
        // "—", never as a fabricated 0.00% / +0.00 move.
        const pct =
          typeof entry.changePercent24h === 'number' ? entry.changePercent24h :
          typeof entry.change           === 'number' ? entry.change           : null;
        setChangePercent(pct);
        setChangeAbs(pct !== null ? absChangeFromPercent(newPrice, pct) : null);
        // Y3: keep the disclosed ISO so the stamp + market-state label can
        // re-render from the shared builder (the legacy lastUpdated Date
        // state is gone — no bare clock is rendered anywhere).
        setObservedIso(entry.observedAt ?? entry.lastUpdated ?? null);
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

  // Round 9: the display pair (and its direction/color claim) comes from
  // the shared formatter — a missing change renders "—" with no arrow and
  // no green/red claim; a genuine 0.00% is a real observation.
  const change = formatChangePair(changePercent, changeAbs);
  const hasPrice = displayPrice !== null;
  // R16 C5: typed 52W metadata accessor — replaces the previous repeated
  // `stock as any` casts (the lint ratchet owns every warning in this file).
  const range52w = (stock as { metadata?: { high52w?: number; low52w?: number } }).metadata;
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
      // Z5 CLS reservation: a FIXED footprint (not minWidth) — the widget's
      // own content updates (mount refetch rewriting the Y3 observation
      // line) must re-flow INSIDE a stable box, never the header row
      // (the auto-width box measured +0.058 CLS on a throttled load).
      width:         380,
      boxSizing:     'border-box',
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
          (Round 9), stamped Y3-style: IST date + clock + timezone + the
          server-disclosed market state ("… · market closed · last session
          quote"). R16 C5: absent an observation the line's GEOMETRY is
          still reserved — the late-arriving attribution used to grow the
          tile and push the whole content-wrapper down (measured CLS 0.053
          on mobile, Lighthouse layout-shift trace).
          R18 fix(C5): the reserve and the real line are BOTH fixed at the
          2-line height (2 × 14px lineHeight, overflow hidden). The real
          label wraps to two lines at the tile's fixed 380px width — the
          old 1-line (14px) reserve made the tile grow by the second line
          and shift the content-wrapper (deterministic CLS 0.038396,
          reproduced locally and in CI; docs/evidence/round18/). A fixed
          2-line footprint can never change height on the late fill, so
          the shift is structurally impossible; no honest text is
          truncated. */}
      {(() => {
        const obsLabel = observationLabel(observedIso, market);
        if (!obsLabel) {
          return <div aria-hidden="true" style={{ fontSize: 9, fontFamily: 'monospace', marginTop: 10, lineHeight: '14px', height: 28 }} />;
        }
        return (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 10, lineHeight: '14px', height: 28, overflow: 'hidden' }}>
            {obsLabel}
          </div>
        );
      })()}

      {/* 52W range bar — only meaningful once a server observation exists.
          R16 C5: when the metadata exists but the price has not arrived
          yet, the bar's GEOMETRY is reserved (same margin + a 20px slot:
          12px label line + 4px gap + 4px track) so the late fill cannot
          grow the tile (CLS guard, same rationale as the observation
          line above). */}
      {displayPrice !== null && range52w?.high52w !== undefined && range52w?.low52w !== undefined && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4, lineHeight: '12px' }}>
            <span>52W LOW {range52w?.low52w?.toLocaleString('en-IN')}</span>
            <span>{range52w?.high52w?.toLocaleString('en-IN')} HIGH</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              borderRadius: 2,
              width: Math.min(100, Math.max(0,
                ((displayPrice - (range52w?.low52w ?? 0)) / ((range52w?.high52w ?? 0) - (range52w?.low52w ?? 0))) * 100
              )) + '%',
              background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-green))',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}
      {displayPrice === null && range52w?.high52w !== undefined && range52w?.low52w !== undefined && (
        <div aria-hidden="true" style={{ marginTop: 14, height: 20 }} />
      )}
    </div>
  );
}