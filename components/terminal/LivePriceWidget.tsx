'use client';

import { useState, useEffect } from 'react';

interface Props {
  price?: number;
  change24h?: number;
  symbol?: string;
}

export function LivePriceWidget({
  price    = 0,
  change24h = 0,
  symbol   = '',
}: Props) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const positive = change24h >= 0;

  const formatted = isMounted
    ? new Intl.NumberFormat('en-US').format(price)
    : new Intl.NumberFormat('en-US').format(price);

  return (
    <div style={{
      padding:      16,
      borderRadius: 16,
      background:   '#111827',
      border:       '1px solid rgba(255,255,255,0.08)',
    }}>
      <div suppressHydrationWarning style={{ fontSize: 28, fontWeight: 700, color: '#F8FAFC' }}>
        {formatted}
      </div>
      <div style={{
        marginTop:  8,
        color:      positive ? '#22C55E' : '#EF4444',
        fontWeight: 600,
      }}>
        {positive ? '+' : ''}{change24h.toFixed(2)}%
      </div>
    </div>
  );
}