'use client';

import { useState, useEffect, useRef } from 'react';
import { Stock } from '../../lib/types';

interface LivePriceWidgetProps {
  stock: Stock;
}

export function LivePriceWidget({ stock }: LivePriceWidgetProps) {
  const [displayPrice, setDisplayPrice]     = useState<number>(stock.price);
  const [changePercent, setChangePercent]   = useState<number>(stock.change || 0);
  const [changeAbs, setChangeAbs]           = useState<number>(0);
  const [loading, setLoading]               = useState(true);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [flashGreen, setFlashGreen]         = useState(false);
  const [flashRed, setFlashRed]             = useState(false);
  const prevPriceRef                        = useRef<number>(stock.price);

  const fetchPrice = async () => {
    try {
      const res = await fetch('/api/prices/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbols: [stock.symbol] }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const entry = data[stock.symbol];
      if (!entry || typeof entry.price !== 'number') return;

      const newPrice  = entry.price;
      const prevPrice = prevPriceRef.current;

      // Flash animation on price change
      if (newPrice > prevPrice) {
        setFlashGreen(true);
        setTimeout(() => setFlashGreen(false), 600);
      } else if (newPrice < prevPrice) {
        setFlashRed(true);
        setTimeout(() => setFlashRed(false), 600);
      }

      prevPriceRef.current = newPrice;
      setDisplayPrice(newPrice);
      setChangePercent(
        typeof entry.changePercent24h === 'number' ? entry.changePercent24h :
        typeof entry.change           === 'number' ? entry.change           : 0
      );
      setChangeAbs(newPrice - stock.price);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[LivePriceWidget] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [stock.symbol]);

  const isPositive = changePercent >= 0;

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
          LIVE PRICE
        </span>
        {loading ? (
          <span style={{ fontSize: 9, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
            ⟳ FETCHING
          </span>
        ) : (
          <span style={{
            fontSize:   9,
            fontFamily: 'monospace',
            color:      'var(--accent-green)',
            display:    'flex',
            alignItems: 'center',
            gap:        4,
          }}>
            <span style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   'var(--accent-green)',
              display:      'inline-block',
              animation:    'pulse 2s infinite',
            }} />
            LIVE
          </span>
        )}
      </div>

      {/* Main price */}
      <div style={{
        fontSize:    36,
        fontFamily:  'monospace',
        fontWeight:  700,
        color:       'var(--text-primary)',
        lineHeight:  1,
        marginBottom: 8,
        letterSpacing: -1,
      }}>
        {displayPrice.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>

      {/* Change row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize:   13,
          fontFamily: 'monospace',
          fontWeight: 700,
          color:      isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
        <span style={{
          fontSize:   11,
          fontFamily: 'monospace',
          color:      'var(--text-muted)',
        }}>
          ({isPositive ? '+' : ''}{changeAbs.toFixed(2)})
        </span>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 10 }}>
          Updated {lastUpdated.toLocaleTimeString('en-IN')}
        </div>
      )}

      {/* 52W range bar */}
      {stock.high52w && stock.low52w && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
            <span>52W LOW {stock.low52w.toLocaleString('en-IN')}</span>
            <span>{stock.high52w.toLocaleString('en-IN')} HIGH</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              borderRadius: 2,
              width: Math.min(100, Math.max(0,
                ((displayPrice - stock.low52w) / (stock.high52w - stock.low52w)) * 100
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