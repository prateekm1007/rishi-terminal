'use client';

import { useState } from 'react';
import { useLanguage } from '../../lib/language';
import Link from 'next/link';
import type { CommodityData as Commodity } from '../../data/markets';
import { usePrice } from '../../hooks/useLivePrices';
import type { UniversalAsset } from '../../lib/types/asset';
import { AssetPriceChart } from '../terminal/AssetPriceChart';
import { scoreJimRogers } from '../../lib/scorers/commodity/jimrogers';
import { scoreRickRule } from '../../lib/scorers/commodity/rickrule';
import { scoreDanielYergin } from '../../lib/scorers/commodity/danielyergin';

const TABS = [
  { id: 'overview',   label: 'Overview',       desc: 'Price & Fundamentals'         },
  { id: 'technical',  label: 'Technicals',     desc: 'Indicators & Signals'         },
  { id: 'wisdom',     label: 'Rishi Wisdom',   desc: 'Commodity Philosopher Scores' },
  { id: 'knowledge',  label: 'Knowledge Graph', desc: 'Bulls vs Bears & Edge'       },
];

const COMMODITY_RISHIS = [
  { name: 'Jim Rogers',    scorer: scoreJimRogers,    initials: 'JR',
    bio: 'Co-founded Quantum Fund. Predicted the 2000s commodities supercycle.',
    philosophy: 'Buy commodities when nobody wants them. Sell when everybody loves them.',
    focus: 'Supercycles, physical assets, inflation hedge' },
  { name: 'Rick Rule',     scorer: scoreRickRule,     initials: 'RR',
    bio: 'CEO of Sprott. Legendary resource sector investor.',
    philosophy: 'Gold is money. Everything else is credit.',
    focus: 'Precious metals, resource scarcity, monetary systems' },
  { name: 'Daniel Yergin', scorer: scoreDanielYergin, initials: 'DY',
    bio: 'Pulitzer Prize-winning energy historian. VP at S&P Global.',
    philosophy: 'Oil is the lifeblood of the industrial civilization.',
    focus: 'Energy transitions, geopolitical risk, supply dynamics' },
];

function scoreColor(s: number) {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : s >= 35 ? '#f59e0b' : '#EF4444';
}
function scoreBg(s: number) {
  return s >= 75 ? 'rgba(34,197,94,0.1)' : s >= 55 ? 'rgba(212,175,55,0.1)' : 'rgba(239,68,68,0.1)';
}
function signalColor(signal: string) {
  if (signal === 'BUY' || signal === 'STRONG BUY') return '#22C55E';
  if (signal === 'SELL') return '#EF4444';
  return '#D4AF37';
}

