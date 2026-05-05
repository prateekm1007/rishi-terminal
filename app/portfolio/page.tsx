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

  useEffect(() => {
    setPortfolio(loadPortfolio());
  }, []);

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
                              setPortfolio(loadPortfolio());
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
    </main>
  );
}