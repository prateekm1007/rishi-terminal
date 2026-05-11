'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CryptoAsset } from '../../data/crypto';
import { scoreSatoshiBodhi } from '../../lib/scorers/crypto/satoshibodhi';
import { scoreVitalikVeda } from '../../lib/scorers/crypto/vitalikVeda';
import { scoreMichaelSaylor } from '../../lib/scorers/crypto/michaelsaylor';

const TABS = [
  { id: 'overview',   label: 'Overview',       desc: 'Price & Market Data'          },
  { id: 'technical',  label: 'Technicals',     desc: 'RSI, MACD, Indicators'        },
  { id: 'wisdom',     label: 'Crypto Wisdom',  desc: 'Philosopher Scores & Insights'},
  { id: 'knowledge',  label: 'Knowledge Graph', desc: 'Bulls vs Bears & Edge'       },
];

const CRYPTO_RISHIS = [
  {
    name: 'Satoshi Bodhi',
    initials: 'SB',
    scorer: scoreSatoshiBodhi,
    philosophy: 'The root problem with conventional currency is all the trust required to make it work.',
    bio: 'Sound money maximalist. Bitcoin as the ultimate store of value.',
    focus: 'Bitcoin, decentralization, sound money',
  },
  {
    name: 'Vitalik Veda',
    initials: 'VV',
    scorer: scoreVitalikVeda,
    philosophy: 'Whereas most technologies tend to automate workers, blockchains automate away trust.',
    bio: 'Protocol fundamentalist. Ethereum as world computer.',
    focus: 'Smart contracts, scalability, DeFi',
  },
  {
    name: 'Michael Saylor',
    initials: 'MS',
    scorer: scoreMichaelSaylor,
    philosophy: 'Bitcoin is a bank in cyberspace, run by incorruptible software.',
    bio: 'Corporate Bitcoin maximalist. MicroStrategy treasury architect.',
    focus: 'Institutional adoption, digital property',
  },
];

function scoreColor(s: number) {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : s >= 35 ? '#f59e0b' : '#EF4444';
}
function scoreBg(s: number) {
  return s >= 75 ? 'rgba(34,197,94,0.1)' : s >= 55 ? 'rgba(212,175,55,0.1)' : 'rgba(239,68,68,0.1)';
}
function signalColor(s: string) {
  if (s === 'BUY' || s === 'STRONG BUY' || s === 'BULLISH') return '#22C55E';
  if (s === 'SELL' || s === 'BEARISH') return '#EF4444';
  return '#D4AF37';
}

