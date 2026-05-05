'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import {
  loadPortfolio,
  addHolding,
  removeHolding,
  setCustomWeight,
  removeCustomWeight,
  calculatePortfolioMetrics,
  type Portfolio,
  type PortfolioHolding,
} from '../../lib/portfolio';
import { RISHI_WEIGHT_CONFIG } from '../../lib/consensus/weights';
import { buildConsensus } from '../../lib/consensus';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWeightsModal, setShowWeightsModal] = useState(false);

  // Add Holding Form
  const [formSymbol, setFormSymbol] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formAvgPrice, setFormAvgPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    setPortfolio(loadPortfolio());
  }, []);

  const refreshPortfolio = () => {
    setPortfolio(loadPortfolio());
  };

  const handleAddHolding = () => {
    const symbol = formSymbol.trim().toUpperCase();
    const shares = parseInt(formShares);
    const avgPrice = parseFloat(formAvgPrice);

    if (!symbol || !STOCKS[symbol]) {
      alert('Invalid stock symbol');
      return;
    }
    if (isNaN(shares) || shares <= 0) {
      alert('Shares must be a positive number');
      return;
    }
    if (isNaN(avgPrice) || avgPrice <= 0) {
      alert('Average price must be a positive number');
      return;
    }

    addHolding({
      symbol,
      shares,
      avgPrice,
      addedDate: new Date().toISOString(),
      notes: formNotes.trim() || undefined,
    });

    setFormSymbol('');
    setFormShares('');
    setFormAvgPrice('');
    setFormNotes('');
    setShowAddModal(false);
    refreshPortfolio();
  };

  const handleWeightChange = (name: string, weight: number) => {
    if (weight < 0 || weight > 10) {
      alert('Weight must be between 0 and 10');
      return;
    }
    setCustomWeight(name, weight);
    refreshPortfolio();
  };

  const handleRemoveWeight = (name: string) => {
    removeCustomWeight(name);
    refreshPortfolio();
  };

  if (!portfolio) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>Loading portfolio...</div>
      </div>
    );
  }

  const metrics = calculatePortfolioMetrics(portfolio.holdings, STOCKS);

  return (
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>PORTFOLIO</span>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
                Personal Portfolio
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                Track holdings, customize Rishi weights, analyze through your personal philosophical lens.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent-gold)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                + Add Holding
              </button>
              <button
                onClick={() => setShowWeightsModal(true)}
                style={{
                  padding: '12px 24px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ⚖️ Custom Weights
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>TOTAL INVESTED</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                {metrics.totalInvested.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>CURRENT VALUE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                {metrics.totalCurrent.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>TOTAL GAIN/LOSS</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: metrics.totalGainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {metrics.totalGainLoss >= 0 ? '+' : ''}{metrics.totalGainLoss.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 12, color: metrics.totalGainLossPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 4 }}>
                {metrics.totalGainLossPct >= 0 ? '+' : ''}{metrics.totalGainLossPct.toFixed(2)}%
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>HOLDINGS</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                {metrics.holdingsCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '32px 24px' }}>
        {portfolio.holdings.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
              No Holdings Yet
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Start building your philosophical portfolio by adding your first holding.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '12px 32px',
                background: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              + Add First Holding
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 24 }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>SYMBOL</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>SHARES</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>AVG PRICE</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>CURRENT</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>GAIN/LOSS</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>CONSENSUS</th>
                  <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map(h => {
                  const stock = STOCKS[h.symbol];
                  if (!stock) return null;

                  const consensus = buildConsensus(stock).consensus;
                  const currentValue = h.shares * stock.price;
                  const investedValue = h.shares * h.avgPrice;
                  const gainLoss = currentValue - investedValue;
                  const gainLossPct = (gainLoss / investedValue) * 100;

                  return (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 8px' }}>
                        <Link href={`/stock/${h.symbol}`} style={{ color: 'var(--accent-gold)', fontWeight: 700, textDecoration: 'none' }}>
                          {h.symbol}
                        </Link>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{stock.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 8px', color: 'var(--text-primary)' }}>{h.shares.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', padding: '16px 8px', color: 'var(--text-secondary)' }}>{h.avgPrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '16px 8px', color: 'var(--text-primary)', fontWeight: 700 }}>{stock.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '16px 8px' }}>
                        <div style={{ color: gainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                          {gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 11, color: gainLossPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 8px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: consensus >= 75 ? 'rgba(0,186,124,0.15)' : consensus >= 55 ? 'rgba(255,215,0,0.15)' : 'rgba(244,33,46,0.15)',
                          color: consensus >= 75 ? 'var(--accent-green)' : consensus >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)',
                        }}>
                          {consensus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${h.symbol} from portfolio?`)) {
                              removeHolding(h.symbol);
                              refreshPortfolio();
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            color: 'var(--accent-red)',
                            border: '1px solid var(--accent-red)',
                            borderRadius: 6,
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Holding Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', padding: 32 }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: 'var(--text-primary)', marginBottom: 24 }}>
              Add Holding
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                SYMBOL *
              </label>
              <input
                type="text"
                placeholder="RELIANCE, TCS, etc."
                value={formSymbol}
                onChange={e => setFormSymbol(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                SHARES *
              </label>
              <input
                type="number"
                placeholder="100"
                value={formShares}
                onChange={e => setFormShares(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                AVERAGE PRICE () *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="2500.50"
                value={formAvgPrice}
                onChange={e => setFormAvgPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>
                NOTES (OPTIONAL)
              </label>
              <textarea
                placeholder="Why did you buy this?"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleAddHolding}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--accent-gold)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Add Holding
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormSymbol('');
                  setFormShares('');
                  setFormAvgPrice('');
                  setFormNotes('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Weights Modal */}
      {showWeightsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}>
          <div className="card" style={{ maxWidth: 700, width: '100%', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: 'var(--text-primary)', marginBottom: 12 }}>
              Custom Rishi Weights
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Personalize consensus scoring by adjusting Rishi weights. Default weights are shown. Your custom weights are saved locally.
            </p>

            <div style={{ marginBottom: 24 }}>
              {RISHI_WEIGHT_CONFIG.map(rishi => {
                const customWeight = portfolio.customWeights.find(w => w.name === rishi.name);
                const effectiveWeight = customWeight ? customWeight.weight : rishi.weight;
                const isCustom = !!customWeight;

                return (
                  <div key={rishi.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: isCustom ? 'rgba(255,215,0,0.05)' : 'var(--bg-secondary)',
                    borderRadius: 8,
                    marginBottom: 8,
                    border: isCustom ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{rishi.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {rishi.tier} · Default: {rishi.weight}
                      </div>
                    </div>

                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={effectiveWeight}
                      onChange={e => handleWeightChange(rishi.name, parseFloat(e.target.value) || 0)}
                      style={{
                        width: 80,
                        padding: '8px 12px',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />

                    {isCustom && (
                      <button
                        onClick={() => handleRemoveWeight(rishi.name)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          color: 'var(--accent-red)',
                          border: '1px solid var(--accent-red)',
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowWeightsModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}