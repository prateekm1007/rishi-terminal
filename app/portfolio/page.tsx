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
import { useLivePrices } from '../../hooks/useLivePrices';

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

function plColor(pl: number) {
  return pl > 0 ? 'var(--accent-green)' : pl < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
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

  // Load portfolio on mount
  useEffect(() => {
    const loaded = loadPortfolio();
    setPortfolio(loaded);
  }, []);

  // Extract holding symbols for live prices
  const holdingSymbols = useMemo(() => portfolio?.holdings.map(h => h.symbol) ?? [], [portfolio]);
  const { prices, loading, lastUpdated } = useLivePrices(holdingSymbols);

  // Calculate live P&L
  const liveMetrics = useMemo(() => {
    if (!portfolio || Object.keys(prices).length === 0) return null;

    let totalInvested = 0;
    let totalCurrent = 0;
    const holdings = portfolio.holdings.map(h => {
      const livePrice = prices[h.symbol]?.price ?? h.avgPrice;
      const invested = h.shares * h.avgPrice;
      const current = h.shares * livePrice;
      totalInvested += invested;
      totalCurrent += current;
      return {
        ...h,
        currentPrice: livePrice,
        invested,
        current,
        pl: current - invested,
        plPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
      };
    });

    const totalPL = totalCurrent - totalInvested;
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    return { holdings, totalInvested, totalCurrent, totalPL, totalPLPct };
  }, [portfolio, prices]);

  const SUB_TABS = useMemo(() => [
    { id: 'holdings', label: t('portfolio.holdings'),  desc: t('portfolio.holdingsDesc')  },
    { id: 'returns',  label: t('portfolio.returns'),   desc: t('portfolio.returnsDesc')   },
  ], [t, locale]);

  const handleAddHolding = () => {
    if (!formSymbol || !formShares || !formAvgPrice) return;
    const newPortfolio = addHolding(portfolio!, {
      symbol: formSymbol.toUpperCase(),
      shares: Number(formShares),
      avgPrice: Number(formAvgPrice),
      notes: formNotes.trim() || undefined,
      addedDate: new Date().toISOString(),
    });
    setPortfolio(newPortfolio);
    setFormSymbol('');
    setFormShares('');
    setFormAvgPrice('');
    setFormNotes('');
    setShowAddModal(false);
  };

  const handleRemoveHolding = (symbol: string) => {
    const newPortfolio = removeHolding(portfolio!, symbol);
    setPortfolio(newPortfolio);
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('portfolio.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
                {t('portfolio.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('portfolio.subtitle')}
              </p>
              {lastUpdated && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 8 }}>
                  ⚡ Live • Updated {lastUpdated.toLocaleTimeString('en-IN')}
                </div>
              )}
            </div>

            {liveMetrics && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 240 }}>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                  LIVE PORTFOLIO VALUE
                </div>
                <div style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1, marginBottom: 12 }}>
                  {formatCurrency(liveMetrics.totalCurrent)}
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 2 }}>INVESTED</div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(liveMetrics.totalInvested)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 2 }}>P&L</div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: plColor(liveMetrics.totalPL) }}>
                      {liveMetrics.totalPL > 0 ? '+' : ''}{formatCurrency(liveMetrics.totalPL)} ({liveMetrics.totalPLPct.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Holdings', value: portfolio?.holdings.length ?? 0, color: 'var(--accent-gold)', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
              { label: 'Avg Allocation', value: portfolio?.holdings.length ? (100 / portfolio.holdings.length).toFixed(0) + '%' : '0%', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
            ].map(stat => (
              <div key={stat.label} style={{ background: stat.bg, border: '1px solid ' + stat.border, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--accent-gold)',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            + ADD HOLDING
          </button>
        </div>

        {/* Holdings Table */}
        {liveMetrics && (
          <div className="card-sacred" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                    {['SYMBOL', 'SHARES', 'AVG PRICE', 'LIVE PRICE', 'INVESTED', 'CURRENT', 'P&L', 'RETURN %'].map(h => (
                      <th key={h} style={{
                        textAlign: 'right',
                        padding: '14px 24px',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        color: 'var(--text-muted)',
                        letterSpacing: 1,
                        fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveMetrics.holdings.map(h => (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ textAlign: 'left', padding: '16px 24px', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {h.symbol}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {h.shares}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {h.avgPrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {h.currentPrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {formatCurrency(h.invested)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(h.current)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: plColor(h.pl) }}>
                        {h.pl > 0 ? '+' : ''}{formatCurrency(h.pl)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: plColor(h.pl) }}>
                        {h.plPct > 0 ? '+' : ''}{h.plPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}