export function CommodityDetailClient({ commodity }: { commodity: Commodity }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [showGraph, setShowGraph] = useState(false);

  const { price: livePriceData } = usePrice(commodity.symbol);
  const displayPrice = livePriceData?.price && livePriceData.price > 0 ? livePriceData.price : commodity.price;
  const displayChange = livePriceData?.changePercent24h !== undefined ? livePriceData.changePercent24h : commodity.changePct;
  const liveCommodity = {
    ...commodity,
    price: displayPrice,
    changePct: displayChange,
    change: livePriceData?.change ?? commodity.change,
  };
  const rishiScores = COMMODITY_RISHIS.map(r => ({ ...r, result: r.scorer(liveCommodity) }));
  const avgScore = Math.round(rishiScores.reduce((s, r) => s + r.result.score, 0) / rishiScores.length);

  const chartAsset: UniversalAsset = {
    symbol: commodity.symbol,
    name: commodity.name,
    category: 'commodity',
    price: displayPrice,
    change24h: displayChange,
    metadata: commodity,
  };

  const range52w = commodity.high52w - commodity.low52w;
  const pos52w = range52w > 0 ? ((displayPrice - commodity.low52w) / range52w) * 100 : 50;

  // Knowledge graph data
  const bulls = rishiScores.filter(r => r.result.score >= 65);
  const bears = rishiScores.filter(r => r.result.score < 45);
  const neutrals = rishiScores.filter(r => r.result.score >= 45 && r.result.score < 65);
  // Technical edge vs commodity benchmarks
  // NOTE: For commodities, stock-style RSI/SMA/MACD are low-utility without a true OHLC history pipeline.
  // We instead show commodity-specific fundamentals that matter most: curve structure, inventories, supercycle, cost, seasonality, USD sensitivity.
  const costMargin = commodity.costMargin ??
    (commodity.productionCost
      ? Number((((displayPrice - commodity.productionCost) / commodity.productionCost) * 100).toFixed(1))
      : undefined);

  const technicalEdge = [
    ...(commodity.contango !== undefined ? [{
      metric: 'Contango/Backwardation',
      stockVal: commodity.contango,           // signed (%); negative = backwardation (bullish structure)
      sectorAvg: 0,
      unit: '%',
      higherIsBetter: false,
      insight: commodity.contango > 1
        ? `${commodity.contango.toFixed(1)}% contango — curve suggests oversupply / weak spot demand`
        : commodity.contango < -1
          ? `${Math.abs(commodity.contango).toFixed(1)}% backwardation — tight supply / strong spot demand`
          : 'Flat curve — balanced supply/demand',
    }] : []),

    ...(commodity.inventoryVs5YAvg !== undefined ? [{
      metric: 'Inventory vs 5Y Avg',
      stockVal: commodity.inventoryVs5YAvg,   // signed (%); negative = tight (bullish)
      sectorAvg: 0,
      unit: '%',
      higherIsBetter: false,
      insight: commodity.inventoryVs5YAvg < -10
        ? `Inventories ${Math.abs(commodity.inventoryVs5YAvg)}% below avg — squeeze risk`
        : commodity.inventoryVs5YAvg > 10
          ? `Inventories ${commodity.inventoryVs5YAvg}% above avg — oversupply`
          : `Near normal inventories (${commodity.inventoryDays ?? 'n/a'} days)`,
    }] : []),

    ...(commodity.supercycleScore !== undefined ? [{
      metric: 'Supercycle Position (Rogers)',
      stockVal: commodity.supercycleScore,    // 0-100
      sectorAvg: 50,
      unit: '',
      higherIsBetter: true,
      insight: commodity.supercyclePhase === 'early'
        ? 'Early-cycle — accumulation phase'
        : commodity.supercyclePhase === 'mid'
          ? 'Mid-cycle — fundamentals support continuation'
          : commodity.supercyclePhase === 'late'
            ? 'Late-cycle — exhaustion risk; consider de-risking'
            : commodity.supercyclePhase === 'decline'
              ? 'Decline — wait for capitulation / supply cuts'
              : 'Cycle unknown',
    }] : []),

    ...(costMargin !== undefined ? [{
      metric: 'Price vs Production Cost',
      stockVal: costMargin,                  // %
      sectorAvg: 20,
      unit: '%',
      higherIsBetter: false,                 // lower margin = closer to cost (often better forward returns)
      insight: commodity.productionCost
        ? `Breakeven ~${commodity.productionCost.toLocaleString()} ${commodity.unit}; margin ${costMargin.toFixed(0)}%`
        : `Cost margin ${costMargin.toFixed(0)}%`,
    }] : []),

    ...(commodity.seasonalityIndex !== undefined ? [{
      metric: 'Seasonality Strength',
      stockVal: commodity.seasonalityIndex,  // 0-100
      sectorAvg: 50,
      unit: '',
      higherIsBetter: true,
      insight: commodity.seasonalityIndex > 70
        ? 'Peak seasonal demand period'
        : commodity.seasonalityIndex < 40
          ? 'Off-season — historically weaker demand'
          : 'Normal seasonal conditions',
    }] : []),

    ...(commodity.usdCorrelation !== undefined ? [{
      metric: 'USD Sensitivity (|corr|)',
      stockVal: Math.abs(commodity.usdCorrelation) * 100, // 0..100
      sectorAvg: 50,
      unit: '%',
      higherIsBetter: false,
      insight: `${commodity.usdCorrelation.toFixed(2)} correlation vs USD (DXY). Higher sensitivity = bigger USD-driven swings.`,
    }] : []),

    {
      metric: '52W Range Position',
      stockVal: pos52w,
      sectorAvg: 50,
      unit: '%',
      higherIsBetter: true,
      insight: pos52w > 70
        ? 'Near 52W high — strong momentum'
        : pos52w < 30
          ? 'Near 52W low — potential accumulation'
          : 'Mid-range — wait for breakout',
    },

    {
      metric: 'Momentum (1D)',
      stockVal: displayChange,
      sectorAvg: 0,
      unit: '%',
      higherIsBetter: true,
      insight: displayChange > 2
        ? 'Strong daily momentum'
        : displayChange < -2
          ? 'Sharp decline — watch reversal / mean reversion'
          : 'Quiet day — consolidation',
    },
  ];

  return (
    <div className="page-container">

      {/* Knowledge Graph Modal */}
      {showGraph && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0A0F1C', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '85vh', overflow: 'auto', padding: 32, position: 'relative' }}>
            <button onClick={() => setShowGraph(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', color: '#EF4444', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              CLOSE
            </button>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#D4AF37', marginBottom: 24 }}>
              {commodity.name} — {t("kg.knowledgeGraph")}
            </div>

            {/* Bulls vs Bears */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>
                  {t("kg.bullCase")} ({bulls.length})
                </div>
                {bulls.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>{t("kg.noBulls")}</div>}
                {bulls.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: 12, background: 'rgba(34,197,94,0.05)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{r.name}</span>
                      <span style={{ fontSize: 14, color: '#22C55E', fontWeight: 700 }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{r.result.insight}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic', marginTop: 6, borderLeft: '2px solid #22C55E', paddingLeft: 8 }}>{r.philosophy}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>
                  {t("kg.bearCase")} ({bears.length})
                </div>
                {bears.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>{t("kg.noBears")}</div>}
                {bears.map((r, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: 12, background: 'rgba(239,68,68,0.05)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>{r.name}</span>
                      <span style={{ fontSize: 14, color: '#EF4444', fontWeight: 700 }}>{r.result.score}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{r.result.insight}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic', marginTop: 6, borderLeft: '2px solid #EF4444', paddingLeft: 8 }}>{r.philosophy}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Edge */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D4AF37', marginBottom: 16 }}>COMMODITY FUNDAMENTALS</div>
            {technicalEdge.map((te, i) => {
              const delta = te.stockVal - te.sectorAvg;
              const outperforming = te.higherIsBetter ? delta > 0 : delta < 0;
              return (
                <div key={i} style={{ background: 'rgba(17,24,39,0.8)', border: `1px solid ${outperforming ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC' }}>{te.metric}</span>
                    <span style={{ fontSize: 12, color: outperforming ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                      {te.stockVal.toFixed(1)}{te.unit}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(51,65,85,0.5)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: Math.min(100, Math.max(0, Math.abs(te.stockVal))) + '%', background: outperforming ? '#22C55E' : '#EF4444', borderRadius: 3 }} />
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
            <Link href="/commodities" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>COMMODITIES</Link>
            {' > ' + commodity.symbol}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 40 }}>{commodity.emoji}</span>
                <h1 className="philosophy-heading" style={{ fontSize: 28, color: 'var(--accent-gold)', letterSpacing: 2 }}>{commodity.name}</h1>
                <span style={{ fontFamily: 'monospace', fontSize: 11, padding: '3px 8px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 4, color: 'var(--accent-gold)' }}>{commodity.symbol}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                <span>{commodity.category}</span>
                <span>|</span>
                <span>{(commodity as any).exchange || "Global"}</span>
                <span>|</span>
                <span style={{ color: scoreColor(avgScore), fontWeight: 600 }}>Rishi Consensus: {avgScore}/100</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
                {displayPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}<span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 6 }}>{commodity.unit}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', marginTop: 6, color: displayChange >= 0 ? '#22C55E' : '#EF4444' }}>
                {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}%
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
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 12 }}>3 COMMODITY RISHI CONSENSUS</div>
              <div style={{ fontSize: 80, fontWeight: 900, fontFamily: 'monospace', color: scoreColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                {avgScore >= 75 ? 'Strong Buy — Supercycle Conditions Present' : avgScore >= 55 ? 'Moderate Opportunity — Selective Accumulation' : 'Caution — Wait for Better Entry'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
                {rishiScores.map(r => (
                  <div key={r.name} style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: scoreBg(r.result.score), border: `2px solid ${scoreColor(r.result.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: scoreColor(r.result.score), margin: '0 auto 6px' }}>{r.initials}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.result.score) }}>{r.result.score}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commodity Native Fundamentals */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 20 }}>COMMODITY FUNDAMENTALS</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {commodity.contango !== undefined && (
                  <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: commodity.contango < -1 ? 'rgba(34,197,94,0.06)' : commodity.contango > 1 ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)',
                    border: `1px solid ${commodity.contango < -1 ? 'rgba(34,197,94,0.3)' : commodity.contango > 1 ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.3)'}`
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>CURVE STRUCTURE</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: commodity.contango < -1 ? '#22C55E' : commodity.contango > 1 ? '#EF4444' : '#D4AF37', marginBottom: 4 }}>
                      {commodity.contango < 0 ? '' : '+'}{commodity.contango.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: commodity.contango < -1 ? '#22C55E' : commodity.contango > 1 ? '#EF4444' : '#D4AF37' }}>
                      {commodity.contango < -1 ? 'BACKWARDATION' : commodity.contango > 1 ? 'CONTANGO' : 'FLAT CURVE'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {commodity.contango < -1 ? 'Tight spot supply — strong immediate demand signal' : commodity.contango > 1 ? 'Oversupply — carry cost erodes forward returns' : 'Balanced supply/demand in futures market'}
                    </div>
                  </div>
                )}

                {commodity.inventoryVs5YAvg !== undefined && (
                  <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: commodity.inventoryVs5YAvg < -10 ? 'rgba(34,197,94,0.06)' : commodity.inventoryVs5YAvg > 10 ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)',
                    border: `1px solid ${commodity.inventoryVs5YAvg < -10 ? 'rgba(34,197,94,0.3)' : commodity.inventoryVs5YAvg > 10 ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.3)'}`
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>INVENTORY TIGHTNESS</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: commodity.inventoryVs5YAvg < -10 ? '#22C55E' : commodity.inventoryVs5YAvg > 10 ? '#EF4444' : '#D4AF37', marginBottom: 4 }}>
                      {commodity.inventoryVs5YAvg >= 0 ? '+' : ''}{commodity.inventoryVs5YAvg}% vs 5Y
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: commodity.inventoryVs5YAvg < -10 ? '#22C55E' : commodity.inventoryVs5YAvg > 10 ? '#EF4444' : '#D4AF37' }}>
                      {commodity.inventoryVs5YAvg < -10 ? 'TIGHT SUPPLY' : commodity.inventoryVs5YAvg > 10 ? 'OVERSUPPLY' : 'NORMAL'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {commodity.inventoryDays ?? 'n/a'} days supply on hand
                    </div>
                  </div>
                )}

                {commodity.productionCost !== undefined && (
                  <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.3)'
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>PRODUCTION COST</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#D4AF37', marginBottom: 4 }}>
                      {commodity.productionCost.toLocaleString()} {commodity.unit}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: (costMargin ?? 0) > 30 ? '#22C55E' : (costMargin ?? 0) < 5 ? '#EF4444' : '#D4AF37' }}>
                      {(costMargin ?? 0).toFixed(0)}% ABOVE BREAKEVEN
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {(costMargin ?? 0) > 30 ? 'Producers highly profitable — watch for supply response' : (costMargin ?? 0) < 5 ? 'Near breakeven — supply cuts likely' : 'Marginal profitability zone'}
                    </div>
                  </div>
                )}

                {commodity.seasonalityIndex !== undefined && (
                  <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: commodity.seasonalityIndex > 70 ? 'rgba(34,197,94,0.06)' : commodity.seasonalityIndex < 40 ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)',
                    border: `1px solid ${commodity.seasonalityIndex > 70 ? 'rgba(34,197,94,0.3)' : commodity.seasonalityIndex < 40 ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.3)'}`
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>SEASONALITY</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: commodity.seasonalityIndex > 70 ? '#22C55E' : commodity.seasonalityIndex < 40 ? '#EF4444' : '#D4AF37', marginBottom: 4 }}>
                      {commodity.seasonalityIndex}/100
                    </div>
                    <div style={{ height: 6, background: 'rgba(51,65,85,0.5)', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${commodity.seasonalityIndex}%`,
                        background: commodity.seasonalityIndex > 70 ? '#22C55E' : commodity.seasonalityIndex < 40 ? '#EF4444' : '#D4AF37',
                        borderRadius: 3
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {commodity.seasonalityIndex > 70 ? 'Peak demand season — historically bullish window' : commodity.seasonalityIndex < 40 ? 'Off-season — subdued demand expected' : 'Normal seasonal conditions'}
                    </div>
                  </div>
                )}

                {commodity.supercycleScore !== undefined && (
                  <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: commodity.supercycleScore > 70 ? 'rgba(34,197,94,0.06)' : commodity.supercycleScore < 40 ? 'rgba(239,68,68,0.06)' : 'rgba(212,175,55,0.06)',
                    border: `1px solid ${commodity.supercycleScore > 70 ? 'rgba(34,197,94,0.3)' : commodity.supercycleScore < 40 ? 'rgba(239,68,68,0.3)' : 'rgba(212,175,55,0.3)'}`
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>SUPERCYCLE (JIM ROGERS)</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: commodity.supercycleScore > 70 ? '#22C55E' : commodity.supercycleScore < 40 ? '#EF4444' : '#D4AF37', marginBottom: 4 }}>
                      {commodity.supercycleScore}/100
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: commodity.supercycleScore > 70 ? '#22C55E' : commodity.supercycleScore < 40 ? '#EF4444' : '#D4AF37' }}>
                      {commodity.supercyclePhase ?? 'Unknown'} phase
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {commodity.supercyclePhase === 'early' ? 'Best accumulation zone — lowest risk entry' : commodity.supercyclePhase === 'mid' ? 'Momentum phase — ride the trend' : commodity.supercyclePhase === 'late' ? 'Exhaustion risk — reduce exposure' : 'Wait for capitulation and supply cuts'}
                    </div>
                  </div>
                )}

                {commodity.usdCorrelation !== undefined && (
                  <div style={{
                    padding: 18,
                    borderRadius: 10,
                    background: 'rgba(96,165,250,0.06)',
                    border: '1px solid rgba(96,165,250,0.3)'
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>USD / DXY SENSITIVITY</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#60a5fa', marginBottom: 4 }}>
                      {commodity.usdCorrelation.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 6 }}>
                      {Math.abs(commodity.usdCorrelation) > 0.6 ? 'HIGH USD SENSITIVITY' : Math.abs(commodity.usdCorrelation) > 0.3 ? 'MODERATE SENSITIVITY' : 'LOW SENSITIVITY'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {commodity.usdCorrelation < -0.6 ? 'USD weakness is a strong tailwind' : commodity.usdCorrelation < -0.3 ? 'Moderate inverse correlation — monitor DXY' : 'Weak USD linkage — other factors dominate'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* 52W Range */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>52-WEEK PRICE RANGE</div>
              <div style={{ position: 'relative', height: 48, background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pos52w}%`, background: scoreColor(pos52w), opacity: 0.15, borderRadius: '8px 0 0 8px' }} />
                <div style={{ position: 'absolute', left: `calc(${pos52w}% - 2px)`, top: 0, bottom: 0, width: 4, background: scoreColor(pos52w) }} />
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>Low: {commodity.low52w.toLocaleString()}</div>
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>High: {commodity.high52w.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                At <strong style={{ color: scoreColor(pos52w) }}>{pos52w.toFixed(0)}%</strong> of 52-week range
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

            {/* Live Price Chart */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>LIVE PRICE CHART</div>
              <AssetPriceChart asset={chartAsset} />
            </div>

                        {/* Commodity Fundamentals Signals */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>COMMODITY FUNDAMENTALS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  ...(commodity.contango !== undefined ? [{
                    label: 'Curve',
                    value: `${commodity.contango >= 0 ? '+' : ''}${commodity.contango.toFixed(2)}%`,
                    signal: commodity.contango < -1 ? 'BUY' : commodity.contango > 1 ? 'SELL' : 'NEUTRAL'
                  }] : []),

                  ...(commodity.inventoryVs5YAvg !== undefined ? [{
                    label: 'Inventory vs 5Y',
                    value: `${commodity.inventoryVs5YAvg >= 0 ? '+' : ''}${commodity.inventoryVs5YAvg.toFixed(0)}%`,
                    signal: commodity.inventoryVs5YAvg < -10 ? 'BUY' : commodity.inventoryVs5YAvg > 10 ? 'SELL' : 'NEUTRAL'
                  }] : []),

                  ...(costMargin !== undefined ? [{
                    label: 'Cost Margin',
                    value: `${costMargin.toFixed(0)}%`,
                    signal: costMargin < 10 ? 'BUY' : costMargin > 40 ? 'SELL' : 'NEUTRAL'
                  }] : []),

                  ...(commodity.seasonalityIndex !== undefined ? [{
                    label: 'Seasonality',
                    value: `${commodity.seasonalityIndex.toFixed(0)}/100`,
                    signal: commodity.seasonalityIndex > 70 ? 'BUY' : commodity.seasonalityIndex < 40 ? 'SELL' : 'NEUTRAL'
                  }] : []),

                  ...(commodity.supercycleScore !== undefined ? [{
                    label: 'Supercycle',
                    value: `${commodity.supercycleScore.toFixed(0)}/100`,
                    signal: commodity.supercycleScore > 70 ? 'BUY' : commodity.supercycleScore < 40 ? 'SELL' : 'NEUTRAL'
                  }] : []),

                  {
                    label: '52W Position',
                    value: `${pos52w.toFixed(0)}%`,
                    signal: pos52w > 70 ? 'BUY' : pos52w < 30 ? 'SELL' : 'NEUTRAL'
                  },
                ].map(ind => (
                  <div key={ind.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ind.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: signalColor(ind.signal) + '20', color: signalColor(ind.signal) }}>{ind.signal}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{ind.value}</div>
                  </div>
                ))}
              </div>
            </div>
{/* Performance */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>PERFORMANCE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: '1D Change', value: `${displayChange >= 0 ? '+' : ''}${displayChange.toFixed(2)}%`, color: displayChange >= 0 ? '#22C55E' : '#EF4444' },
                  { label: 'From 52W Low', value: `+${((displayPrice - commodity.low52w) / commodity.low52w * 100).toFixed(1)}%`, color: '#22C55E' },
                  { label: 'From 52W High', value: `${((displayPrice - commodity.high52w) / commodity.high52w * 100).toFixed(1)}%`, color: '#EF4444' },
                  { label: '52W Avg', value: `${((commodity.low52w + commodity.high52w) / 2).toFixed(2)} ${commodity.unit}`, color: '#D4AF37' },
                ].map(p => (
                  <div key={p.label} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>{p.label.toUpperCase()}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: p.color }}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Edge Bars */}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>COMMODITY FUNDAMENTALS ANALYSIS</div>
              {technicalEdge.map((te, i) => {
                const outperforming = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
                const barWidth = Math.min(100, Math.max(0, Math.abs(te.stockVal)));
                return (
                  <div key={i} style={{ marginBottom: 16, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8, border: `1px solid ${outperforming ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{te.metric}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: outperforming ? '#22C55E' : '#EF4444' }}>{te.stockVal.toFixed(1)}{te.unit}</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(51,65,85,0.5)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: outperforming ? '#22C55E' : '#EF4444', borderRadius: 4 }} />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
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
                <div style={{ fontSize: 9, color: '#22C55E', letterSpacing: 2, marginBottom: 16 }}>{t("kg.bullCase")} ({bulls.length})</div>
                {bulls.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t("kg.noBullsPrice")}</div>}
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
                <div style={{ fontSize: 9, color: '#EF4444', letterSpacing: 2, marginBottom: 16 }}>{t("kg.bearCase")} ({bears.length})</div>
                {bears.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t("kg.noBearsPrice")}</div>}
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
                <div style={{ fontSize: 9, color: '#D4AF37', letterSpacing: 2, marginBottom: 16 }}>NEUTRAL POSITIONS ({neutrals.length})</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {neutrals.map((r, i) => (
                    <div key={i} style={{ padding: 14, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#D4AF37' }}>{r.result.score}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.result.insight}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card-sacred" style={{ padding: 24 }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 16 }}>COMMODITY FUNDAMENTALS</div>
              {technicalEdge.map((te, i) => {
                const outperforming = te.higherIsBetter ? te.stockVal > te.sectorAvg : te.stockVal < te.sectorAvg;
                return (
                  <div key={i} style={{ marginBottom: 14, padding: 16, background: 'rgba(17,24,39,0.8)', border: `1px solid ${outperforming ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{te.metric}</div>
                      </div>
                      <div style={{ padding: '4px 12px', background: outperforming ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: outperforming ? '#22C55E' : '#EF4444', borderRadius: 6, fontSize: 11, fontWeight: 700, border: `1px solid ${outperforming ? '#22C55E' : '#EF4444'}` }}>
                        {outperforming ? 'POSITIVE' : 'NEGATIVE'}
                      </div>
                    </div>
                    <div style={{ height: 8, background: 'rgba(51,65,85,0.5)', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.min(100, Math.max(0, Math.abs(te.stockVal))) + '%', background: outperforming ? '#22C55E' : '#EF4444', borderRadius: 4 }} />
                    </div>
                    <div style={{ padding: 10, background: outperforming ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 11, color: '#E2E8F0' }}>
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
