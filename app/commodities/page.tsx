'use client';

import { useState } from 'react';
import Link from 'next/link';
import { COMMODITIES } from '../../data/markets';
import { scoreGoldRishi } from '../../lib/scorers/commodity/gold';
import { scoreSilverRishi } from '../../lib/scorers/commodity/silver';
import { scoreCrudeRishi } from '../../lib/scorers/commodity/crude';
import { sc } from '../../lib/utils';

const COMMODITY_GURUS = [
  { id: 'gold', name: 'Gold Rishi', emoji: '🥇', color: '#F59E0B', scorer: scoreGoldRishi, target: 'GOLD' },
  { id: 'silver', name: 'Silver Rishi', emoji: '🥈', color: '#94A3B8', scorer: scoreSilverRishi, target: 'SILVER' },
  { id: 'crude', name: 'Crude Rishi', emoji: '🛢️', color: '#0EA5E9', scorer: scoreCrudeRishi, target: 'WTI' },
];

export default function CommoditiesPage() {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(COMMODITIES.map(c => c.category)))];
  const filtered = category === 'All' ? COMMODITIES : COMMODITIES.filter(c => c.category === category);

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <Link href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 12 }}>← Dashboard</Link>
      <div style={{ fontSize: 22, color: '#F59E0B', marginTop: 20 }}>COMMODITY GURUS</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 24 }}>
        {COMMODITY_GURUS.map(guru => {
          const commodity = COMMODITIES.find(c => c.symbol === guru.target);
          if (!commodity) return null;
          const result = guru.scorer(commodity);
          return (
            <div key={guru.id} style={{ background: '#09090F', border: `2px solid ${guru.color}30`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 32 }}>{guru.emoji}</div>
              <div style={{ fontSize: 16, color: '#F5E6D3', marginTop: 8 }}>{guru.name}</div>
              <div style={{ fontSize: 36, color: sc(result.score), fontWeight: 700, marginTop: 12 }}>{result.score}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 12 }}>{result.insight}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ background: category === cat ? '#F59E0B15' : '#09090F', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 16px', color: category === cat ? '#F59E0B' : '#64748B', fontSize: 11, cursor: 'pointer' }}>
              {cat}
            </button>
          ))}
        </div>
        
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#06060D' }}>
                <th style={{ padding: 10, color: '#475569', textAlign: 'left' }}>Commodity</th>
                <th style={{ padding: 10, color: '#475569', textAlign: 'right' }}>Price</th>
                <th style={{ padding: 10, color: '#475569', textAlign: 'right' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.symbol} style={{ borderBottom: '1px solid #0F172A' }}>
                  <td style={{ padding: 10 }}>{c.emoji} {c.name}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: '#F1F5F9' }}>{c.price} {c.unit}</td>
                  <td style={{ padding: 10, textAlign: 'right', color: c.changePct >= 0 ? '#10B981' : '#EF4444' }}>
                    {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}