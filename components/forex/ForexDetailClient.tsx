'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ForexPair } from '../../data/forex';

const TABS = [
  { id: 'overview',  label: 'Overview',      desc: 'Rates & Fundamentals' },
  { id: 'technical', label: 'Technicals',    desc: 'Price Action & Indicators' },
  { id: 'wisdom',    label: 'Macro Wisdom',  desc: 'Central Bank & Economic Analysis' },
];

function trendColor(val: number) {
  return val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
}

function volColor(vol: number) {
  return vol < 5 ? 'var(--accent-green)' : vol < 7 ? 'var(--accent-gold)' : 'var(--accent-red)';
}

export function ForexDetailClient({ pair }: { pair: ForexPair }) {
  const [activeTab, setActiveTab] = useState('overview');

  const change1D = ((pair.spotRate - pair.bid) / pair.bid) * 100;
  const change1W = change1D * 5; // Simulated
  const change1M = change1D * 20; // Simulated

  return (
    <div className="page-container">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <Link href="/forex" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>FOREX</Link>
            {' > ' + pair.symbol}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 40 }}>💱</span>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>
                  {pair.baseCurrency}/{pair.quoteCurrency}
                </h1>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11, padding: '3px 8px',
                  background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: 4, color: 'var(--accent-gold)', letterSpacing: 1,
                }}>
                  {pair.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span>{pair.name}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span>Vol: {pair.volatility.toFixed(1)}%</span>
              </div>
            </div>

            {/* Live Rate Widget */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                {pair.spotRate.toFixed(4)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 6, color: trendColor(change1D) }}>
                {change1D >= 0 ? '▲' : '▼'} {Math.abs(change1D).toFixed(2)}% (1D)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Spread: {pair.spread.toFixed(4)}
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

            {/* Spot Rate Hero */}
            <div className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              }} />
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                  SPOT RATE
                </div>
                <div style={{ fontSize: 72, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-gold)', lineHeight: 1 }}>
                  {pair.spotRate.toFixed(4)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                  1 {pair.baseCurrency} = {pair.spotRate.toFixed(4)} {pair.quoteCurrency}
                </div>
              </div>
            </div>

            {/* Bid/Ask Spread */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                BID / ASK SPREAD
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Bid (Buy)', value: pair.bid.toFixed(4), color: 'var(--accent-green)' },
                  { label: 'Ask (Sell)', value: pair.ask.toFixed(4), color: 'var(--accent-red)' },
                  { label: 'Spread', value: pair.spread.toFixed(4), color: 'var(--accent-gold)' },
                  { label: 'Mid Point', value: ((pair.bid + pair.ask) / 2).toFixed(4), color: 'var(--text-primary)' },
                ].map(m => (
                  <div key={m.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forward Rates */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                FORWARD RATES
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  { label: '1 Month', value: pair.forward1M.toFixed(4) },
                  { label: '3 Months', value: pair.forward3M.toFixed(4) },
                  { label: '6 Months', value: pair.forward6M.toFixed(4) },
                  { label: '12 Months', value: pair.forward12M.toFixed(4) },
                ].map(fwd => (
                  <div key={fwd.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{fwd.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{fwd.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interest Rate Differential */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                INTEREST RATE DIFFERENTIAL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: `${pair.baseCurrency} Rate`, value: `${pair.interestDiff.base.toFixed(2)}%`, color: 'var(--accent-blue)' },
                  { label: `${pair.quoteCurrency} Rate`, value: `${pair.interestDiff.quote.toFixed(2)}%`, color: 'var(--accent-purple)' },
                  { label: 'Differential', value: `${pair.interestDiff.diff.toFixed(2)}%`, color: pair.interestDiff.diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                ].map(rate => (
                  <div key={rate.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{rate.label.toUpperCase()}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: rate.color }}>{rate.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════
            TAB 2: TECHNICALS
            ══════════════════════════════════ */}
        {activeTab === 'technical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

            {/* Performance */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                PERFORMANCE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  { label: '1 Day', value: change1D, period: '1D' },
                  { label: '1 Week', value: change1W, period: '1W' },
                  { label: '1 Month', value: change1M, period: '1M' },
                  { label: 'Volatility', value: pair.volatility, period: 'VOL', isVol: true },
                ].map(perf => (
                  <div key={perf.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{perf.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: perf.isVol ? volColor(perf.value) : trendColor(perf.value) }}>
                      {perf.isVol ? `${perf.value.toFixed(1)}%` : `${perf.value >= 0 ? '+' : ''}${perf.value.toFixed(2)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PPP Analysis */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                PURCHASING POWER PARITY (PPP)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Current Spot', value: pair.spotRate.toFixed(4), color: 'var(--text-primary)' },
                  { label: 'PPP Fair Value', value: pair.pppValue.toFixed(4), color: 'var(--accent-gold)' },
                  {
                    label: 'Over/Under Valued',
                    value: `${((pair.spotRate - pair.pppValue) / pair.pppValue * 100).toFixed(1)}%`,
                    color: pair.spotRate > pair.pppValue ? 'var(--accent-red)' : 'var(--accent-green)',
                  },
                ].map(ppp => (
                  <div key={ppp.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{ppp.label.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: ppp.color }}>{ppp.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid var(--accent-gold)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {pair.spotRate > pair.pppValue
                    ? `${pair.baseCurrency} is overvalued by ${((pair.spotRate - pair.pppValue) / pair.pppValue * 100).toFixed(1)}% against ${pair.quoteCurrency} based on purchasing power parity.`
                    : `${pair.baseCurrency} is undervalued by ${Math.abs((pair.spotRate - pair.pppValue) / pair.pppValue * 100).toFixed(1)}% against ${pair.quoteCurrency} based on purchasing power parity.`
                  }
                </p>
              </div>
            </div>

            {/* 24h Trading Stats */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                24H TRADING STATISTICS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: '24h Volume', value: `$${(pair.volume24h / 1e9).toFixed(2)}B`, color: 'var(--accent-blue)' },
                  { label: 'Liquidity', value: pair.liquidity, color: pair.liquidity === 'HIGH' ? 'var(--accent-green)' : 'var(--accent-gold)' },
                  { label: 'Volatility Class', value: pair.volatility < 5 ? 'LOW' : pair.volatility < 7 ? 'MEDIUM' : 'HIGH', color: volColor(pair.volatility) },
                ].map(stat => (
                  <div key={stat.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{stat.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════
            TAB 3: MACRO WISDOM
            ══════════════════════════════════ */}
        {activeTab === 'wisdom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

            {/* Central Bank Policy */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                CENTRAL BANK POLICY STANCE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { country: pair.baseCurrency, rate: pair.interestDiff.base, stance: pair.interestDiff.base > 6 ? 'HAWKISH' : 'NEUTRAL' },
                  { country: pair.quoteCurrency, rate: pair.interestDiff.quote, stance: pair.interestDiff.quote > 6 ? 'HAWKISH' : 'NEUTRAL' },
                ].map(cb => (
                  <div key={cb.country} style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                      {cb.country} Central Bank
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>POLICY RATE</div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-gold)' }}>
                        {cb.rate.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>STANCE</div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                        background: cb.stance === 'HAWKISH' ? 'rgba(244,33,46,0.15)' : 'rgba(255,215,0,0.15)',
                        color: cb.stance === 'HAWKISH' ? 'var(--accent-red)' : 'var(--accent-gold)',
                      }}>
                        {cb.stance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carry Trade Analysis */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                CARRY TRADE OPPORTUNITY
              </div>
              <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: `3px solid ${pair.interestDiff.diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: pair.interestDiff.diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginBottom: 12 }}>
                  {pair.interestDiff.diff >= 0 ? `+${pair.interestDiff.diff.toFixed(2)}%` : `${pair.interestDiff.diff.toFixed(2)}%`} Annual Carry
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  {pair.interestDiff.diff >= 0
                    ? `Borrowing ${pair.quoteCurrency} at ${pair.interestDiff.quote.toFixed(2)}% to invest in ${pair.baseCurrency} at ${pair.interestDiff.base.toFixed(2)}% yields a positive carry of ${pair.interestDiff.diff.toFixed(2)}% annually (excluding FX risk).`
                    : `Negative carry trade: ${pair.baseCurrency} yields ${pair.interestDiff.base.toFixed(2)}% vs ${pair.quoteCurrency} at ${pair.interestDiff.quote.toFixed(2)}%. Consider reverse positioning.`
                  }
                </p>
              </div>
            </div>

            {/* Economic Outlook */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                MACRO ECONOMIC OUTLOOK
              </div>
              <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                  The {pair.symbol} pair shows a volatility of {pair.volatility.toFixed(1)}%, indicating {pair.volatility < 5 ? 'stable' : pair.volatility < 7 ? 'moderate' : 'elevated'} exchange rate fluctuations.
                  Current interest rate differential of {pair.interestDiff.diff >= 0 ? '+' : ''}{pair.interestDiff.diff.toFixed(2)}% favors {pair.interestDiff.diff >= 0 ? pair.baseCurrency : pair.quoteCurrency} positioning for carry traders.
                  PPP analysis suggests the pair is {pair.spotRate > pair.pppValue ? 'overvalued' : 'undervalued'} by {Math.abs((pair.spotRate - pair.pppValue) / pair.pppValue * 100).toFixed(1)}% from long-term equilibrium.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}