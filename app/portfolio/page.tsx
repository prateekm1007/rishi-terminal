'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { loadPortfolioLocal, savePortfolioLocal, type Holding } from '../../lib/portfolio';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useLanguage } from '../../lib/language';

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
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>PORTFOLIO</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
                Portfolio Tracker
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                Track your holdings with live P&amp;L calculations
              </p>
              {lastUpdated && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 8 }}>
                  Live &bull; Updated {lastUpdated.toLocaleTimeString('en-IN')}
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
                    <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 2 }}>P&amp;L</div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: plColor(liveMetrics.totalPL) }}>
                      {liveMetrics.totalPL > 0 ? '+' : ''}{formatCurrency(liveMetrics.totalPL)} ({liveMetrics.totalPLPct.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Holdings',       value: portfolio.length,                                                            color: 'var(--accent-gold)', bg: 'rgba(255,215,0,0.08)',   border: 'rgba(255,215,0,0.2)'   },
              { label: 'Avg Allocation', value: portfolio.length ? (100 / portfolio.length).toFixed(0) + '%' : '0%',        color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)'  },
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: 'var(--accent-gold)', color: '#000',
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, letterSpacing: 1,
            }}
          >
            + ADD HOLDING
          </button>
        </div>

        {liveMetrics && liveMetrics.holdings.length > 0 && (
          <div className="card-sacred" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                    {['SYMBOL', 'SHARES', 'AVG PRICE', 'LIVE PRICE', 'INVESTED', 'CURRENT', 'P&L', 'RETURN %', ''].map((h, i) => (
                      <th key={i} style={{
                        textAlign: h === 'SYMBOL' ? 'left' : 'right',
                        padding: '14px 24px', fontSize: 9,
                        fontFamily: 'monospace', color: 'var(--text-muted)',
                        letterSpacing: 1, fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveMetrics.holdings.map(h => (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {h.symbol}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {h.shares}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {h.avgPrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {loading ? '...' : h.currentPrice.toFixed(2)}
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
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <button
                          onClick={() => handleRemoveHolding(h.symbol)}
                          style={{
                            background: 'none', border: '1px solid var(--border-primary)',
                            color: 'var(--accent-red)', cursor: 'pointer',
                            padding: '4px 10px', borderRadius: 4, fontSize: 11,
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

        {portfolio.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>No holdings yet</div>
            <div style={{ fontSize: 13 }}>Click &quot;+ ADD HOLDING&quot; to start tracking</div>
          </div>
        )}
      </div>

      {/* Add Holding Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
            borderRadius: 16, padding: 32, width: '100%', maxWidth: 400,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 24 }}>
              Add Holding
            </h2>
            {[
              { label: 'Symbol (e.g. TCS, RELIANCE)', value: formSymbol,   setter: setFormSymbol,   type: 'text'   },
              { label: 'Shares',                       value: formShares,   setter: setFormShares,   type: 'number' },
              { label: 'Average Buy Price (Rs)',        value: formAvgPrice, setter: setFormAvgPrice, type: 'number' },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={handleAddHolding}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  background: 'var(--accent-gold)', color: '#000',
                  border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                }}
              >
                Add Holding
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                  border: '1px solid var(--border-primary)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
