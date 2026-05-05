'use client';

import { useState } from 'react';
import Link from 'next/link';
import { runBacktest, BACKTEST_RISHIS, type BacktestResult } from '../../lib/backtest';
import { STOCKS } from '../../data/stocks';
import { getCurrentTier } from '../../lib/premium';

export default function BacktestPage() {
  const [selectedRishi, setSelectedRishi] = useState('Damani');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);

  const tier = getCurrentTier();
  const canBacktest = tier === 'disciple';

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const stocks = Object.values(STOCKS).slice(0, 20);
      const res = runBacktest(selectedRishi, stocks);
      setResult(res);
      setRunning(false);
    }, 800);
  };

  const fmt = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;
  const pctColor = (n: number) => n >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper" style={{ padding: '0 24px' }}>
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>HISTORICAL BACKTESTING</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 38, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            Rishi Backtesting
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.7, marginBottom: 32 }}>
            How would a pure Damani, Buffett, or Jhunjhunwala portfolio have performed from 2018 to 2025?
            See the power of philosophical discipline over market cycles.
          </p>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '32px 24px' }}>

        {!canBacktest && (
          <div className="card" style={{ padding: 32, marginBottom: 32, textAlign: 'center', border: '1px solid rgba(192,132,252,0.3)', background: 'rgba(192,132,252,0.05)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#c084fc', marginBottom: 12 }}>
              Disciple Feature
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Historical backtesting is available to Disciples. Upgrade to see how Rishi philosophies performed through bull runs, crashes, and recoveries.
            </p>
            <Link href="/pricing" style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: '#c084fc',
              color: '#000',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}>
              Upgrade to Disciple — Rs 1,999/year
            </Link>
          </div>
        )}

        <div className="card" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
            SELECT RISHI PHILOSOPHY
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
            {BACKTEST_RISHIS.map(rishi => (
              <button key={rishi} onClick={() => setSelectedRishi(rishi)}
                style={{
                  padding: '10px 16px',
                  background: selectedRishi === rishi ? 'var(--accent-gold)' : 'var(--bg-secondary)',
                  color: selectedRishi === rishi ? '#000' : 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  fontWeight: selectedRishi === rishi ? 700 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: selectedRishi === rishi ? 'Cinzel, serif' : 'inherit',
                }}
              >
                {rishi}
              </button>
            ))}
          </div>

          <button onClick={handleRun} disabled={!canBacktest || running}
            style={{
              padding: '14px 32px',
              background: canBacktest ? 'var(--accent-gold)' : 'var(--border-primary)',
              color: canBacktest ? '#000' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: canBacktest ? 'pointer' : 'not-allowed',
              fontFamily: 'Cinzel, serif',
              letterSpacing: 1,
            }}
          >
            {running ? 'Running Simulation...' : `Run ${selectedRishi} Strategy 2018-2025`}
          </button>
        </div>

        {result && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div className="card" style={{ padding: 16, border: '1px solid rgba(255,215,0,0.3)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>FINAL VALUE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold)' }}>{fmt(result.finalValue)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Started at {fmt(result.startValue)}</div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>PORTFOLIO CAGR</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: pctColor(result.cagr) }}>{result.cagr}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Per year</div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>NIFTY CAGR</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' }}>{result.niftyCagr}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Benchmark</div>
              </div>

              <div className="card" style={{ padding: 16, border: `1px solid ${result.alpha >= 0 ? 'rgba(0,186,124,0.3)' : 'rgba(244,33,46,0.3)'}` }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>ALPHA</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: pctColor(result.alpha) }}>
                  {result.alpha >= 0 ? '+' : ''}{result.alpha}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Over Nifty</div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 8 }}>TOTAL RETURN</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: pctColor(result.totalReturn) }}>
                  {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>2018-2025</div>
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>
                PHILOSOPHY
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                "{result.philosophy}"
              </p>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 10, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
                YEAR BY YEAR PERFORMANCE
              </div>

              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>YEAR</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>PORTFOLIO</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>NIFTY</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>RETURN</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>NIFTY RETURN</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>ALPHA</th>
                  </tr>
                </thead>
                <tbody>
                  {result.years.map(y => {
                    const alpha = y.annualReturn - y.niftyReturn;
                    return (
                      <tr key={y.year} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Cinzel, serif' }}>{y.year}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: 'var(--accent-gold)' }}>{fmt(y.portfolioValue)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)' }}>{fmt(y.niftyValue)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: pctColor(y.annualReturn) }}>
                          {y.annualReturn >= 0 ? '+' : ''}{y.annualReturn}%
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)' }}>
                          {y.niftyReturn >= 0 ? '+' : ''}{y.niftyReturn}%
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: pctColor(alpha) }}>
                          {alpha >= 0 ? '+' : ''}{Math.round(alpha * 10) / 10}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}