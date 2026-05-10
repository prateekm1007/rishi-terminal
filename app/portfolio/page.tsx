'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { loadPortfolioLocal, savePortfolioLocal, type Holding } from '../../lib/portfolio';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useLanguage } from '../../lib/language';
import PortfolioXRay from '../../components/portfolio/PortfolioXRay';

type Portfolio = Holding[];

function formatCurrency(n: number): string {
  if (n >= 10000000) return 'Rs ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return 'Rs ' + (n / 100000).toFixed(2) + ' L';
  return 'Rs ' + n.toLocaleString('en-IN');
}

function plColor(pl: number) {
  return pl > 0 ? 'var(--accent-green)' : pl < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
}

export default function PortfolioPage() {
  const { t } = useLanguage();
  const [portfolio,    setPortfolio]    = useState<Portfolio>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSymbol,   setFormSymbol]   = useState('');
  const [formShares,   setFormShares]   = useState('');
  const [formAvgPrice, setFormAvgPrice] = useState('');
  const [activeTab, setActiveTab] = useState<'holdings' | 'xray'>('holdings');

  useEffect(() => {
    setPortfolio(loadPortfolioLocal());
  }, []);

  const holdingSymbols = useMemo(() => portfolio.map(h => h.symbol), [portfolio]);
  const { prices, loading, lastUpdated } = useLivePrices(holdingSymbols);

  const liveMetrics = useMemo(() => {
    if (portfolio.length === 0) return null;
    let totalInvested = 0;
    let totalCurrent  = 0;
    const holdings = portfolio.map(h => {
      const livePrice = prices[h.symbol]?.price ?? h.avgPrice;
      const invested  = h.shares * h.avgPrice;
      const current   = h.shares * livePrice;
      totalInvested  += invested;
      totalCurrent   += current;
      return {
        ...h,
        currentPrice: livePrice,
        invested,
        current,
        pl:    current - invested,
        plPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
      };
    });

    const totalPL    = totalCurrent - totalInvested;
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    return { holdings, totalInvested, totalCurrent, totalPL, totalPLPct };
  }, [portfolio, prices]);

  function handleAddHolding() {
    if (!formSymbol || !formShares || !formAvgPrice) return;
    const newHolding: Holding = {
      symbol:   formSymbol.toUpperCase(),
      shares:   Number(formShares),
      avgPrice: Number(formAvgPrice),
      addedAt:  new Date().toISOString(),
    };
    const updated = [...portfolio.filter(h => h.symbol !== newHolding.symbol), newHolding];
    savePortfolioLocal(updated);
    setPortfolio(updated);
    setFormSymbol('');
    setFormShares('');
    setFormAvgPrice('');
    setShowAddModal(false);
  }

  function handleRemoveHolding(symbol: string) {
    const updated = portfolio.filter(h => h.symbol !== symbol);
    savePortfolioLocal(updated);
    setPortfolio(updated);
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
            💼 {t('portfolio.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Track your holdings with live P&L · Stress test scenarios · Margin of safety
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ marginBottom: 24, borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { id: 'holdings' as const, label: '📊 Holdings', emoji: '📊' },
              { id: 'xray' as const, label: '🔬 X-Ray', emoji: '🔬' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px', border: 'none',
                  background: activeTab === tab.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                  color: activeTab === tab.id ? '#D4AF37' : '#64748B',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <>
            {/* Stats */}
            {liveMetrics && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL INVESTED</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {formatCurrency(liveMetrics.totalInvested)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>CURRENT VALUE</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: plColor(liveMetrics.totalPL), fontFamily: 'monospace' }}>
                    {formatCurrency(liveMetrics.totalCurrent)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>TOTAL P&L</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: plColor(liveMetrics.totalPL), fontFamily: 'monospace' }}>
                    {formatCurrency(liveMetrics.totalPL)} ({liveMetrics.totalPLPct >= 0 ? '+' : ''}{liveMetrics.totalPLPct.toFixed(2)}%)
                  </div>
                </div>
              </div>
            )}

            {/* Add Button */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
                  border: 'none', color: '#0A0F1C', fontWeight: 700,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                + Add Holding
              </button>
            </div>

            {/* Holdings Table */}
            {liveMetrics && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(5,8,16,0.6)' }}>
                      {['SYMBOL', 'SHARES', 'AVG PRICE', 'LIVE PRICE', 'INVESTED', 'CURRENT', 'P&L', 'RETURN %', ''].map(h => (
                        <th key={h} style={{ padding: '12px', fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: h === '' ? 'center' : 'left', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {liveMetrics.holdings.map(h => (
                      <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                        <td style={{ padding: '14px' }}>
                          <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace' }}>
                            {h.symbol}
                          </Link>
                        </td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: '#F8FAFC' }}>{h.shares.toLocaleString()}</td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: '#64748B' }}>{h.avgPrice.toFixed(2)}</td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: '#F8FAFC', fontWeight: 700 }}>{h.currentPrice.toFixed(2)}</td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: '#64748B' }}>{formatCurrency(h.invested)}</td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: '#F8FAFC', fontWeight: 700 }}>{formatCurrency(h.current)}</td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: plColor(h.pl), fontWeight: 800 }}>
                          {h.pl >= 0 ? '+' : ''}{formatCurrency(h.pl)}
                        </td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', color: plColor(h.pl), fontWeight: 800 }}>
                          {h.plPct >= 0 ? '+' : ''}{h.plPct.toFixed(2)}%
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveHolding(h.symbol)}
                            style={{
                              padding: '6px 12px', borderRadius: 6,
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                              color: '#EF4444', fontSize: 12, cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* X-Ray Tab */}
        {activeTab === 'xray' && (
          <PortfolioXRay holdings={portfolio} prices={prices} />
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#0A0F1C', border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 16, padding: 24, width: '400px',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', marginBottom: 16 }}>
                Add Holding
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="Symbol (e.g., TCS)"
                  value={formSymbol}
                  onChange={e => setFormSymbol(e.target.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                    color: '#F8FAFC', fontSize: 14,
                  }}
                />
                <input
                  type="number"
                  placeholder="Shares"
                  value={formShares}
                  onChange={e => setFormShares(e.target.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                    color: '#F8FAFC', fontSize: 14,
                  }}
                />
                <input
                  type="number"
                  placeholder="Average Price"
                  value={formAvgPrice}
                  onChange={e => setFormAvgPrice(e.target.value)}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                    color: '#F8FAFC', fontSize: 14,
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleAddHolding}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8,
                    background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
                    border: 'none', color: '#0A0F1C', fontWeight: 700,
                    fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8,
                    background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.4)',
                    color: '#64748B', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}