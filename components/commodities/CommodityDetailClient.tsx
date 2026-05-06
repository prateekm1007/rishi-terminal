'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Commodity } from '../../data/markets';
import { scoreJimRogers } from '../../lib/scorers/commodity/jimrogers';
import { scoreRickRule } from '../../lib/scorers/commodity/rickrule';
import { scoreDanielYergin } from '../../lib/scorers/commodity/danielyergin';

const TABS = [
  { id: 'overview',  label: 'Overview',      desc: 'Price & Fundamentals' },
  { id: 'technical', label: 'Technicals',    desc: 'Price Action & Indicators' },
  { id: 'wisdom',    label: 'Rishi Wisdom',  desc: 'Commodity Philosopher Scores' },
];

const COMMODITY_RISHIS = [
  { name: 'Jim Rogers',    scorer: scoreJimRogers,    emoji: '🌾', initials: 'JR' },
  { name: 'Rick Rule',     scorer: scoreRickRule,     emoji: '🥇', initials: 'RR' },
  { name: 'Daniel Yergin', scorer: scoreDanielYergin, emoji: '🛢️', initials: 'DY' },
];

function scoreColor(s: number) {
  return s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';
}

function scoreBg(s: number) {
  return s >= 75 ? 'rgba(0,186,124,0.1)' : s >= 55 ? 'rgba(255,215,0,0.1)' : 'rgba(244,33,46,0.1)';
}

export function CommodityDetailClient({ commodity }: { commodity: Commodity }) {
  const [activeTab, setActiveTab] = useState('overview');

  const rishiScores = COMMODITY_RISHIS.map(r => r.scorer(commodity));
  const avgScore = Math.round(rishiScores.reduce((sum, r) => sum + r.score, 0) / rishiScores.length);

  const range52w = commodity.high52w - commodity.low52w;
  const position52w = range52w > 0 ? ((commodity.price - commodity.low52w) / range52w) * 100 : 50;

  return (
    <div className="page-container">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <Link href="/commodities" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>COMMODITIES</Link>
            {' > ' + commodity.symbol}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 40 }}>{commodity.emoji}</span>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>
                  {commodity.name}
                </h1>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11, padding: '3px 8px',
                  background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: 4, color: 'var(--accent-gold)', letterSpacing: 1,
                }}>
                  {commodity.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, fontFamily: 'monospace' }}>
                <span>{commodity.category}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span>{commodity.exchange}</span>
                <span style={{ color: 'var(--border-primary)' }}>|</span>
                <span style={{ color: scoreColor(avgScore), fontWeight: 600 }}>
                  Rishi Consensus: {avgScore}/100
                </span>
              </div>
            </div>

            {/* Live Price Widget */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                {commodity.price.toLocaleString('en-US')}
                <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 6 }}>{commodity.unit}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 6, color: commodity.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {commodity.changePct >= 0 ? '▲' : '▼'} {Math.abs(commodity.changePct).toFixed(2)}% (1D)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Change: {commodity.changePct >= 0 ? '+' : ''}{commodity.change.toFixed(2)}{commodity.unit}
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
                  3 COMMODITY RISHI CONSENSUS
                </div>
                <div style={{ fontSize: 72, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(avgScore), lineHeight: 1 }}>
                  {avgScore}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                  Average of Jim Rogers, Rick Rule, Daniel Yergin
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
                  { label: 'Current Price', value: `${commodity.price.toLocaleString()}${commodity.unit}` },
                  { label: '52W Low', value: `${commodity.low52w.toLocaleString()}${commodity.unit}` },
                  { label: '52W High', value: `${commodity.high52w.toLocaleString()}${commodity.unit}` },
                  { label: '52W Position', value: `${position52w.toFixed(0)}%`, color: position52w >= 70 ? 'var(--accent-green)' : position52w >= 30 ? 'var(--accent-gold)' : 'var(--accent-red)' },
                  { label: 'Category', value: commodity.category },
                  { label: 'Exchange', value: commodity.exchange },
                ].map(m => (
                  <div key={m.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{m.label.toUpperCase()}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: m.color || 'var(--text-primary)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 52-Week Range Visualization */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                52-WEEK PRICE RANGE
              </div>
              <div style={{ position: 'relative', height: 60, background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${position52w}%`,
                  background: position52w >= 70 ? 'var(--accent-green)' : position52w >= 30 ? 'var(--accent-gold)' : 'var(--accent-red)',
                  opacity: 0.2,
                  borderRadius: '10px 0 0 10px',
                }} />
                <div style={{
                  position: 'absolute', left: `calc(${position52w}% - 2px)`, top: 0, bottom: 0,
                  width: 4,
                  background: position52w >= 70 ? 'var(--accent-green)' : position52w >= 30 ? 'var(--accent-gold)' : 'var(--accent-red)',
                }} />
                <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>
                  Low: {commodity.low52w.toLocaleString()}{commodity.unit}
                </div>
                <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>
                  High: {commodity.high52w.toLocaleString()}{commodity.unit}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Current price is at <strong style={{ color: scoreColor(position52w) }}>{position52w.toFixed(0)}%</strong> of 52-week range
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════
            TAB 2: TECHNICALS
            ══════════════════════════════════ */}
        {activeTab === 'technical' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

            {/* Price Levels */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                PRICE LEVELS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Current', value: commodity.price.toLocaleString(), color: 'var(--text-primary)' },
                  { label: '52W Low', value: commodity.low52w.toLocaleString(), color: 'var(--accent-red)' },
                  { label: '52W High', value: commodity.high52w.toLocaleString(), color: 'var(--accent-green)' },
                  { label: '52W Avg', value: ((commodity.low52w + commodity.high52w) / 2).toFixed(0), color: 'var(--accent-gold)' },
                ].map(lvl => (
                  <div key={lvl.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{lvl.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: lvl.color }}>
                      {lvl.value}<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{commodity.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Stats */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>
                PERFORMANCE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: '1 Day Change', value: `${commodity.changePct >= 0 ? '+' : ''}${commodity.changePct.toFixed(2)}%`, color: commodity.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                  { label: 'Absolute Change', value: `${commodity.change >= 0 ? '+' : ''}${commodity.change.toFixed(2)}${commodity.unit}`, color: commodity.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                  { label: 'From 52W Low', value: `+${((commodity.price - commodity.low52w) / commodity.low52w * 100).toFixed(1)}%`, color: 'var(--accent-green)' },
                  { label: 'From 52W High', value: `${((commodity.price - commodity.high52w) / commodity.high52w * 100).toFixed(1)}%`, color: 'var(--accent-red)' },
                ].map(perf => (
                  <div key={perf.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{perf.label.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: perf.color }}>{perf.value}</div>
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
              const rishi = COMMODITY_RISHIS[i];
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