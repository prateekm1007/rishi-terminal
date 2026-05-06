'use client';

import { useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { buildConsensus } from '../../lib/consensus';

export default function MyReturnsPage() {
  const [startYear, setStartYear] = useState(2020);
  const [endYear, setEndYear] = useState(2025);
  const [holdings, setHoldings] = useState<Array<{symbol: string; shares: number; buyPrice: number}>>([
    { symbol: 'RELIANCE', shares: 10, buyPrice: 2200 },
    { symbol: 'TCS', shares: 5, buyPrice: 3400 },
  ]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState(10);

  const addHolding = () => {
    if (!newSymbol || !STOCKS[newSymbol.toUpperCase()]) return;
    const stock = STOCKS[newSymbol.toUpperCase()];
    setHoldings([...holdings, { symbol: newSymbol.toUpperCase(), shares: newShares, buyPrice: stock.price * 0.8 }]);
    setNewSymbol('');
  };

  const removeHolding = (idx: number) => {
    setHoldings(holdings.filter((_, i) => i !== idx));
  };

  const totalInvested = holdings.reduce((sum, h) => {
    const stock = STOCKS[h.symbol];
    return sum + (h.buyPrice * h.shares);
  }, 0);

  const totalCurrent = holdings.reduce((sum, h) => {
    const stock = STOCKS[h.symbol];
    return sum + (stock.price * h.shares);
  }, 0);

  const totalReturn = ((totalCurrent - totalInvested) / totalInvested) * 100;
  const years = endYear - startYear;
  const cagr = years > 0 ? (Math.pow(totalCurrent / totalInvested, 1 / years) - 1) * 100 : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > MY RETURNS'}
          </div>
          <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
            My Returns Calculator
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 700, lineHeight: 1.7 }}>
            Track your actual portfolio performance. Add stocks you own, see returns, CAGR, and how Rishis rate them.
          </p>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px', maxWidth: 1200 }}>

        {/* Period Selector */}
        <div className="card-sacred" style={{ padding: 20, marginBottom: 24 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2, color: 'var(--text-muted)' }}>
            HOLDING PERIOD
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Start Year</label>
              <input
                type="number"
                value={startYear}
                onChange={e => setStartYear(parseInt(e.target.value))}
                min={2015}
                max={2025}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>End Year</label>
              <input
                type="number"
                value={endYear}
                onChange={e => setEndYear(parseInt(e.target.value))}
                min={2015}
                max={2025}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>
        </div>

        {/* Holdings */}
        <div className="card-sacred" style={{ padding: 20, marginBottom: 24 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2, color: 'var(--text-muted)' }}>
            MY HOLDINGS
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>STOCK</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>SHARES</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>BUY PRICE</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>CURRENT</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>RETURN</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 2 }}>RISHI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, idx) => {
                const stock = STOCKS[h.symbol];
                const ret = ((stock.price - h.buyPrice) / h.buyPrice) * 100;
                const consensus = buildConsensus(stock).consensus;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ fontWeight: 600 }}>{stock.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{h.symbol}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{h.shares}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{h.buyPrice.toFixed(0)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{stock.price.toFixed(0)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: ret >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-gold)', fontWeight: 700 }}>
                      {consensus}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => removeHolding(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: 12 }}>
            <input
              type="text"
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g., INFY)"
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
            <input
              type="number"
              value={newShares}
              onChange={e => setNewShares(parseInt(e.target.value))}
              placeholder="Shares"
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
            <button
              onClick={addHolding}
              style={{
                padding: '8px 12px',
                background: 'var(--accent-gold)',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="card-sacred" style={{ padding: 20 }}>
          <div className="philosophy-heading" style={{ fontSize: 14, marginBottom: 16, letterSpacing: 2, color: 'var(--text-muted)' }}>
            PORTFOLIO SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Invested</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Return</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CAGR</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-gold)' }}>
                {cagr.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}