'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ForexPair } from '../../data/forex';

const TABS = [
  { id: 'overview',   label: 'Overview',       desc: 'Rates & Fundamentals'        },
  { id: 'technical',  label: 'Technicals',     desc: 'Indicators & Signals'        },
  { id: 'wisdom',     label: 'Macro Wisdom',   desc: 'Central Bank & Economic Analysis' },
  { id: 'knowledge',  label: 'Knowledge Graph', desc: 'Bulls vs Bears & Edge'      },
];

const MACRO_RISHIS = [
  {
    name: 'George Soros',
    initials: 'GS',
    lens: 'Reflexivity',
    philosophy: 'Markets are always biased in one direction or another. The key is to find the bias.',
    bio: 'Co-founder of Quantum Fund. Broke the Bank of England. Father of reflexivity theory.',
  },
  {
    name: 'Ray Dalio',
    initials: 'RD',
    lens: 'Debt Cycles',
    philosophy: 'Understand the machine — interest rates and debt cycles drive all major currency moves.',
    bio: 'Founder of Bridgewater. Creator of the economic machine framework. All-weather portfolio pioneer.',
  },
  {
    name: 'Stanley Druckenmiller',
    initials: 'SD',
    lens: 'Macro Momentum',
    philosophy: 'Earnings dont move the overall market; the Federal Reserve does.',
    bio: 'Managed Soros Quantum Fund. Best macro track record in history. Currency and rate specialist.',
  },
];

