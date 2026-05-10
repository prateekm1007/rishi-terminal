'use client';

import { useState, useMemo, useEffect } from 'react';

interface OptionStrike {
  strike: number;
  ce: { oi: number; oiChange: number; iv: number; premium: number; delta: number; volume: number };
  pe: { oi: number; oiChange: number; iv: number; premium: number; delta: number; volume: number };
  isATM: boolean;
  pcr: number;
}

function generateOptionsChain(underlying: number, symbol: string): OptionStrike[] {
  const step = symbol === 'NIFTY' ? 50 : symbol === 'BANKNIFTY' ? 100 : 50;
  const atm = Math.round(underlying / step) * step;
  const strikes: OptionStrike[] = [];

  const seed = symbol.charCodeAt(0);
  const rng = (i: number, j: number) => Math.abs(Math.sin(seed * 9301 + i * 49297 + j)) * 0.5 + 0.5;

  for (let i = -8; i <= 8; i++) {
    const strike = atm + i * step;
    const isATM = i === 0;
    const moneyness = Math.abs(i);

    const ceOi = Math.round(rng(i, 1) * 5000000 * (1 / (moneyness + 1)));
    const peOi = Math.round(rng(i, 2) * 5000000 * (1 / (moneyness + 1)));
    const ceIv = 12 + moneyness * 1.5 + rng(i, 3) * 3;
    const peIv = 12 + moneyness * 1.5 + rng(i, 4) * 3;

    const dist = Math.abs(underlying - strike);
    const cePremium = isATM ? underlying * 0.012 : Math.max(0.5, (i < 0 ? underlying - strike : 0) + underlying * 0.008 / (moneyness + 1));
    const pePremium = isATM ? underlying * 0.012 : Math.max(0.5, (i > 0 ? strike - underlying : 0) + underlying * 0.008 / (moneyness + 1));

    strikes.push({
      strike,
      isATM,
      pcr: peOi / (ceOi || 1),
      ce: {
        oi: ceOi,
        oiChange: Math.round((rng(i, 5) - 0.5) * ceOi * 0.3),
        iv: Math.round(ceIv * 100) / 100,
        premium: Math.round(cePremium * 10) / 10,
        delta: Math.round((0.5 - i * 0.06) * 100) / 100,
        volume: Math.round(rng(i, 6) * 100000),
      },
      pe: {
        oi: peOi,
        oiChange: Math.round((rng(i, 7) - 0.5) * peOi * 0.3),
        iv: Math.round(peIv * 100) / 100,
        premium: Math.round(pePremium * 10) / 10,
        delta: Math.round((-0.5 - i * 0.06) * 100) / 100,
        volume: Math.round(rng(i, 8) * 100000),
      },
    });
  }

  return strikes;
}

const UNDERLYINGS = [
  { symbol: 'NIFTY', price: 24176 },
  { symbol: 'BANKNIFTY', price: 55310 },
  { symbol: 'RELIANCE', price: 2847 },
  { symbol: 'TCS', price: 3812 },
];

