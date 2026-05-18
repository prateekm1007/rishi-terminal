'use client';

import { useState, useEffect } from 'react';

interface Props {
  symbol: string;
  price?: number;
  change24h?: number;
}

export function LivePriceWidget({ symbol, price: seedPrice = 0, change24h: seedChange = 0 }: Props) {
  const [price, setPrice] = useState<number>(seedPrice);
  const [change, setChange] = useState<number>(seedChange);
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchDirect() {
      try {
        // Try our API first (fastest if cached)
        const apiRes = await fetch('/api/prices/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: [symbol] }),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          const entry = data[symbol];
          if (entry?.price > 0) {
            if (!cancelled) {
              setPrice(entry.price);
              setChange(entry.change || 0);
              setStatus('live');
            }
            return; // Success
          }
        }

        // Fallback: try direct NSE fetch from browser (works in India)
        const nseRes = await fetch(
          `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36',
              'Accept': 'application/json',
              'Referer': 'https://www.nseindia.com/',
            },
            signal: AbortSignal.timeout(5000),
          }
        );

        if (nseRes.ok) {
          const data = await nseRes.json();
          const lastPrice = data?.priceInfo?.lastPrice;
          const pChange = data?.priceInfo?.pChange;

          if (lastPrice && !cancelled) {
            setPrice(Number(lastPrice));
            setChange(Number(pChange) || 0);
            setStatus('live');
            return;
          }
        }

        // If both fail, stay with seed price but mark as error
        if (!cancelled) setStatus('error');

      } catch (err) {
        console.error('[LivePriceWidget]', err);
        if (!cancelled) setStatus('error');
      }
    }

    fetchDirect();
    const interval = setInterval(fetchDirect, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symbol]);

  const positive = change >= 0;
  const arrow = positive ? '+' : '-';
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(price);

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
        color: positive ? '#22C55E' : '#EF4444',
        fontWeight: 600,
      }}>
        {arrow} {Math.abs(change).toFixed(2)}%
      </div>
      <div style={{
        marginTop: 4,
        fontSize: 10,
        fontFamily: 'monospace',
        color: status === 'live' ? '#22C55E' : status === 'error' ? '#EF4444' : '#64748B',
      }}>
        {status === 'live' ? 'LIVE - NSE' : status === 'error' ? 'DELAYED' : 'LOADING...'}
      </div>
    </div>
  );
}