function trendColor(val: number) { return val >= 0 ? '#22C55E' : '#EF4444'; }
function volColor(vol: number) { return vol < 5 ? '#22C55E' : vol < 7 ? '#D4AF37' : '#EF4444'; }
function scoreColor(s: number) { return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444'; }

function scoreMacroRishi(pair: ForexPair, rishiName: string): { score: number; signal: string; reasoning: string; comps: Array<{ label: string; v: number; detail: string }> } {
  const pppDev = Math.abs((pair.spotRate - pair.pppValue) / pair.pppValue * 100);
  const carryScore = Math.min(100, Math.max(0, 50 + pair.interestDiff.diff * 10));
  const volScore = pair.volatility < 5 ? 80 : pair.volatility < 7 ? 60 : 40;
  const pppScore = pppDev < 5 ? 80 : pppDev < 10 ? 60 : 40;
  const trendScore = pair.change24h > 0 ? 65 : 45;

  let totalScore = 0;
  let reasoning = '';

  if (rishiName === 'George Soros') {
    totalScore = Math.round(carryScore * 0.35 + trendScore * 0.35 + volScore * 0.30);
    reasoning = `Reflexivity lens: ${pair.baseCurrency}/${pair.quoteCurrency} shows ${pair.interestDiff.diff > 0 ? 'positive' : 'negative'} carry of ${pair.interestDiff.diff.toFixed(2)}%. Market bias ${pair.change24h > 0 ? 'bullish' : 'bearish'} on 24h trend.`;
  } else if (rishiName === 'Ray Dalio') {
    totalScore = Math.round(pppScore * 0.40 + carryScore * 0.35 + volScore * 0.25);
    reasoning = `Debt cycle lens: PPP deviation of ${pppDev.toFixed(1)}% signals ${pair.spotRate > pair.pppValue ? 'overvaluation' : 'undervaluation'}. Interest differential ${pair.interestDiff.diff > 0 ? 'favors' : 'disfavors'} ${pair.baseCurrency}.`;
  } else {
    totalScore = Math.round(trendScore * 0.40 + carryScore * 0.35 + volScore * 0.25);
    reasoning = `Macro momentum lens: ${pair.volatility.toFixed(1)}% volatility is ${pair.volatility < 5 ? 'low — trend continuation likely' : 'elevated — caution on sizing'}. Rate differential drives directional bias.`;
  }

  const signal = totalScore >= 70 ? 'BULLISH' : totalScore >= 50 ? 'NEUTRAL' : 'BEARISH';

  return {
    score: totalScore,
    signal,
    reasoning,
    comps: [
      { label: 'Carry Trade', v: Math.round(carryScore), detail: `${pair.interestDiff.diff.toFixed(2)}% rate differential` },
      { label: 'PPP Alignment', v: Math.round(pppScore), detail: `${pppDev.toFixed(1)}% from fair value` },
      { label: 'Volatility', v: Math.round(volScore), detail: `${pair.volatility.toFixed(1)}% annualized vol` },
      { label: 'Momentum', v: Math.round(trendScore), detail: `${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}% 24h` },
    ],
  };
}

export function ForexDetailClient({ pair }: { pair: ForexPair }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showGraph, setShowGraph] = useState(false);

  const change1D = pair.change24h || 0;
  const pppDeviation = ((pair.spotRate - pair.pppValue) / pair.pppValue * 100);
  const isOvervalued = pair.spotRate > pair.pppValue;

  const rishiScores = MACRO_RISHIS.map(r => ({ ...r, result: scoreMacroRishi(pair, r.name) }));
  const avgScore = Math.round(rishiScores.reduce((s, r) => s + r.result.score, 0) / rishiScores.length);

  const bulls = rishiScores.filter(r => r.result.score >= 65);
  const bears = rishiScores.filter(r => r.result.score < 45);
  const neutrals = rishiScores.filter(r => r.result.score >= 45 && r.result.score < 65);

  const technicalEdge = [
    { metric: 'Carry Trade Yield', stockVal: Math.abs(pair.interestDiff.diff), sectorAvg: 1.5, unit: '%', higherIsBetter: true, insight: pair.interestDiff.diff > 1.5 ? `Strong positive carry of ${pair.interestDiff.diff.toFixed(2)}% favors ${pair.baseCurrency} longs` : 'Low carry yield — FX gains required for profitability' },
    { metric: 'PPP Deviation', stockVal: Math.abs(pppDeviation), sectorAvg: 5, unit: '%', higherIsBetter: false, insight: `${pair.baseCurrency} is ${isOvervalued ? 'overvalued' : 'undervalued'} by ${Math.abs(pppDeviation).toFixed(1)}% vs PPP fair value` },
    { metric: 'Volatility', stockVal: pair.volatility, sectorAvg: 5, unit: '%', higherIsBetter: false, insight: pair.volatility < 5 ? 'Low volatility — stable trend regime' : pair.volatility < 7 ? 'Moderate volatility — size positions carefully' : 'High volatility — use tighter stops' },
    { metric: 'Rate Differential', stockVal: pair.interestDiff.base, sectorAvg: pair.interestDiff.quote, unit: '%', higherIsBetter: true, insight: `${pair.baseCurrency} at ${pair.interestDiff.base.toFixed(2)}% vs ${pair.quoteCurrency} at ${pair.interestDiff.quote.toFixed(2)}%` },
  ];

  return (
    <div className="page-container">

      {/* Knowledge Graph Modal */}
      {showGraph && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0A0F1C', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '85vh', overflow: 'auto', padding: 32, position: 'relative' }}>
            <button onClick={() => setShowGraph(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', color: '#EF4444', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>CLOSE</button>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', marginBottom: 24 }}>{pair.baseCurrency}/{pair.quoteCurrency} — Macro Knowledge Graph</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>BULLISH MACRO ({bulls.length})</div>
                {bulls.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>No bullish signals at current levels</div>}
                {bulls.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{r.name}</span>
                      <span style={{ color: '#22C55E', fontWeight: 700 }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{r.result.reasoning}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>BEARISH MACRO ({bears.length})</div>
                {bears.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>No bearish signals at current levels</div>}
                {bears.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{r.name}</span>
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{r.result.reasoning}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', marginBottom: 12 }}>MACRO EDGE</div>
            {technicalEdge.map((te, i) => {
              const good = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
              return (
                <div key={i} style={{ marginBottom: 10, padding: 12, background: 'rgba(17,24,39,0.8)', border: `1px solid ${good ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#F8FAFC' }}>{te.metric}</span>
                    <span style={{ fontSize: 11, color: good ? '#22C55E' : '#EF4444', fontWeight: 700 }}>{te.stockVal.toFixed(2)}{te.unit}</span>
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
            <Link href="/forex" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>FOREX</Link>
            {' > ' + pair.symbol}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 32 }}>💱</span>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>{pair.baseCurrency}/{pair.quoteCurrency}</h1>
                <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '3px 8px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 4, color: 'var(--accent-gold)' }}>{pair.symbol}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                <span>{pair.name}</span>
                <span>|</span>
                <span>Vol: {pair.volatility.toFixed(1)}%</span>
                <span>|</span>
                <span style={{ color: scoreColor(avgScore), fontWeight: 600 }}>Macro Consensus: {avgScore}/100</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>{pair.spotRate.toFixed(4)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 6, color: trendColor(change1D) }}>
                {change1D >= 0 ? '+' : ''}{change1D.toFixed(2)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Spread: {pair.spread.toFixed(4)}</div>
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

            {/* Macro Consensus Hero */}
            <div className="card-sacred" style={{ padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)' }} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 12 }}>3 MACRO RISHI CONSENSUS</div>
              <div style={{ fontSize: 80, fontWeight: 900, fontFamily: 'monospace', color: scoreColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                {avgScore >= 70 ? 'Bullish — Macro conditions favor ' + pair.baseCurrency : avgScore >= 50 ? 'Neutral — Mixed signals, range-bound likely' : 'Bearish — Macro headwinds for ' + pair.baseCurrency}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
                {rishiScores.map(r => (
                  <div key={r.name} style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: `2px solid ${scoreColor(r.result.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: scoreColor(r.result.score), margin: '0 auto 6px' }}>{r.initials}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.result.score) }}>{r.result.score}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.name.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bid/Ask/Spread */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>BID / ASK / SPREAD</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Bid', value: pair.bid.toFixed(4), color: '#22C55E' },
                  { label: 'Ask', value: pair.ask.toFixed(4), color: '#EF4444' },
                  { label: 'Spread', value: pair.spread.toFixed(4), color: '#D4AF37' },
                  { label: 'Mid', value: ((pair.bid + pair.ask) / 2).toFixed(4), color: 'var(--text-primary)' },
                ].map(m => (
                  <div key={m.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Forward Rates */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>FORWARD RATES</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {[
                  { label: '1 Month', value: pair.forward1M.toFixed(4) },
                  { label: '3 Months', value: pair.forward3M.toFixed(4) },
                  { label: '6 Months', value: pair.forward6M.toFixed(4) },
                  { label: '12 Months', value: pair.forward12M.toFixed(4) },
                ].map(f => (
                  <div key={f.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interest Rate Differential */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>INTEREST RATE DIFFERENTIAL</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  { label: `${pair.baseCurrency} Rate`, value: `${pair.interestDiff.base.toFixed(2)}%`, color: '#60a5fa' },
                  { label: `${pair.quoteCurrency} Rate`, value: `${pair.interestDiff.quote.toFixed(2)}%`, color: '#c084fc' },
                  { label: 'Differential', value: `${pair.interestDiff.diff >= 0 ? '+' : ''}${pair.interestDiff.diff.toFixed(2)}%`, color: pair.interestDiff.diff >= 0 ? '#22C55E' : '#EF4444' },
                ].map(r => (
                  <div key={r.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{r.label.toUpperCase()}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: r.color }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TECHNICAL TAB */}
        {activeTab === 'technical' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Performance */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>PERFORMANCE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  { label: '1 Day', value: change1D },
                  { label: 'Volatility', value: pair.volatility, isVol: true },
                  { label: 'From 52W High', value: -Math.abs(((pair.high52w - pair.spotRate) / pair.high52w) * 100) },
                  { label: 'From 52W Low', value: Math.abs(((pair.spotRate - pair.low52w) / pair.low52w) * 100) },
                ].map(p => (
                  <div key={p.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>{p.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: p.isVol ? volColor(p.value) : trendColor(p.value) }}>
                      {p.isVol ? `${p.value.toFixed(1)}%` : `${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)}%`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PPP Analysis */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>PURCHASING POWER PARITY (PPP)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
                {[
                  { label: 'Spot Rate', value: pair.spotRate.toFixed(4), color: 'var(--text-primary)' },
                  { label: 'PPP Fair Value', value: pair.pppValue.toFixed(4), color: '#D4AF37' },
                  { label: 'Over/Under Valued', value: `${pppDeviation >= 0 ? '+' : ''}${pppDeviation.toFixed(1)}%`, color: isOvervalued ? '#EF4444' : '#22C55E' },
                ].map(p => (
                  <div key={p.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{p.label.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: p.color }}>{p.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid #D4AF37' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {isOvervalued
                    ? `${pair.baseCurrency} is overvalued by ${Math.abs(pppDeviation).toFixed(1)}% vs ${pair.quoteCurrency} based on PPP. Ray Dalio's debt cycle model suggests mean reversion risk.`
                    : `${pair.baseCurrency} is undervalued by ${Math.abs(pppDeviation).toFixed(1)}% vs ${pair.quoteCurrency} based on PPP. Druckenmiller sees potential upside catalyst if macro turns.`}
                </p>
              </div>
            </div>

            {/* Macro Edge Bars */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>MACRO EDGE ANALYSIS</div>
              {technicalEdge.map((te, i) => {
                const good = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
                return (
                  <div key={i} style={{ marginBottom: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: `1px solid ${good ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{te.metric}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: good ? '#22C55E' : '#EF4444' }}>{te.stockVal.toFixed(2)}{te.unit}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(51,65,85,0.5)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, Math.abs(te.stockVal) * 10) + '%', background: good ? '#22C55E' : '#EF4444', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#D4AF37' }}>{te.insight}</div>
                  </div>
                );
              })}
            </div>

            {/* 24H Stats */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>24H TRADING STATISTICS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { label: '24h Volume', value: `$${(pair.volume24h / 1e9).toFixed(2)}B`, color: '#60a5fa' },
                  { label: 'Liquidity', value: pair.liquidity, color: pair.liquidity === 'HIGH' ? '#22C55E' : '#D4AF37' },
                  { label: 'Volatility Class', value: pair.volatility < 5 ? 'LOW' : pair.volatility < 7 ? 'MEDIUM' : 'HIGH', color: volColor(pair.volatility) },
                ].map(s => (
                  <div key={s.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* WISDOM TAB */}
        {activeTab === 'wisdom' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* Central Bank Policy */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>CENTRAL BANK POLICY STANCE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { country: pair.baseCurrency, rate: pair.interestDiff.base },
                  { country: pair.quoteCurrency, rate: pair.interestDiff.quote },
                ].map(cb => {
                  const stance = cb.rate > 6 ? 'HAWKISH' : cb.rate > 4 ? 'NEUTRAL' : 'DOVISH';
                  const stanceColor = stance === 'HAWKISH' ? '#EF4444' : stance === 'NEUTRAL' ? '#D4AF37' : '#22C55E';
                  return (
                    <div key={cb.country} style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{cb.country} Central Bank</div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>POLICY RATE</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: '#D4AF37' }}>{cb.rate.toFixed(2)}%</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: stanceColor + '20', color: stanceColor }}>{stance}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Macro Rishis */}
            {rishiScores.map(r => (
              <div key={r.name} className="card-sacred" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${scoreColor(r.result.score)}, transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: `2px solid ${scoreColor(r.result.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: scoreColor(r.result.score) }}>{r.initials}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.lens} • {r.result.signal}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'monospace', color: scoreColor(r.result.score), lineHeight: 1 }}>{r.result.score}</div>
                  </div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: `3px solid ${scoreColor(r.result.score)}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>ANALYSIS</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{r.result.reasoning}</p>
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

            {/* Carry Trade */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>CARRY TRADE ANALYSIS</div>
              <div style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: `3px solid ${pair.interestDiff.diff >= 0 ? '#22C55E' : '#EF4444'}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: pair.interestDiff.diff >= 0 ? '#22C55E' : '#EF4444', marginBottom: 8 }}>
                  {pair.interestDiff.diff >= 0 ? 'POSITIVE CARRY OPPORTUNITY' : 'NEGATIVE CARRY — REVERSE TRADE'}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  {pair.interestDiff.diff >= 0
                    ? `Borrowing ${pair.quoteCurrency} at ${pair.interestDiff.quote.toFixed(2)}% to invest in ${pair.baseCurrency} at ${pair.interestDiff.base.toFixed(2)}% yields +${pair.interestDiff.diff.toFixed(2)}% annually (excluding FX risk). Soros would size this based on trend confirmation.`
                    : `Negative carry of ${pair.interestDiff.diff.toFixed(2)}%. ${pair.baseCurrency} yields less than ${pair.quoteCurrency}. Dalio suggests this pair needs strong trend momentum to overcome carry drag.`}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* KNOWLEDGE GRAPH TAB */}
        {activeTab === 'knowledge' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card-sacred" style={{ padding: 24, borderTop: '2px solid #22C55E' }}>
                <div style={{ fontSize: 9, color: '#22C55E', letterSpacing: 2, marginBottom: 16 }}>BULLISH MACRO ({bulls.length})</div>
                {bulls.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No bullish macro signals</div>}
                {bulls.map((r, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: 14, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{r.result.reasoning}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic', borderLeft: '2px solid #22C55E', paddingLeft: 8 }}>{r.philosophy}</div>
                  </div>
                ))}
              </div>
              <div className="card-sacred" style={{ padding: 24, borderTop: '2px solid #EF4444' }}>
                <div style={{ fontSize: 9, color: '#EF4444', letterSpacing: 2, marginBottom: 16 }}>BEARISH MACRO ({bears.length})</div>
                {bears.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No bearish macro signals</div>}
                {bears.map((r, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: 14, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#EF4444' }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{r.result.reasoning}</div>
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
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.result.reasoning}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>MACRO EDGE</div>
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