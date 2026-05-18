'use client';

import { useState, useEffect } from 'react';

interface Props {
  symbol: string;
  price?: number;      // seed fallback only
  change24h?: number;  // seed fallback only
}

export function LivePriceWidget({ symbol, price: seedPrice = 0, change24h: seedChange = 0 }: Props) {
  const [livePrice, setLivePrice]   = useState<number>(seedPrice);
  const [liveChange, setLiveChange] = useState<number>(seedChange);
  const [loading, setLoading]       = useState(true);
  const [flash, setFlash]           = useState(false);

  useEffect(() => {
    if (!symbol) return;

    async function fetchPrice() {
      try {
        const res = await fetch('/api/prices/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [symbol] }),
        });

        if (!res.ok) return;

        const data = await res.json();

        // API returns { prices: { SYMBOL: { current, change, changePct } } }
        // or { SYMBOL: { price, change } } depending on route version
        const entry = data?.prices?.[symbol] ?? data?.[symbol];

        if (entry) {
          const newPrice  = entry.current  ?? entry.price  ?? 0;
          const newChange = entry.changePct ?? entry.change ?? 0;

          if (newPrice > 0) {
            setLivePrice(newPrice);
            setLiveChange(newChange);
            setFlash(true);
            setTimeout(() => setFlash(false), 800);
          }
        }
      } catch (err) {
        console.error('[LivePriceWidget] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    // Fetch immediately
    fetchPrice();

    // Refresh every 60 seconds
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  const positive  = liveChange >= 0;
  const formatted = new Intl.NumberFormat('en-IN').format(
    Math.round(livePrice * 100) / 100
  );

  return (
    <div style={{
      padding:      '16px 20px',
      borderRadius: 16,
      background:   '#111827',
      border:       `1px solid ${flash ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.08)'}`,
      transition:   'border-color 0.3s ease',
      minWidth:     140,
    }}>
      {loading && livePrice === seedPrice ? (
        <div style={{ fontSize: 28, fontWeight: 700, color: '#64748B' }}>
          Loading...
        </div>
      ) : (
        <>
          <div style={{
            fontSize:   32,
            fontWeight: 700,
            color:      flash ? '#D4AF37' : '#F8FAFC',
            transition: 'color 0.3s ease',
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}>
            {formatted}
          </div>
          <div style={{
            marginTop:  6,
            fontSize:   13,
            color:      positive ? '#22C55E' : '#EF4444',
            fontWeight: 600,
          }}>
            {positive ? '▲' : '▼'} {positive ? '+' : ''}{liveChange.toFixed(2)}%
          </div>
          <div style={{
            marginTop: 4,
            fontSize:  10,
            color:     '#374151',
            fontFamily: 'monospace',
          }}>
            LIVE · NSE
          </div>
        </>
      )}
    </div>
  );
}