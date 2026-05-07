'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { STOCKS } from '../../data/stocks';
import {
  loadPortfolio,
  addHolding,
  removeHolding,
  setCustomWeight,
  removeCustomWeight,
  calculatePortfolioMetrics,
  type Portfolio,
} from '../../lib/portfolio';
import { RISHI_WEIGHT_CONFIG } from '../../lib/consensus/weights';
import { buildConsensus } from '../../lib/consensus';
import { useLanguage } from '../../lib/language';

const LineChart           = dynamic(() => import('recharts').then(m => m.LineChart),           { ssr: false });
const Line                = dynamic(() => import('recharts').then(m => m.Line),                { ssr: false });
const XAxis               = dynamic(() => import('recharts').then(m => m.XAxis),               { ssr: false });
const YAxis               = dynamic(() => import('recharts').then(m => m.YAxis),               { ssr: false });
const Tooltip             = dynamic(() => import('recharts').then(m => m.Tooltip),             { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generateHistoricalData(holdings: any[], startDate: Date, endDate: Date) {
  const data: { date: string; value: number; invested: number }[] = [];
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const interval = Math.max(1, Math.floor(daysDiff / 60));
  for (let i = 0; i <= daysDiff; i += interval) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const volatility = 0.018;
    const drift = 0.00035;
    let totalValue = 0;
    let totalInvested = 0;
    holdings.forEach((h, hi) => {
      const stock = STOCKS[h.symbol];
      if (!stock) return;
      const seed = hi * 1000 + i;
      const noise = (seededRand(seed) - 0.5) * 2;
      const randomWalk = Math.exp((drift - (volatility * volatility) / 2) * i + volatility * Math.sqrt(i + 1) * noise);
      const historicalPrice = h.avgPrice * randomWalk;
      totalValue    += h.shares * historicalPrice;
      totalInvested += h.shares * h.avgPrice;
    });
    data.push({
      date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      value: Math.round(totalValue),
      invested: Math.round(totalInvested),
    });
  }
  return data;
}

function formatCurrency(n: number): string {
  if (n >= 10000000) return 'Rs ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return 'Rs ' + (n / 100000).toFixed(2) + ' L';
  return 'Rs ' + n.toLocaleString('en-IN');
}

export default function PortfolioPage() {
  const { t, locale } = useLanguage();
  const [portfolio,        setPortfolio]        = useState<Portfolio | null>(null);
  const [showAddModal,     setShowAddModal]      = useState(false);
  const [showWeightsModal, setShowWeightsModal]  = useState(false);
  const [activeTab,        setActiveTab]         = useState<'holdings' | 'returns'>('holdings');
  const [timeframe,        setTimeframe]         = useState<'1M' | '3M' | '1Y' | 'ALL'>('3M');
  const [formSymbol,       setFormSymbol]        = useState('');
  const [formShares,       setFormShares]        = useState('');
  const [formAvgPrice,     setFormAvgPrice]      = useState('');
  const [formNotes,        setFormNotes]         = useState('');

  const SUB_TABS = useMemo(() => [
    { id: 'holdings', label: t('portfolio.holdings'),  desc: t('portfolio.holdingsDesc')  },
    { id: 'returns',  label: t('portfolio.myReturns'), desc: t('portfolio.returnsDesc')   },
  ], [t, locale]);

  useEffect(() => { setPortfolio(loadPortfolio()); }, []);
  const refreshPortfolio = () => setPortfolio(loadPortfolio());

  const handleAddHolding = () => {
    const symbol   = formSymbol.trim().toUpperCase();
    const shares   = parseInt(formShares);
    const avgPrice = parseFloat(formAvgPrice);
    if (!symbol || !STOCKS[symbol])       { alert(t('portfolio.invalidSymbol'));  return; }
    if (isNaN(shares)   || shares   <= 0) { alert(t('portfolio.invalidShares'));  return; }
    if (isNaN(avgPrice) || avgPrice <= 0) { alert(t('portfolio.invalidPrice'));   return; }
    addHolding({ symbol, shares, avgPrice, addedDate: new Date().toISOString(), notes: formNotes.trim() || undefined });
    setFormSymbol(''); setFormShares(''); setFormAvgPrice(''); setFormNotes('');
    setShowAddModal(false);
    refreshPortfolio();
  };

  const handleWeightChange = (name: string, weight: number) => {
    if (weight < 0 || weight > 10) { alert(t('portfolio.invalidWeight')); return; }
    setCustomWeight(name, weight);
    refreshPortfolio();
  };

  if (!portfolio) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 2 }}>{t('common.loading').toUpperCase()}</div>
      </div>
    );
  }

  const metrics = calculatePortfolioMetrics(portfolio.holdings, STOCKS);
  const now       = new Date();
  const daysAgo   = timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : timeframe === '1Y' ? 365 : 730;
  const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const chartData = portfolio.holdings.length > 0 ? generateHistoricalData(portfolio.holdings, startDate, now) : [];

  const oldestHolding = portfolio.holdings.length > 0
    ? new Date(Math.min(...portfolio.holdings.map(h => new Date(h.addedDate).getTime())))
    : new Date();
  const yearsSinceOldest = (now.getTime() - oldestHolding.getTime()) / (1000 * 60 * 60 * 24 * 365);
  const cagr = yearsSinceOldest > 0.1 && metrics.totalInvested > 0
    ? (Math.pow(metrics.totalCurrent / metrics.totalInvested, 1 / yearsSinceOldest) - 1) * 100
    : 0;

  const scoreColor = (s: number) => s >= 75 ? '#00BA7C' : s >= 55 ? '#FFD700' : '#F4212E';
  const scoreBg    = (s: number) => s >= 75 ? 'rgba(0,186,124,0.15)' : s >= 55 ? 'rgba(255,215,0,0.15)' : 'rgba(244,33,46,0.15)';

  return (
    <main className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>{t('header.title')}</Link>
            {' > '}{t('portfolio.title').toUpperCase()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
                {t('portfolio.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('portfolio.subtitle')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowAddModal(true)} style={{
                padding: '10px 20px', background: 'var(--accent-gold)', color: '#000',
                border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                + {t('portfolio.addStock')}
              </button>
              <button onClick={() => setShowWeightsModal(true)} style={{
                padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                {t('portfolio.rishiWeights')}
              </button>
            </div>
          </div>

          {/* Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { label: t('portfolio.invested'),    value: formatCurrency(metrics.totalInvested), color: 'var(--text-primary)' },
              { label: t('portfolio.currentValue'), value: formatCurrency(metrics.totalCurrent),  color: 'var(--text-primary)' },
              {
                label: t('portfolio.totalReturn'),
                value: (metrics.totalGainLossPct >= 0 ? '+' : '') + metrics.totalGainLossPct.toFixed(2) + '%',
                color: metrics.totalGainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              },
              {
                label: t('portfolio.cagr'),
                value: (cagr >= 0 ? '+' : '') + cagr.toFixed(2) + '%',
                color: cagr >= 15 ? 'var(--accent-green)' : cagr >= 0 ? 'var(--accent-gold)' : 'var(--accent-red)',
              },
              { label: t('portfolio.holdingsCount'), value: metrics.holdingsCount.toString(), color: 'var(--text-primary)' },
            ].map((m, i) => (
              <div key={i} className="card-sacred" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>{m.label.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Tab Bar */}
      <div style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', gap: 0 }}>
            {SUB_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'holdings' | 'returns')}
                style={{
                  padding: '14px 28px', fontSize: 13, fontFamily: 'monospace',
                  fontWeight: activeTab === tab.id ? 700 : 400, background: 'transparent', border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                  cursor: 'pointer', letterSpacing: activeTab === tab.id ? '1px' : '0.5px',
                  transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                }}
              >
                <span>{tab.label}</span>
                <span style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.6, fontWeight: 400 }}>{tab.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* TAB: HOLDINGS */}
        {activeTab === 'holdings' && (
          <>
            {portfolio.holdings.length === 0 ? (
              <div className="card-sacred" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>
                  {t('portfolio.noHoldings')}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                  {t('portfolio.noHoldingsHint')}
                </p>
                <button onClick={() => setShowAddModal(true)} style={{
                  padding: '12px 32px', background: 'var(--accent-gold)', color: '#000',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  + {t('portfolio.addFirstHolding')}
                </button>
              </div>
            ) : (
              <div className="card-sacred" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
                  <div className="philosophy-heading" style={{ fontSize: 13, letterSpacing: 2, color: 'var(--text-muted)' }}>
                    {t('portfolio.holdings').toUpperCase()} — {metrics.holdingsCount} {t('portfolio.positions')}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                        {[t('portfolio.stock'), t('portfolio.shares'), t('portfolio.avgPrice'), t('portfolio.current'), t('portfolio.pnl'), t('portfolio.returnPct'), t('portfolio.rishiScore'), ''].map((h, i) => (
                          <th key={i} style={{
                            textAlign: i === 0 ? 'left' : i === 7 ? 'center' : 'right',
                            padding: '12px 16px', fontSize: 9, color: 'var(--text-muted)',
                            letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                            {h.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map(h => {
                        const stock    = STOCKS[h.symbol];
                        if (!stock) return null;
                        const consensus = buildConsensus(stock).consensus;
                        const current   = h.shares * stock.price;
                        const invested  = h.shares * h.avgPrice;
                        const pnl       = current - invested;
                        const pnlPct    = (pnl / invested) * 100;
                        return (
                          <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,215,0,0.02)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '16px' }}>
                              <Link href={'/stock/' + h.symbol} style={{ color: 'var(--accent-gold)', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                                {h.symbol}
                              </Link>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stock.name}</div>
                              {h.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic', opacity: 0.7 }}>{h.notes}</div>}
                            </td>
                            <td style={{ textAlign: 'right', padding: '16px', fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 13 }}>{h.shares.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', padding: '16px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 13 }}>{h.avgPrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{stock.price.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '16px' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(pnl)).replace('Rs ', '')}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', padding: '16px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: pnlPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '16px' }}>
                              <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 700, fontFamily: 'monospace', background: scoreBg(consensus), color: scoreColor(consensus) }}>
                                {consensus}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '16px' }}>
                              <button onClick={() => { if (confirm(t('portfolio.confirmRemove') + ' ' + h.symbol + '?')) { removeHolding(h.symbol); refreshPortfolio(); } }}
                                style={{ padding: '4px 12px', background: 'transparent', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 4, fontSize: 11, cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                                {t('common.delete')}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {portfolio.holdings.length > 1 && (
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                          <td colSpan={3} style={{ padding: '14px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 1 }}>
                            {t('portfolio.total')} ({metrics.holdingsCount} {t('portfolio.positions')})
                          </td>
                          <td style={{ textAlign: 'right', padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(metrics.totalCurrent)}</td>
                          <td style={{ textAlign: 'right', padding: '14px 16px' }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: metrics.totalGainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {metrics.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(metrics.totalGainLoss)).replace('Rs ', '')}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', padding: '14px 16px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: metrics.totalGainLossPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {metrics.totalGainLossPct >= 0 ? '+' : ''}{metrics.totalGainLossPct.toFixed(2)}%
                            </span>
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB: MY RETURNS */}
        {activeTab === 'returns' && (
          <>
            {portfolio.holdings.length === 0 ? (
              <div className="card-sacred" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 1 }}>{t('portfolio.noData')}</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('portfolio.noDataHint')}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: t('portfolio.cagr'),          value: (cagr >= 0 ? '+' : '') + cagr.toFixed(2) + '%',                                        sub: t('portfolio.cagrSub'),    color: cagr >= 15 ? 'var(--accent-green)' : cagr >= 0 ? 'var(--accent-gold)' : 'var(--accent-red)', big: true  },
                    { label: t('portfolio.invested'),       value: formatCurrency(metrics.totalInvested),                                                  sub: t('portfolio.capitalDeployed'), color: 'var(--text-primary)', big: false },
                    { label: t('portfolio.currentValue'),   value: formatCurrency(metrics.totalCurrent),                                                   sub: t('portfolio.markToMarket'),    color: 'var(--text-primary)', big: false },
                    { label: t('portfolio.absoluteReturn'), value: (metrics.totalGainLossPct >= 0 ? '+' : '') + metrics.totalGainLossPct.toFixed(2) + '%', sub: formatCurrency(Math.abs(metrics.totalGainLoss)), color: metrics.totalGainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', big: false },
                  ].map((m, i) => (
                    <div key={i} className="card-sacred" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                      {m.big && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)' }} />}
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>{m.label.toUpperCase()}</div>
                      <div style={{ fontSize: m.big ? 36 : 24, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{m.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="card-sacred" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <div className="philosophy-heading" style={{ fontSize: 13, letterSpacing: 2, color: 'var(--text-muted)' }}>
                        {t('portfolio.chartTitle')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, opacity: 0.7 }}>
                        {t('portfolio.chartSubtitle')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['1M', '3M', '1Y', 'ALL'] as const).map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} style={{
                          padding: '6px 14px', fontSize: 11, fontFamily: 'monospace',
                          background: timeframe === tf ? 'var(--accent-gold)' : 'transparent',
                          color: timeframe === tf ? '#000' : 'var(--text-muted)',
                          border: timeframe === tf ? 'none' : '1px solid var(--border-primary)',
                          borderRadius: 4, cursor: 'pointer', fontWeight: timeframe === tf ? 700 : 400,
                        }}>
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <XAxis dataKey="date" stroke="var(--border-primary)" style={{ fontSize: 10 }} tick={{ fill: 'var(--text-muted)' }} />
                        <YAxis stroke="var(--border-primary)" style={{ fontSize: 10 }} tick={{ fill: 'var(--text-muted)' }} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 6 }}
                          labelStyle={{ color: 'var(--text-secondary)', fontSize: 11 }}
                          itemStyle={{ fontSize: 12, fontWeight: 700 }}
                          formatter={(value: any, name: string) => [formatCurrency(value), name === 'value' ? t('portfolio.portfolioValue') : t('portfolio.costBasis')]}
                        />
                        <Line type="monotone" dataKey="value"    stroke="var(--accent-gold)" strokeWidth={2} dot={false} name="value" />
                        <Line type="monotone" dataKey="invested" stroke="var(--text-muted)"  strokeWidth={1} dot={false} strokeDasharray="4 4" name="invested" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      <div style={{ width: 24, height: 2, background: 'var(--accent-gold)' }} />
                      {t('portfolio.portfolioValue')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      <div style={{ width: 24, height: 2, background: 'var(--text-muted)' }} />
                      {t('portfolio.costBasis')}
                    </div>
                  </div>
                </div>

                <div className="card-sacred" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
                    <div className="philosophy-heading" style={{ fontSize: 13, letterSpacing: 2, color: 'var(--text-muted)' }}>
                      {t('portfolio.positionReturns')}
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                        {[t('portfolio.stock'), t('portfolio.invested'), t('portfolio.current'), t('portfolio.returnPct'), t('portfolio.rishiScore')].map((h, i) => (
                          <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '10px 16px', fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, fontWeight: 600 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...portfolio.holdings].map(h => {
                        const stock = STOCKS[h.symbol];
                        if (!stock) return null;
                        const invested  = h.shares * h.avgPrice;
                        const current   = h.shares * stock.price;
                        const pct       = ((current - invested) / invested) * 100;
                        const consensus = buildConsensus(stock).consensus;
                        return { h, stock, invested, current, pct, consensus };
                      }).filter(Boolean).sort((a, b) => b!.pct - a!.pct).map(row => {
                        if (!row) return null;
                        const { h, stock, invested, current, pct, consensus } = row;
                        return (
                          <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <Link href={'/stock/' + h.symbol} style={{ color: 'var(--accent-gold)', fontWeight: 700, textDecoration: 'none' }}>{h.symbol}</Link>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stock.name}</div>
                            </td>
                            <td style={{ textAlign: 'right', padding: '14px 16px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 13 }}>{formatCurrency(invested)}</td>
                            <td style={{ textAlign: 'right', padding: '14px 16px', fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 13 }}>{formatCurrency(current)}</td>
                            <td style={{ textAlign: 'right', padding: '14px 16px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', padding: '14px 16px' }}>
                              <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700, fontFamily: 'monospace', background: scoreBg(consensus), color: scoreColor(consensus) }}>
                                {consensus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add Holding Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="card-sacred" style={{ maxWidth: 480, width: '100%', padding: 28 }}>
            <h2 className="philosophy-heading" style={{ fontSize: 20, marginBottom: 20 }}>{t('portfolio.addStock')}</h2>
            {[
              { label: t('portfolio.symbol'),    value: formSymbol,   set: setFormSymbol,   type: 'text',   placeholder: 'RELIANCE, TCS, HDFC...' },
              { label: t('portfolio.shares'),    value: formShares,   set: setFormShares,   type: 'number', placeholder: '100' },
              { label: t('portfolio.avgPrice'),  value: formAvgPrice, set: setFormAvgPrice, type: 'number', placeholder: '2500.00', step: '0.01' },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>
                  {f.label.toUpperCase()} *
                </label>
                <input type={f.type} placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)} step={(f as any).step}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6 }}>
                {t('portfolio.thesisLabel')}
              </label>
              <textarea placeholder={t('portfolio.thesisPlaceholder')} value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={3}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleAddHolding} style={{ flex: 1, padding: '10px', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('portfolio.addToPortfolio')}
              </button>
              <button onClick={() => { setShowAddModal(false); setFormSymbol(''); setFormShares(''); setFormAvgPrice(''); setFormNotes(''); }}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rishi Weights Modal */}
      {showWeightsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div className="card-sacred" style={{ maxWidth: 680, width: '100%', padding: 28, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 className="philosophy-heading" style={{ fontSize: 20, marginBottom: 8 }}>{t('portfolio.rishiWeights')}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              {t('portfolio.weightsHint')}
            </p>
            <div style={{ marginBottom: 20 }}>
              {RISHI_WEIGHT_CONFIG.map(rishi => {
                const customWeight    = portfolio.customWeights.find(w => w.name === rishi.name);
                const effectiveWeight = customWeight ? customWeight.weight : rishi.weight;
                const isCustom        = !!customWeight;
                return (
                  <div key={rishi.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: isCustom ? 'rgba(255,215,0,0.05)' : 'var(--bg-secondary)',
                    borderRadius: 6, marginBottom: 6,
                    border: isCustom ? '1px solid rgba(255,215,0,0.25)' : '1px solid transparent',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{rishi.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rishi.tier} — {t('portfolio.default')}: {rishi.weight}</div>
                    </div>
                    <input type="number" step="0.5" min="0" max="10" value={effectiveWeight}
                      onChange={e => handleWeightChange(rishi.name, parseFloat(e.target.value) || 0)}
                      style={{ width: 70, padding: '6px 10px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 4, fontSize: 13, fontWeight: 700, textAlign: 'center' }} />
                    {isCustom && (
                      <button onClick={() => { removeCustomWeight(rishi.name); refreshPortfolio(); }}
                        style={{ padding: '4px 10px', background: 'transparent', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>
                        {t('portfolio.reset')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowWeightsModal(false)} style={{ width: '100%', padding: '10px', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {t('portfolio.saveClose')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}