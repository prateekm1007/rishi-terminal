'use client';

import { Stock } from '../../lib/types';
import { useState } from 'react';

interface Props {
  stock: Stock;
}

// Fixed heights — no Math.random() to avoid hydration mismatch
const CHART_BARS = [45,62,38,71,55,48,82,39,67,74,51,88,43,69,57,76,41,63,79,52,84,46,70,58,73,44,66,80,53,77];

export function PriceChart({ stock }: Props) {
  const [timeframe, setTimeframe] = useState<'1D'|'1W'|'1M'|'3M'|'1Y'>('1M');

  if (!stock || !stock.price) return null;

  const changes: Record<string, number> = { '1D': 1.2, '1W': -0.8, '1M': 3.5, '3M': 7.2, '1Y': 12.4 };
  const change = changes[timeframe];
  const isPositive = change >= 0;

  return (
    <div className="card-sacred p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif', marginBottom: '8px' }}>
            PRICE CHART
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
            {stock.price.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '13px', fontFamily: 'monospace', marginTop: '6px', color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}% ({timeframe})
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['1D','1W','1M','3M','1Y'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                borderRadius: '6px',
                border: timeframe === tf ? '1px solid var(--accent-gold)' : '1px solid var(--border-primary)',
                background: timeframe === tf ? 'rgba(255,215,0,0.15)' : 'transparent',
                color: timeframe === tf ? 'var(--accent-gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — fixed heights, no random */}
      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '3px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
        {CHART_BARS.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: 'linear-gradient(to top, rgba(255,215,0,0.5), rgba(255,215,0,0.1))',
              borderRadius: '2px 2px 0 0',
              transition: 'opacity 0.2s',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>30 days ago</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Today</span>
      </div>
    </div>
  );
}