'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CryptoAsset } from '../../data/crypto';
import { scoreSatoshiBodhi } from '../../lib/scorers/crypto/satoshibodhi';
import { scoreVitalikVeda } from '../../lib/scorers/crypto/vitalikVeda';
import { scoreMichaelSaylor } from '../../lib/scorers/crypto/michaelsaylor';

const TABS = [
  { id: 'overview',  label: 'Overview',     desc: 'Fundamentals & Metrics'       },
  { id: 'technical', label: 'Technicals',   desc: 'Price Action & Indicators'     },
  { id: 'wisdom',    label: 'Rishi Wisdom', desc: 'Crypto Philosopher Scores'     },
];

const CRYPTO_RISHIS = [
  { scorer: scoreSatoshiBodhi,  emoji: 'BTC', initials: 'SB' },
  { scorer: scoreVitalikVeda,   emoji: 'ETH', initials: 'VV' },
  { scorer: scoreMichaelSaylor, emoji: 'MS',  initials: 'MS' },
];

function scoreColor(s: number) {
  return s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';
}

function scoreBg(s: number) {
  return s >= 75 ? 'rgba(0,186,124,0.1)' : s >= 55 ? 'rgba(255,215,0,0.1)' : 'rgba(244,33,46,0.1)';
}

function fmt(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString();
}

