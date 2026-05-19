'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { STOCKS } from '@/data/stocks/index';
import { loadPortfolio, savePortfolio, addHolding, removeHolding, calculatePortfolioMetrics, type PortfolioHolding } from '@/lib/portfolio';
import { buildConsensus } from '@/lib/consensus';
import { useLivePrices } from '@/hooks/useLivePrices';
import PortfolioXRay from '@/components/portfolio/PortfolioXRay';

type InnerTab = 'holdings' | 'xray';

function formatCurrency(n: number): string {
  if (n >= 10000000) return 'Rs ' + (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return 'Rs ' + (n / 100000).toFixed(2) + ' L';
  return 'Rs ' + n.toLocaleString('en-IN');
}

function plColor(pl: number): string {
  return pl > 0 ? '#22C55E' : pl < 0 ? '#EF4444' : '#64748B';
}

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

export default function HoldingsTab() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [innerTab, setInnerTab] = useState<InnerTab>('holdings');
  const [showAdd, setShowAdd] = useState(false);
  const [formSymbol, setFormSymbol] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formAvgPrice, setFormAvgPrice] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setHoldings(loadPortfolio().holdings);
  }, []);

  const symbols = useMemo(() => holdings.map(h => h.symbol), [holdings]);
  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return holdings.map(h => {
      const stock = STOCKS[h.symbol];
      const livePrice = prices[h.symbol]?.price ?? (stock?.price ?? h.avgPrice);
      const invested = h.shares * h.avgPrice;
      const current = h.shares * livePrice;
      const pl = current - invested;
      const plPct = invested > 0 ? (pl / invested) * 100 : 0;
      const consensus = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;
      return { ...h, stock, livePrice, invested, current, pl, plPct, score };
    });
  }, [holdings, prices]);

  const totals = useMemo(() => {
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalCurrent  = enriched.reduce((s, h) => s + h.current, 0);
    const totalPL = totalCurrent - totalInvested;
    const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    return { totalInvested, totalCurrent, totalPL, totalPLPct };
  }, [enriched]);

  function handleAdd() {
    setFormError('');
    const sym = formSymbol.trim().toUpperCase();
    const shares = parseFloat(formShares);
    const avgPrice = parseFloat(formAvgPrice);

    if (!STOCKS[sym]) { setFormError('Symbol not found in database'); return; }
    if (!shares || shares <= 0) { setFormError('Enter valid quantity'); return; }
    if (!avgPrice || avgPrice <= 0) { setFormError('Enter valid avg price'); return; }

    addHolding({ symbol: sym, shares, avgPrice, addedDate: new Date().toISOString() });
    setHoldings(loadPortfolio().holdings);
    setFormSymbol(''); setFormShares(''); setFormAvgPrice('');
    setShowAdd(false);
  }

  function handleRemove(symbol: string) {
    removeHolding(symbol);
    setHoldings(loadPortfolio().holdings);
  }

  const inputStyle = {
    padding: '8px 12px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6,
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
  };

  const btnGold = {
    padding: '8px 20px',
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 6,
    color: '#D4AF37',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    letterSpacing: 1,
  };

  return (
    <div>
      {/* Inner tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(30,41,59,0.8)', marginBottom: 24 }}>
        {(['holdings', 'xray'] as InnerTab[]).map(t => (
          <button key={t} onClick={() => setInnerTab(t)} style={{
            padding: '10px 24px', fontSize: 12, fontFamily: 'monospace',
            background: 'transparent', border: 'none',
            borderBottom: innerTab === t ? '2px solid #D4AF37' : '2px solid transparent',
            color: innerTab === t ? '#D4AF37' : '#64748B',
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {t === 'holdings' ? 'Holdings' : 'X-Ray'}
          </button>
        ))}
      </div>

      {innerTab === 'holdings' && (
        <div>
          {/* Summary row */}
          {holdings.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Invested', value: formatCurrency(totals.totalInvested) },
                { label: 'Current Value', value: formatCurrency(totals.totalCurrent) },
                { label: 'Total P&L', value: formatCurrency(totals.totalPL), color: plColor(totals.totalPL) },
                { label: 'Return', value: totals.totalPLPct.toFixed(2) + '%', color: plColor(totals.totalPLPct) },
              ].map(m => (
                <div key={m.label} style={{ padding: 16, background: 'rgba(15,23,42,0.6)', borderRadius: 8, border: '1px solid rgba(30,41,59,0.8)' }}>
                  <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color ?? '#E2E8F0', fontFamily: 'monospace' }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              {loading ? 'Fetching live prices...' : `${holdings.length} position${holdings.length !== 1 ? 's' : ''}`}
            </div>
            <button onClick={() => setShowAdd(!showAdd)} style={btnGold}>
              {showAdd ? '✕ Cancel' : '+ Add Position'}
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div style={{ padding: 20, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>SYMBOL</div>
                  <input value={formSymbol} onChange={e => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. TCS" style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>SHARES</div>
                  <input value={formShares} onChange={e => setFormShares(e.target.value)}
                    placeholder="10" type="number" style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>AVG PRICE</div>
                  <input value={formAvgPrice} onChange={e => setFormAvgPrice(e.target.value)}
                    placeholder="3500" type="number" style={inputStyle} />
                </div>
                <button onClick={handleAdd} style={{ ...btnGold, whiteSpace: 'nowrap' }}>Add</button>
              </div>
              {formError && <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{formError}</div>}
            </div>
          )}

          {/* Empty state */}
          {holdings.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>▣</div>
              <div style={{ color: '#64748B', marginBottom: 16 }}>No positions yet. Add your first holding.</div>
              <button onClick={() => setShowAdd(true)} style={btnGold}>+ Add First Position</button>
            </div>
          )}

          {/* Holdings table */}
          {holdings.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                    {['Symbol', 'Shares', 'Avg Price', 'LTP', 'Invested', 'Current', 'P&L', 'P&L %', 'Score', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(h => (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                      <td style={{ padding: '12px 12px' }}>
                        <Link href={`/stock/${h.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace' }}>
                          {h.symbol}
                        </Link>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{h.stock?.name ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0' }}>{h.shares.toLocaleString()}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0' }}>{h.avgPrice.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0' }}>{h.livePrice.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{formatCurrency(h.invested)}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0' }}>{formatCurrency(h.current)}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: plColor(h.pl), fontWeight: 600 }}>{formatCurrency(h.pl)}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: plColor(h.plPct), fontWeight: 600 }}>{h.plPct.toFixed(2)}%</td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: scoreColor(h.score) }}>{h.score}</span>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <button onClick={() => handleRemove(h.symbol)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }} title="Remove">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {innerTab === 'xray' && (
        <PortfolioXRay
          holdings={holdings.map(h => ({ symbol: h.symbol, shares: h.shares, avgPrice: h.avgPrice }))}
          prices={prices}
        />
      )}
    </div>
  );
}