export default function OptionsChainPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [expiry, setExpiry] = useState('29 May 2025');
  const [showGreeks, setShowGreeks] = useState(false);
  const [tick, setTick] = useState(0);

  const underlying = UNDERLYINGS.find(u => u.symbol === selectedSymbol) ?? UNDERLYINGS[0];

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const chain = useMemo(() => generateOptionsChain(underlying.price, selectedSymbol), [selectedSymbol, tick]);

  const totalCeOi = chain.reduce((s, r) => s + r.ce.oi, 0);
  const totalPeOi = chain.reduce((s, r) => s + r.pe.oi, 0);
  const pcr = totalCeOi > 0 ? totalPeOi / totalCeOi : 0;

  const maxPainStrike = chain.reduce((best, curr) => {
    return curr.ce.oi + curr.pe.oi > best.ce.oi + best.pe.oi ? curr : best;
  }, chain[0])?.strike ?? underlying.price;

  const ivRank = Math.round(30 + Math.random() * 40);

  const EXPIRIES = ['08 May 2025', '15 May 2025', '22 May 2025', '29 May 2025', '26 Jun 2025'];

  function formatOi(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString();
  }

  const colHeader = (text: string) => (
    <th style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {text}
    </th>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
              📋 Options Chain
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Live OI · IV Rank · Max Pain · PCR Analysis
            </p>
          </div>
          <div style={{ fontSize: 11, color: '#22C55E', fontFamily: 'monospace' }}>
            ⚡ Live · Auto-refreshes every 5s
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {UNDERLYINGS.map(u => (
              <button
                key={u.symbol}
                onClick={() => setSelectedSymbol(u.symbol)}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  background: selectedSymbol === u.symbol ? 'linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05))' : 'rgba(31,41,59,0.6)',
                  border: `1px solid ${selectedSymbol === u.symbol ? 'rgba(212,175,55,0.4)' : 'rgba(51,65,85,0.4)'}`,
                  color: selectedSymbol === u.symbol ? '#D4AF37' : '#64748B',
                }}
              >
                {u.symbol}
              </button>
            ))}
          </div>

          <select
            value={expiry} onChange={e => setExpiry(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.4)',
              color: '#F8FAFC', fontSize: 13, cursor: 'pointer',
            }}
          >
            {EXPIRIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <button
            onClick={() => setShowGreeks(g => !g)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: showGreeks ? 'rgba(139,92,246,0.15)' : 'rgba(31,41,59,0.6)',
              border: `1px solid ${showGreeks ? 'rgba(139,92,246,0.4)' : 'rgba(51,65,85,0.4)'}`,
              color: showGreeks ? '#8B5CF6' : '#64748B',
            }}
          >
            {showGreeks ? '✓ Greeks ON' : 'Show Greeks'}
          </button>
        </div>

        {/* Market Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'SPOT', value: underlying.price.toLocaleString(), color: '#F8FAFC' },
            { label: 'PCR', value: pcr.toFixed(2), color: pcr > 1.2 ? '#22C55E' : pcr < 0.8 ? '#EF4444' : '#F59E0B' },
            { label: 'IV RANK', value: ivRank + '%', color: ivRank > 60 ? '#EF4444' : ivRank < 30 ? '#22C55E' : '#F59E0B' },
            { label: 'MAX PAIN', value: maxPainStrike.toLocaleString(), color: '#D4AF37' },
            { label: 'TOTAL OI (CE)', value: formatOi(totalCeOi), color: '#EF4444' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 6 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* PCR Interpretation */}
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 10,
          background: pcr > 1.2 ? 'rgba(34,197,94,0.06)' : pcr < 0.8 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
          border: `1px solid ${pcr > 1.2 ? 'rgba(34,197,94,0.2)' : pcr < 0.8 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
          fontSize: 12, color: '#94A3B8',
        }}>
          💡 <strong style={{ color: '#D4AF37' }}>PCR {pcr.toFixed(2)}</strong>{' '}
          {pcr > 1.2 ? '— Extremely bullish sentiment. High PE writing indicates markets expect support.' : pcr < 0.8 ? '— Bearish sentiment. Heavy CE writing suggests resistance.' : '— Neutral. Balanced OI between calls and puts.'}
          {' '}<strong style={{ color: '#D4AF37' }}>Max Pain: {maxPainStrike}</strong> — Options writers profit most if {selectedSymbol} expires near this level.
        </div>

        {/* Options Chain Table */}
        <div style={{
          background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            background: 'rgba(5,8,16,0.6)', borderBottom: '1px solid rgba(51,65,85,0.5)',
          }}>
            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
              CALLS (CE)
            </div>
            <div style={{ padding: '12px 20px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#D4AF37' }}>
              STRIKE
            </div>
            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#22C55E' }}>
              PUTS (PE)
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(5,8,16,0.4)' }}>
                  {colHeader('OI')}
                  {colHeader('OI CHG')}
                  {colHeader('IV%')}
                  {showGreeks && colHeader('Δ')}
                  {colHeader('VOLUME')}
                  {colHeader('PREMIUM')}
                  <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 800, color: '#D4AF37', textAlign: 'center', letterSpacing: '0.1em' }}>
                    STRIKE
                  </th>
                  {colHeader('PREMIUM')}
                  {colHeader('VOLUME')}
                  {showGreeks && colHeader('Δ')}
                  {colHeader('IV%')}
                  {colHeader('OI CHG')}
                  {colHeader('OI')}
                </tr>
              </thead>
              <tbody>
                {chain.map((row, idx) => (
                  <tr
                    key={row.strike}
                    style={{
                      borderBottom: '1px solid rgba(51,65,85,0.2)',
                      background: row.isATM ? 'rgba(212,175,55,0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(17,24,39,0.3)',
                    }}
                  >
                    {/* CE Side */}
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#F8FAFC' }}>{formatOi(row.ce.oi)}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: row.ce.oiChange >= 0 ? '#22C55E' : '#EF4444' }}>
                      {row.ce.oiChange >= 0 ? '+' : ''}{formatOi(row.ce.oiChange)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: row.ce.iv > 20 ? '#F59E0B' : '#94A3B8' }}>
                      {row.ce.iv.toFixed(1)}
                    </td>
                    {showGreeks && (
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#8B5CF6' }}>{row.ce.delta.toFixed(2)}</td>
                    )}
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#64748B' }}>{formatOi(row.ce.volume)}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#EF4444' }}>
                      {row.ce.premium.toFixed(1)}
                    </td>

                    {/* Strike */}
                    <td style={{
                      padding: '10px 16px', textAlign: 'center', fontFamily: 'monospace',
                      fontWeight: row.isATM ? 900 : 700,
                      fontSize: row.isATM ? 14 : 12,
                      color: row.isATM ? '#D4AF37' : '#F8FAFC',
                      background: row.isATM ? 'rgba(212,175,55,0.1)' : 'transparent',
                    }}>
                      {row.strike.toLocaleString()}
                      {row.isATM && <div style={{ fontSize: 8, color: '#D4AF37', marginTop: 2 }}>ATM</div>}
                    </td>

                    {/* PE Side */}
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#22C55E' }}>
                      {row.pe.premium.toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#64748B' }}>{formatOi(row.pe.volume)}</td>
                    {showGreeks && (
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#8B5CF6' }}>{row.pe.delta.toFixed(2)}</td>
                    )}
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: row.pe.iv > 20 ? '#F59E0B' : '#94A3B8' }}>
                      {row.pe.iv.toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: row.pe.oiChange >= 0 ? '#22C55E' : '#EF4444' }}>
                      {row.pe.oiChange >= 0 ? '+' : ''}{formatOi(row.pe.oiChange)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#F8FAFC' }}>{formatOi(row.pe.oi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}