export function CryptoDetailClient({ asset }: { asset: CryptoAsset }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showGraph, setShowGraph] = useState(false);

  const rishiScores = CRYPTO_RISHIS.map(r => ({ ...r, result: r.scorer(asset) }));
  const avgScore = Math.round(rishiScores.reduce((s, r) => s + r.result.score, 0) / rishiScores.length);

  const aboveMa200 = asset.price > asset.moving200d;
  const maLabel = asset.macd === 'BULLISH' ? 'BUY' : asset.macd === 'BEARISH' ? 'SELL' : 'NEUTRAL';

  const bulls = rishiScores.filter(r => r.result.score >= 65);
  const bears = rishiScores.filter(r => r.result.score < 45);
  const neutrals = rishiScores.filter(r => r.result.score >= 45 && r.result.score < 65);

  const technicalEdge = [
    { metric: 'RSI (14)', stockVal: asset.rsi, sectorAvg: 50, unit: '', higherIsBetter: true, insight: asset.rsi > 70 ? 'Overbought — consider waiting for pullback to accumulate' : asset.rsi < 30 ? 'Oversold — Satoshi Bodhi sees this as accumulation zone' : `RSI ${asset.rsi} — healthy momentum, trend continuation likely` },
    { metric: 'Price vs 200D MA', stockVal: Number(((asset.price - asset.moving200d) / asset.moving200d * 100).toFixed(1)), sectorAvg: 0, unit: '%', higherIsBetter: true, insight: aboveMa200 ? `${asset.symbol} trades ${((asset.price - asset.moving200d) / asset.moving200d * 100).toFixed(1)}% above 200D MA — long-term bull structure intact` : 'Below 200D MA — bearish long-term structure, high risk' },
    { metric: 'Distance from ATH', stockVal: asset.fromAth, sectorAvg: -30, unit: '%', higherIsBetter: true, insight: asset.fromAth > -20 ? 'Near all-time high — strong momentum and institutional conviction' : asset.fromAth > -50 ? 'Mid-correction phase — accumulation opportunity for HODLers' : 'Deep correction — high risk but also highest reward entry zone' },
    { metric: '7D Change', stockVal: asset.change7d, sectorAvg: 0, unit: '%', higherIsBetter: true, insight: asset.change7d > 10 ? 'Strong weekly momentum — trend following active' : asset.change7d > 0 ? 'Mild weekly gains — consolidation with upward bias' : 'Weekly weakness — watch for support levels' },
  ];

  return (
    <div className="page-container">

      {/* Knowledge Graph Modal */}
      {showGraph && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0A0F1C', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '85vh', overflow: 'auto', padding: 32, position: 'relative' }}>
            <button onClick={() => setShowGraph(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', color: '#EF4444', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>CLOSE</button>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', marginBottom: 24 }}>{asset.name} — Knowledge Graph</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>BULL CASE ({bulls.length})</div>
                {bulls.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>No strong bulls at current levels</div>}
                {bulls.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{r.name}</span>
                      <span style={{ color: '#22C55E', fontWeight: 700 }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{r.result.insight}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>BEAR CASE ({bears.length})</div>
                {bears.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>No strong bears at current levels</div>}
                {bears.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{r.name}</span>
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{r.result.insight}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', marginBottom: 12 }}>TECHNICAL EDGE</div>
            {technicalEdge.map((te, i) => {
              const good = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
              return (
                <div key={i} style={{ marginBottom: 10, padding: 12, background: 'rgba(17,24,39,0.8)', border: `1px solid ${good ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>{te.metric}</span>
                    <span style={{ fontSize: 11, color: good ? '#22C55E' : '#EF4444', fontWeight: 700 }}>{te.stockVal.toFixed(1)}{te.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#D4AF37' }}>{te.insight}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Knowledge Graph Button */}
      <button onClick={() => setShowGraph(true)} style={{ position: 'fixed', bottom: 32, right: 32, width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #A78BFA)', border: 'none', boxShadow: '0 8px 24px rgba(212,175,55,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, cursor: 'pointer' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
          <circle cx="12" cy="12" r="3" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
          <line x1="9" y1="7" x2="9.5" y2="10" /><line x1="15" y1="7" x2="14.5" y2="10" />
          <line x1="9" y1="17" x2="9.5" y2="14" /><line x1="15" y1="17" x2="14.5" y2="14" />
        </svg>
        <span style={{ fontSize: 7, fontWeight: 700, color: '#000', marginTop: 2 }}>GRAPH</span>
      </button>

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <Link href="/crypto" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>CRYPTO</Link>
            {' > ' + asset.symbol}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 40 }}>{asset.emoji}</span>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>{asset.name}</h1>
                <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '3px 8px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 4, color: 'var(--accent-gold)' }}>{asset.symbol}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                <span>{asset.sector}</span>
                <span>|</span>
                <span>RSI: {asset.rsi}</span>
                <span>|</span>
                <span style={{ color: scoreColor(avgScore), fontWeight: 600 }}>Crypto Consensus: {avgScore}/100</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                ${asset.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 6, color: asset.change24h >= 0 ? '#22C55E' : '#EF4444' }}>
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}% (24h)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                7D: {asset.change7d >= 0 ? '+' : ''}{asset.change7d.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '16px 28px', fontSize: 12, fontFamily: 'monospace', fontWeight: activeTab === tab.id ? 700 : 400, background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>{tab.label}</span>
                <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400 }}>{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Consensus Hero */}
            <div className="card-sacred" style={{ padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)' }} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 12 }}>3 CRYPTO RISHI CONSENSUS</div>
              <div style={{ fontSize: 80, fontWeight: 900, fontFamily: 'monospace', color: scoreColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                {avgScore >= 75 ? 'Strong HODL Signal — Sound Money Thesis Intact' : avgScore >= 55 ? 'Accumulation Phase — Selective Entry Points' : 'Weak Momentum — Patience Required'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
                {rishiScores.map(r => (
                  <div key={r.name} style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: scoreBg(r.result.score), border: `2px solid ${scoreColor(r.result.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: scoreColor(r.result.score), margin: '0 auto 6px' }}>{r.initials}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.result.score) }}>{r.result.score}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.name.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>KEY METRICS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Market Cap', value: `$${(asset.marketCap / 1e9).toFixed(1)}B`, color: 'var(--text-primary)' },
                  { label: '24h Volume', value: `$${(asset.volume24h / 1e9).toFixed(1)}B`, color: '#60a5fa' },
                  { label: '200D MA', value: `$${asset.moving200d.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: aboveMa200 ? '#22C55E' : '#EF4444' },
                  { label: 'From ATH', value: `${asset.fromAth.toFixed(1)}%`, color: asset.fromAth > -20 ? '#22C55E' : '#EF4444' },
                  { label: 'RSI (14)', value: asset.rsi.toString(), color: asset.rsi > 70 ? '#EF4444' : asset.rsi < 30 ? '#22C55E' : '#D4AF37' },
                  { label: 'MACD', value: asset.macd, color: asset.macd === 'BULLISH' ? '#22C55E' : asset.macd === 'BEARISH' ? '#EF4444' : '#D4AF37' },
                ].map(m => (
                  <div key={m.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rishi Insights */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>RISHI INSIGHTS</div>
              {rishiScores.map(r => (
                <div key={r.name} style={{ marginBottom: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${scoreColor(r.result.score)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(r.result.score) }}>{r.result.score}/100</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{r.result.insight}</div>
                  <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic' }}>"{r.philosophy}"</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TECHNICAL TAB */}
        {activeTab === 'technical' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Technical Signals */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>TECHNICAL SIGNALS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { label: 'RSI (14)', value: asset.rsi.toString(), signal: asset.rsi > 70 ? 'OVERBOUGHT' : asset.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL' },
                  { label: 'MACD', value: asset.macd, signal: maLabel },
                  { label: '200D MA', value: aboveMa200 ? 'ABOVE' : 'BELOW', signal: aboveMa200 ? 'BUY' : 'SELL' },
                  { label: '24h Momentum', value: `${asset.change24h >= 0 ? '+' : ''}${asset.change24h.toFixed(2)}%`, signal: asset.change24h > 2 ? 'BUY' : asset.change24h < -2 ? 'SELL' : 'NEUTRAL' },
                  { label: '7D Momentum', value: `${asset.change7d >= 0 ? '+' : ''}${asset.change7d.toFixed(2)}%`, signal: asset.change7d > 5 ? 'BUY' : asset.change7d < -5 ? 'SELL' : 'NEUTRAL' },
                  { label: 'ATH Distance', value: `${asset.fromAth.toFixed(1)}%`, signal: asset.fromAth > -20 ? 'STRONG' : asset.fromAth > -50 ? 'NEUTRAL' : 'WEAK' },
                ].map(ind => (
                  <div key={ind.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ind.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: signalColor(ind.signal) + '20', color: signalColor(ind.signal) }}>{ind.signal}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{ind.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Edge */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>TECHNICAL EDGE ANALYSIS</div>
              {technicalEdge.map((te, i) => {
                const good = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
                return (
                  <div key={i} style={{ marginBottom: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: `1px solid ${good ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{te.metric}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: good ? '#22C55E' : '#EF4444' }}>{te.stockVal.toFixed(1)}{te.unit}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(51,65,85,0.5)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, Math.max(0, Math.abs(te.stockVal))) + '%', background: good ? '#22C55E' : '#EF4444', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#D4AF37' }}>{te.insight}</div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* WISDOM TAB */}
        {activeTab === 'wisdom' && (
          <div style={{ display: 'grid', gap: 20 }}>
            {rishiScores.map(r => (
              <div key={r.name} className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${scoreColor(r.result.score)}, transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: scoreBg(r.result.score), border: `2px solid ${scoreColor(r.result.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: scoreColor(r.result.score) }}>{r.initials}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.result.label} • {r.focus}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'monospace', color: scoreColor(r.result.score), lineHeight: 1 }}>{r.result.score}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{r.result.label}</div>
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${scoreColor(r.result.score)}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>ANALYSIS</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{r.result.insight}</p>
                </div>
                <div style={{ padding: 14, background: 'rgba(212,175,55,0.05)', borderRadius: 8, borderLeft: '3px solid rgba(212,175,55,0.4)', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#D4AF37', fontStyle: 'italic' }}>"{r.philosophy}"</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>{r.bio}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  {r.result.comps.map(comp => (
                    <div key={comp.label} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{comp.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(comp.v) }}>{comp.v}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${comp.v}%`, background: scoreColor(comp.v), borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{comp.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KNOWLEDGE GRAPH TAB */}
        {activeTab === 'knowledge' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card-sacred" style={{ padding: 24, borderTop: '2px solid #22C55E' }}>
                <div style={{ fontSize: 9, color: '#22C55E', letterSpacing: 2, marginBottom: 16 }}>BULL CASE ({bulls.length})</div>
                {bulls.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No strong bulls at current price</div>}
                {bulls.map((r, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: 14, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{r.result.insight}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic', borderLeft: '2px solid #22C55E', paddingLeft: 8 }}>{r.philosophy}</div>
                  </div>
                ))}
              </div>
              <div className="card-sacred" style={{ padding: 24, borderTop: '2px solid #EF4444' }}>
                <div style={{ fontSize: 9, color: '#EF4444', letterSpacing: 2, marginBottom: 16 }}>BEAR CASE ({bears.length})</div>
                {bears.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No strong bears at current price</div>}
                {bears.map((r, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: 14, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#EF4444' }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{r.result.insight}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic', borderLeft: '2px solid #EF4444', paddingLeft: 8 }}>{r.philosophy}</div>
                  </div>
                ))}
              </div>
            </div>
            {neutrals.length > 0 && (
              <div className="card-sacred" style={{ padding: 24, borderTop: '2px solid #D4AF37' }}>
                <div style={{ fontSize: 9, color: '#D4AF37', letterSpacing: 2, marginBottom: 16 }}>NEUTRAL ({neutrals.length})</div>
                {neutrals.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: 14, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37' }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.result.insight}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>TECHNICAL EDGE</div>
              {technicalEdge.map((te, i) => {
                const good = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
                return (
                  <div key={i} style={{ marginBottom: 14, padding: 16, background: 'rgba(17,24,39,0.8)', border: `1px solid ${good ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{te.metric}</span>
                      <div style={{ padding: '4px 12px', background: good ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: good ? '#22C55E' : '#EF4444', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                        {good ? 'POSITIVE' : 'NEGATIVE'}
                      </div>
                    </div>
                    <div style={{ padding: 10, background: good ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 11, color: '#E2E8F0', lineHeight: 1.5 }}>
                      {te.insight}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}