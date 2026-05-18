'use client';

import { useState, useEffect } from 'react';

interface Props {
  symbol: string;
  price?: number;
  change24h?: number;
}

export function LivePriceWidget({ symbol, price: seedPrice = 0, change24h: seedChange = 0 }: Props) {
  const [livePrice, setLivePrice] = useState<number>(seedPrice);
  const [liveChange, setLiveChange] = useState<number>(seedChange);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    async function fetchPrice() {
      try {
        const res = await fetch('/api/prices/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [symbol] }),
        });

        if (!res.ok) {
          console.log('[LivePriceWidget] API error:', res.status);
          return;
        }

        const data = await res.json();
        console.log('[LivePriceWidget] Raw response:', JSON.stringify(data).slice(0, 200));

        // API returns flat format: { SYMBOL: { price, change, lastUpdated } }
        const entry = data[symbol];

        if (entry && entry.price > 0) {
          console.log('[LivePriceWidget] Found price for', symbol, ':', entry.price);
          setLivePrice(entry.price);
          setLiveChange(entry.change || 0);
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
        } else {
          console.log('[LivePriceWidget] No valid entry for', symbol, ':', entry);
        }
      } catch (err) {
        console.error('[LivePriceWidget] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  const positive = liveChange >= 0;
  
  // Format with Indian number style (lakhs, crores)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(livePrice);

  // Use ASCII arrows to avoid encoding issues
  const arrow = positive ? '^' : 'v';

  return (
    <div style={{
      padding: '16px 20px',
      borderRadius: 16,
      background: '#111827',
      border: `1px solid ${flash ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.08)'}`,
      transition: 'border-color 0.3s ease',
      minWidth: 140,
    }}>
      {loading && livePrice === seedPrice ? (
        <div style={{ fontSize: 28, fontWeight: 700, color: '#64748B' }}>
          Loading...
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: flash ? '#D4AF37' : '#F8FAFC',
            transition: 'color 0.3s ease',
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}>
            {formatted}
          </div>
          <div style={{
            marginTop: 6,
            fontSize: 13,
            color: positive ? '#22C55E' : '#EF4444',
            fontWeight: 600,
          }}>
            {arrow} {positive ? '+' : ''}{liveChange.toFixed(2)}%
          </div>
          <div style={{
            marginTop: 4,
            fontSize: 10,
            color: '#374151',
            fontFamily: 'monospace',
          }}>
            LIVE - NSE
          </div>
        </>
      )}
    </div>
  );
}