export function CryptoDetailClient({ asset }: { asset: CryptoAsset }) {
  const [activeTab, setActiveTab] = useState('overview');

  const rishiScores = CRYPTO_RISHIS.map(r => r.scorer(asset));
  const avgScore    = Math.round(rishiScores.reduce((s, r) => s + r.score, 0) / rishiScores.length);

  const priceColor = asset.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <div className="page-container">

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 36, lineHeight: 1 }}>{asset.name.charAt(0)}</span>
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
                <span style={{ color: scoreColor(avgScore), fontWeight: 600 }}>
                  Rishi Score: {avgScore}/100
                </span>
              </div>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                ${asset.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 8, color: priceColor }}>
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}% (24h)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                7d: {asset.change7d >= 0 ? '+' : ''}{asset.change7d.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex' }}>
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
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400, letterSpacing: 0.5 }}>{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* ══ TAB 1: OVERVIEW ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Consensus Hero */}
            <div className="card-sacred" style={{ padding: 32, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              }} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 12 }}>
                3 CRYPTO RISHI CONSENSUS
              </div>
              <div style={{ fontSize: 80, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(avgScore), lineHeight: 1 }}>
                {avgScore}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
                Satoshi Bodhi + Vitalik Veda + Michael Saylor
              </div>
            </div>

            {/* Key Metrics */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16 }}>KEY METRICS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Market Cap',    value: fmt(asset.marketCap) },
                  { label: '24h Volume',    value: fmt(asset.volume24h) },
                  { label: 'From ATH',      value: `${asset.fromAth.toFixed(1)}%`,  color: 'var(--accent-red)' },
                  { label: '200D MA',       value: `$${asset.moving200d.toLocaleString()}` },
                  { label: 'RSI (14)',       value: asset.rsi.toString(),             color: asset.rsi >= 70 ? 'var(--accent-red)' : asset.rsi >= 50 ? 'var(--accent-green)' : 'var(--accent-gold)' },
                  { label: 'MACD Signal',   value: asset.macd,                        color: asset.macd === 'BULLISH' ? 'var(--accent-green)' : asset.macd === 'BEARISH' ? 'var(--accent-red)' : 'var(--accent-gold)' },
                ].map(m => (
                  <div key={m.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: m.color || 'var(--text-primary)' }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Summary */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16 }}>MARKET SUMMARY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: `3px solid ${asset.price > asset.moving200d ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>200D MA TREND</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: asset.price > asset.moving200d ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {asset.price > asset.moving200d ? 'ABOVE 200D MA' : 'BELOW 200D MA'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    {asset.price > asset.moving200d
                      ? `Price is ${((asset.price / asset.moving200d - 1) * 100).toFixed(1)}% above the 200-day moving average — bullish long-term trend.`
                      : `Price is ${((1 - asset.price / asset.moving200d) * 100).toFixed(1)}% below the 200-day moving average — bearish long-term trend.`
                    }
                  </div>
                </div>

                <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: '3px solid var(--accent-gold)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>ATH RECOVERY</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {Math.abs(asset.fromAth).toFixed(1)}% from ATH
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                    Needs {(100 / (1 + asset.fromAth / 100) - 100).toFixed(1)}% gain to recover all-time high.
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ══ TAB 2: TECHNICALS ══ */}
        {activeTab === 'technical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Indicator Grid */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16 }}>TECHNICAL INDICATORS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {[
                  {
                    label: 'RSI (14)',
                    value: asset.rsi.toString(),
                    sub: asset.rsi >= 70 ? 'Overbought — consider caution' : asset.rsi >= 50 ? 'Bullish momentum' : 'Oversold — potential bounce',
                    color: asset.rsi >= 70 ? 'var(--accent-red)' : asset.rsi >= 50 ? 'var(--accent-green)' : 'var(--accent-gold)',
                  },
                  {
                    label: 'MACD Signal',
                    value: asset.macd,
                    sub: asset.macd === 'BULLISH' ? 'Upward crossover confirmed' : asset.macd === 'BEARISH' ? 'Downward crossover confirmed' : 'Sideways — no clear signal',
                    color: asset.macd === 'BULLISH' ? 'var(--accent-green)' : asset.macd === 'BEARISH' ? 'var(--accent-red)' : 'var(--accent-gold)',
                  },
                  {
                    label: '200D Moving Avg',
                    value: asset.price > asset.moving200d ? 'ABOVE' : 'BELOW',
                    sub: `MA: $${asset.moving200d.toLocaleString()}`,
                    color: asset.price > asset.moving200d ? 'var(--accent-green)' : 'var(--accent-red)',
                  },
                  {
                    label: 'Momentum (7d)',
                    value: `${asset.change7d >= 0 ? '+' : ''}${asset.change7d.toFixed(2)}%`,
                    sub: asset.change7d >= 10 ? 'Strong bullish run' : asset.change7d >= 0 ? 'Mild uptrend' : 'Downtrend in progress',
                    color: asset.change7d >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  },
                ].map(ind => (
                  <div key={ind.label} style={{ padding: 18, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>{ind.label.toUpperCase()}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: ind.color, marginBottom: 6 }}>{ind.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{ind.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RSI Visual Bar */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16 }}>RSI GAUGE</div>
              <div style={{ position: 'relative', height: 24, background: 'linear-gradient(90deg, #F4212E 0%, #FFD700 50%, #00BA7C 100%)', borderRadius: 12 }}>
                <div style={{
                  position: 'absolute', top: '50%',
                  left: `calc(${Math.min(95, Math.max(5, asset.rsi))}% - 12px)`,
                  transform: 'translateY(-50%)',
                  width: 24, height: 24,
                  background: 'var(--bg-primary)',
                  border: `3px solid ${scoreColor(asset.rsi)}`,
                  borderRadius: '50%',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Oversold (0)</span>
                <span style={{ fontWeight: 700, color: scoreColor(asset.rsi), fontFamily: 'monospace' }}>RSI: {asset.rsi}</span>
                <span>Overbought (100)</span>
              </div>
            </div>

            {/* Price vs 200D MA */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16 }}>PRICE vs 200D MOVING AVERAGE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Current Price', value: `$${asset.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, color: 'var(--text-primary)' },
                  { label: '200D MA',       value: `$${asset.moving200d.toLocaleString()}`,                                   color: 'var(--accent-gold)' },
                  { label: 'Gap',           value: `${((asset.price / asset.moving200d - 1) * 100).toFixed(2)}%`,             color: asset.price > asset.moving200d ? 'var(--accent-green)' : 'var(--accent-red)' },
                  { label: 'Signal',        value: asset.price > asset.moving200d ? 'BULLISH' : 'BEARISH',                    color: asset.price > asset.moving200d ? 'var(--accent-green)' : 'var(--accent-red)' },
                ].map(row => (
                  <div key={row.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{row.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: row.color }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══ TAB 3: RISHI WISDOM ══ */}
        {activeTab === 'wisdom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Consensus Summary */}
            <div className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
                {rishiScores.map(r => (
                  <div key={r.name}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>{r.name.toUpperCase()}</div>
                    <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(r.score) }}>{r.score}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{r.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>WEIGHTED CONSENSUS</div>
                <div style={{ fontSize: 48, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(avgScore) }}>{avgScore}</div>
              </div>
            </div>

            {/* Individual Rishi Cards */}
            {rishiScores.map((result) => (
              <div key={result.name} className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${scoreColor(result.score)}, transparent)`,
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: scoreBg(result.score),
                      border: `2px solid ${scoreColor(result.score)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                      color: scoreColor(result.score),
                    }}>
                      {result.name.split(' ').map((w: string) => w[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{result.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{result.label} — {result.origin}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 48, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(result.score), lineHeight: 1 }}>{result.score}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>/100</div>
                  </div>
                </div>

                {/* Insight */}
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${scoreColor(result.score)}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>ANALYSIS</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{result.insight}</p>
                </div>

                {/* Score Components */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {result.comps.map((comp: any) => (
                    <div key={comp.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comp.label}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(comp.v) }}>{comp.v}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${comp.v}%`, background: scoreColor(comp.v), borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{comp.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}