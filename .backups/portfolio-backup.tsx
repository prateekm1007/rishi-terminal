'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  return pl > 0 ? '#22C55E' : pl < 0 ? '#EF4444' : '#64748B';
}

export default function PortfolioPage() {
  const { t } = useLanguage();
  const [portfolio, setPortfolio] = useState<Portfolio>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSymbol, setFormSymbol] = useState('');
  const [formShares, setFormShares] = useState('');
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
      return { ...h, currentPrice: livePrice, invested, current,
        pl: current - invested,
        plPct: invested > 0 ? ((current - invested) / invested) * 100 : 0 };
    });
    const totalPL    = totalCurrent - totalInvested;
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    return { holdings, totalInvested, totalCurrent, totalPL, totalPLPct };
  }, [portfolio, prices]);

  function handleAddHolding() {
    if (!formSymbol || !formShares || !formAvgPrice) return;
    const newHolding: Holding = {
      symbol: formSymbol.toUpperCase(), shares: Number(formShares),
      avgPrice: Number(formAvgPrice), addedAt: new Date().toISOString(),
    };
    const updated = [...portfolio.filter(h => h.symbol !== newHolding.symbol), newHolding];
    savePortfolioLocal(updated);
    setPortfolio(updated);
    setFormSymbol(''); setFormShares(''); setFormAvgPrice('');
    setShowAddModal(false);
  }

  function handleRemoveHolding(symbol: string) {
    const updated = portfolio.filter(h => h.symbol !== symbol);
    savePortfolioLocal(updated);
    setPortfolio(updated);
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box' as const,
    background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.6)',
    color: '#F8FAFC', fontSize: 14,
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
            ≡ƒÆ╝ Portfolio
          </h1>
          <p style={{ color: '#64748B', fontSize: 13 }}>
            Live P&L ┬╖ Sector X-Ray ┬╖ Stress Testing ┬╖ Margin of Safety
            {lastUpdated && <span> ┬╖ ΓÜí Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(51,65,85,0.5)', marginBottom: 28 }}>
          {[
            { id: 'holdings' as const, label: '≡ƒôè Holdings' },
            { id: 'xray' as const, label: '≡ƒö¼ Portfolio X-Ray' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #D4AF37' : '2px solid transparent',
                color: activeTab === tab.id ? '#D4AF37' : '#64748B',
                fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <>
            {liveMetrics && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'TOTAL INVESTED', value: formatCurrency(liveMetrics.totalInvested), color: '#F8FAFC' },
                  { label: 'CURRENT VALUE', value: formatCurrency(liveMetrics.totalCurrent), color: plColor(liveMetrics.totalPL) },
                  { label: 'TOTAL P&L', value: `${formatCurrency(liveMetrics.totalPL)} (${liveMetrics.totalPLPct >= 0 ? '+' : ''}${liveMetrics.totalPLPct.toFixed(2)}%)`, color: plColor(liveMetrics.totalPL) },
                ].map(card => (
                  <div key={card.label} style={{
                    background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
                    borderRadius: 12, padding: '20px 24px',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', marginBottom: 8 }}>{card.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: 'JetBrains Mono, monospace' }}>{card.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
                  border: 'none', color: '#0A0F1C', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                + Add Holding
              </button>
            </div>

            {portfolio.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                color: '#64748B', fontSize: 14,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>≡ƒÆ╝</div>
                <div>No holdings yet. Add your first position.</div>
              </div>
            ) : liveMetrics && (
              <div style={{
                background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(30,41,59,0.8)',
                borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(5,8,16,0.6)' }}>
                        {['SYMBOL', 'SHARES', 'AVG PRICE', 'LIVE PRICE', 'INVESTED', 'CURRENT', 'P&L', 'RETURN %', ''].map(h => (
                          <th key={h} style={{
                            padding: '12px 14px', fontSize: 10, fontWeight: 700, color: '#64748B',
                            textAlign: 'left', borderBottom: '1px solid rgba(51,65,85,0.5)',
                            letterSpacing: '0.08em',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {liveMetrics.holdings.map(h => (
                        <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(51,65,85,0.2)' }}>
                          <td style={{ padding: '14px' }}>
                            <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>
                              {h.symbol}
                            </Link>
                          </td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: '#F8FAFC' }}>{h.shares.toLocaleString()}</td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: '#64748B' }}>{h.avgPrice.toFixed(2)}</td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: '#F8FAFC', fontWeight: 700 }}>
                            {loading ? '...' : '' + h.currentPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: '#64748B' }}>{formatCurrency(h.invested)}</td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: '#F8FAFC', fontWeight: 700 }}>{formatCurrency(h.current)}</td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: plColor(h.pl), fontWeight: 800 }}>
                            {h.pl >= 0 ? '+' : ''}{formatCurrency(h.pl)}
                          </td>
                          <td style={{ padding: '14px', fontFamily: 'monospace', color: plColor(h.pl), fontWeight: 800 }}>
                            {h.plPct >= 0 ? '+' : ''}{h.plPct.toFixed(2)}%
                          </td>
                          <td style={{ padding: '14px' }}>
                            <button
                              onClick={() => handleRemoveHolding(h.symbol)}
                              style={{
                                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444',
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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <div style={{
              background: '#0A0F1C', border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 16, padding: 28, width: '400px',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', marginBottom: 20 }}>Add Holding</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <input type="text" placeholder="Symbol (e.g., TCS, RELIANCE)" value={formSymbol}
                  onChange={e => setFormSymbol(e.target.value)} style={inputStyle} />
                <input type="number" placeholder="Number of Shares" value={formShares}
                  onChange={e => setFormShares(e.target.value)} style={inputStyle} />
                <input type="number" placeholder="Average Buy Price ()" value={formAvgPrice}
                  onChange={e => setFormAvgPrice(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleAddHolding} style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
                  border: 'none', color: '#0A0F1C', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>Add</button>
                <button onClick={() => setShowAddModal(false)} style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.4)',
                  color: '#64748B', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}