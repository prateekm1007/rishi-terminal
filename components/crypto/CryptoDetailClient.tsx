'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CryptoAsset } from '../../data/crypto';
import { scoreSatoshiBodhi } from '../../lib/scorers/crypto/satoshibodhi';
import { scoreVitalikVeda } from '../../lib/scorers/crypto/vitalikVeda';
import { scoreMichaelSaylor } from '../../lib/scorers/crypto/michaelsaylor';

const TABS = [
  { id: 'overview',  label: 'Overview',      desc: 'Fundamentals & Metrics' },
  { id: 'technical', label: 'Technicals',    desc: 'Price Action & Indicators' },
  { id: 'wisdom',    label: 'Rishi Wisdom',  desc: 'Crypto Philosopher Scores' },
];

const CRYPTO_RISHIS = [
  { name: 'Satoshi Bodhi',    scorer: scoreSatoshiBodhi,    emoji: '₿',  initials: 'SB' },
  { name: 'Vitalik Veda',     scorer: scoreVitalikVeda,     emoji: 'Ξ',  initials: 'VV' },
  { name: 'Michael Saylor',   scorer: scoreMichaelSaylor,   emoji: '🏛️', initials: 'MS' },
];

function scoreColor(s: number) {
  return s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';
}

function scoreBg(s: number) {
  return s >= 75 ? 'rgba(0,186,124,0.1)' : s >= 55 ? 'rgba(255,215,0,0.1)' : 'rgba(244,33,46,0.1)';
}

export function CryptoDetailClient({ asset }: { asset: CryptoAsset }) {
  const [activeTab, setActiveTab] = useState('overview');

  const rishiScores = CRYPTO_RISHIS.map(r => r.scorer(asset));
  const avgScore = Math.round(rishiScores.reduce((sum, r) => sum + r.score, 0) / rishiScores.length);

  return (
    <div className="page-container">

      {/* ── Page Header ── */}
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
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>
                  {asset.name}
                </h1>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11, padding: '3px 8px',
                  background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: 4, color: 'var(--accent-gold)', letterSpacing: 1,
                }}>
                  {asset.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span>{asset.sector}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span>Rank #{asset.marketCapRank}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span style={{ color: scoreColor(avgScore), fontWeight: 600 }}>
                  Rishi Consensus: {avgScore}/100
                </span>
              </div>
            </div>

            {/* Live Price Widget */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                ${asset.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 6, color: asset.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {asset.change24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change24h).toFixed(2)}% (24h)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                7d: {asset.change7d >= 0 ? '+' : ''}{asset.change7d.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px 32px', fontSize: 13, fontFamily: 'monospace',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                  cursor: 'pointer', letterSpacing: activeTab === tab.id ? '1px' : '0.5px',
                  transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.6, fontWeight: 400 }}>{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* ══════════════════════════════════
            TAB 1: OVERVIEW
            ══════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

            {/* Consensus Hero */}
            <div className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              }} />
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                  3 CRYPTO RISHI CONSENSUS
                </div>
                <div style={{ fontSize: 72, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(avgScore), lineHeight: 1 }}>
                  {avgScore}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                  Average of Satoshi Bodhi, Vitalik Veda, Michael Saylor
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                KEY METRICS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Market Cap', value: `$${(asset.marketCap / 1e9).toFixed(2)}B` },
                  { label: '24h Volume', value: `$${(asset.volume24h / 1e9).toFixed(2)}B` },
                  { label: 'Circulating', value: `${(asset.circulatingSupply / 1e6).toFixed(2)}M ${asset.symbol}` },
                  { label: 'Total Supply', value: asset.maxSupply ? `${(asset.maxSupply / 1e6).toFixed(2)}M` : 'Unlimited' },
                  { label: 'All-Time High', value: `$${asset.ath.toLocaleString()}` },
                  { label: 'ATH Date', value: new Date(asset.athDate).toLocaleDateString('en-US') },
                ].map(m => (
                  <div key={m.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {asset.description && (
              <div className="card-sacred" style={{ padding: 24 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 12 }}>ABOUT</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{asset.description}</p>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════
            TAB 2: TECHNICALS
            ══════════════════════════════════ */}
        {activeTab === 'technical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

            {/* Technical Indicators */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                TECHNICAL INDICATORS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'RSI (14)', value: asset.rsi.toString(), color: asset.rsi >= 70 ? 'var(--accent-red)' : asset.rsi >= 50 ? 'var(--accent-green)' : 'var(--accent-gold)' },
                  { label: 'MACD Signal', value: asset.macd, color: asset.macd === 'BULLISH' ? 'var(--accent-green)' : asset.macd === 'BEARISH' ? 'var(--accent-red)' : 'var(--accent-gold)' },
                  { label: '200D MA', value: asset.price > asset.moving200d ? '▲ ABOVE' : '▼ BELOW', color: asset.price > asset.moving200d ? 'var(--accent-green)' : 'var(--accent-red)' },
                  { label: 'Vol/Avg', value: `${((asset.volume24h / (asset.marketCap * 0.05)) * 100).toFixed(0)}%`, color: 'var(--text-primary)' },
                ].map(ind => (
                  <div key={ind.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{ind.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: ind.color }}>{ind.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Levels */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                PRICE LEVELS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  { label: '24h High', value: `$${(asset.price * 1.03).toFixed(2)}`, color: 'var(--accent-green)' },
                  { label: '24h Low', value: `$${(asset.price * 0.97).toFixed(2)}`, color: 'var(--accent-red)' },
                  { label: '7d High', value: `$${(asset.price * (1 + asset.change7d / 100)).toFixed(2)}`, color: 'var(--text-primary)' },
                  { label: '7d Low', value: `$${(asset.price * (1 - Math.abs(asset.change7d) / 100)).toFixed(2)}`, color: 'var(--text-primary)' },
                ].map(lvl => (
                  <div key={lvl.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{lvl.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: lvl.color }}>{lvl.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════
            TAB 3: RISHI WISDOM
            ══════════════════════════════════ */}
        {activeTab === 'wisdom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

            {/* Rishi Score Cards */}
            {rishiScores.map((result, i) => {
              const rishi = CRYPTO_RISHIS[i];
              return (
                <div key={result.name} className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${scoreColor(result.score)}, transparent)`,
                  }} />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: scoreBg(result.score),
                        border: `2px solid ${scoreColor(result.score)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24,
                      }}>
                        {rishi.emoji}
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {result.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {result.label} • {result.origin}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 48, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(result.score), lineHeight: 1 }}>
                        {result.score}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>/100</div>
                    </div>
                  </div>

                  {/* Insight */}
                  <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${scoreColor(result.score)}`, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>CURRENT ANALYSIS</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{result.insight}</p>
                  </div>

                  {/* Components Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {result.comps.map(comp => (
                      <div key={comp.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comp.label}</span>
                          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(comp.v) }}>{comp.v}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: `${comp.v}%`, background: scoreColor(comp.v), borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{comp.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          </div>
        )}

      </div>
    </div>
  );
}