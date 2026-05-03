'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STOCKS } from '../../data/stocks';
import { scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss } from '../../lib/scorers';
import { sc, getSig, SIG } from '../../lib/utils';

const SCORERS = [scoreJhunjhunwala, scoreDamani, scoreBuffett, scoreGraham, scoreLynch, scoreKacholia, scoreKedia, scoreMunger, scoreGreenblatt, scorePabrai, scorePorinju, scoreRaamdeo, scoreNemish, scoreBasant, scorePhilipFisher, scoreHowardMarks, scoreSethKlarman, scoreJohnTempleton, scoreWalterSchloss];

interface Holding {
  symbol: string;
  qty: number;
  avgPrice: number;
}

function getComposite(sym: string) {
  const s = STOCKS[sym as keyof typeof STOCKS];
  const scores = SCORERS.map(fn => fn(s));
  return Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
}

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [sym, setSym] = useState('TITAN');
  const [qty, setQty] = useState('10');
  const [avgPrice, setAvgPrice] = useState('');
  const [csvText, setCsvText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('rishi_portfolio');
    if (saved) setHoldings(JSON.parse(saved));
  }, []);

  const saveHoldings = (h: Holding[]) => {
    setHoldings(h);
    localStorage.setItem('rishi_portfolio', JSON.stringify(h));
  };

  const addHolding = () => {
    if (!sym || !qty || !avgPrice) return;
    const existing = holdings.findIndex(h => h.symbol === sym);
    let newHoldings;
    if (existing >= 0) {
      newHoldings = [...holdings];
      newHoldings[existing] = { symbol: sym, qty: Number(qty), avgPrice: Number(avgPrice) };
    } else {
      newHoldings = [...holdings, { symbol: sym, qty: Number(qty), avgPrice: Number(avgPrice) }];
    }
    saveHoldings(newHoldings);
    setQty('10');
    setAvgPrice('');
  };

  const removeHolding = (s: string) => {
    saveHoldings(holdings.filter(h => h.symbol !== s));
  };

  const parseCSV = () => {
    const lines = csvText.trim().split('\n').slice(1);
    const parsed: Holding[] = [];
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const symbol = parts[0].trim().toUpperCase();
        const quantity = Number(parts[1].trim());
        const avgPrice = Number(parts[2].trim());
        if (STOCKS[symbol as keyof typeof STOCKS] && !isNaN(quantity) && !isNaN(avgPrice)) {
          parsed.push({ symbol, qty: quantity, avgPrice });
        }
      }
    });
    saveHoldings(parsed);
    setCsvText('');
  };

  const totalInvested = holdings.reduce((a, h) => a + h.qty * h.avgPrice, 0);
  const totalCurrent = holdings.reduce((a, h) => {
    const s = STOCKS[h.symbol as keyof typeof STOCKS];
    return a + (s ? h.qty * s.price : 0);
  }, 0);
  const totalPnL = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const portfolioScore = holdings.length > 0 ? Math.round(holdings.reduce((a, h) => a + getComposite(h.symbol), 0) / holdings.length) : 0;

  const SYMBOLS = Object.keys(STOCKS);

  return (
    <div style={{ fontFamily: 'monospace', background: '#050508', color: '#E2E8F0', minHeight: '100vh', padding: 24 }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap"/>
      
      <Link href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 12, marginBottom: 20, display: 'inline-block' }}>← Back to Dashboard</Link>
      
      <div style={{ fontFamily: 'Cinzel, Georgia', fontSize: 20, color: '#F59E0B', letterSpacing: 3, marginBottom: 4 }}>PORTFOLIO ANALYZER</div>
      <div style={{ fontSize: 10, color: '#334155', letterSpacing: 2, marginBottom: 24 }}>TRACK HOLDINGS THROUGH RISHI LENS</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#09090F', border: `2px solid ${sc(portfolioScore)}40`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1, marginBottom: 6 }}>PORTFOLIO RISHI SCORE</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: sc(portfolioScore), fontFamily: 'Cinzel, Georgia' }}>{portfolioScore}</div>
          <div style={{ fontSize: 9, color: sc(portfolioScore), marginTop: 4 }}>{getSig(portfolioScore)}</div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1, marginBottom: 6 }}>TOTAL INVESTED</div>
          <div style={{ fontSize: 20, color: '#F1F5F9', fontWeight: 700 }}>{Math.round(totalInvested).toLocaleString('en-US')}</div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1, marginBottom: 6 }}>CURRENT VALUE</div>
          <div style={{ fontSize: 20, color: '#F1F5F9', fontWeight: 700 }}>{Math.round(totalCurrent).toLocaleString('en-US')}</div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1, marginBottom: 6 }}>P&L / RETURN</div>
          <div style={{ fontSize: 20, color: totalPnL >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
            {totalPnL >= 0 ? '+' : ''}{Math.round(totalPnL).toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: 11, color: totalPnL >= 0 ? '#10B981' : '#EF4444', marginTop: 4 }}>
            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
          </div>
        </div>
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', letterSpacing: 1, marginBottom: 6 }}>HOLDINGS</div>
          <div style={{ fontSize: 28, color: '#F59E0B', fontWeight: 700 }}>{holdings.length}</div>
        </div>
      </div>

      <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#F59E0B', letterSpacing: 1, marginBottom: 16, fontWeight: 600 }}>ADD HOLDING MANUALLY</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>STOCK SYMBOL</div>
            <select value={sym} onChange={e => setSym(e.target.value)} style={{ width: '100%', background: '#0A0A16', border: '1px solid #1E293B', borderRadius: 5, padding: '8px', color: '#E2E8F0', fontSize: 11 }}>
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>QUANTITY</div>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', background: '#0A0A16', border: '1px solid #1E293B', borderRadius: 5, padding: '8px', color: '#E2E8F0', fontSize: 11, boxSizing: 'border-box' }}/>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#475569', marginBottom: 4 }}>AVERAGE PRICE ()</div>
            <input type="number" value={avgPrice} onChange={e => setAvgPrice(e.target.value)} placeholder={STOCKS[sym as keyof typeof STOCKS]?.price.toString()} style={{ width: '100%', background: '#0A0A16', border: '1px solid #1E293B', borderRadius: 5, padding: '8px', color: '#E2E8F0', fontSize: 11, boxSizing: 'border-box' }}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={addHolding} style={{ width: '100%', background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: 5, padding: '8px', color: '#F59E0B', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ ADD TO PORTFOLIO</button>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #1E293B' }}>
          <div style={{ fontSize: 10, color: '#F59E0B', letterSpacing: 1, marginBottom: 12, fontWeight: 600 }}>IMPORT FROM CSV</div>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>Format: Symbol, Quantity, AvgPrice (one per line)</div>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} placeholder={"TITAN,10,2800\nINFY,50,1400\nRELIANCE,20,2500"} rows={4} style={{ width: '100%', background: '#0A0A16', border: '1px solid #1E293B', borderRadius: 5, padding: '10px', color: '#E2E8F0', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}/>
          <button onClick={parseCSV} style={{ marginTop: 10, background: '#10B98115', border: '1px solid #10B98140', borderRadius: 5, padding: '8px 16px', color: '#10B981', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>IMPORT CSV</button>
        </div>
      </div>

      {holdings.length > 0 && (
        <div style={{ background: '#09090F', border: '1px solid #1E293B', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: 1, padding: '12px 16px', borderBottom: '1px solid #1E293B', fontWeight: 600 }}>YOUR HOLDINGS</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#06060D' }}>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'left' }}>SYMBOL</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'right' }}>QTY</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'right' }}>AVG PRICE</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'right' }}>CURRENT</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'right' }}>P&L</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'right' }}>RISHI SCORE</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontSize: 9, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => {
                  const s = STOCKS[h.symbol as keyof typeof STOCKS];
                  if (!s) return null;
                  const pnl = (s.price - h.avgPrice) * h.qty;
                  const pnlPct = ((s.price - h.avgPrice) / h.avgPrice) * 100;
                  const comp = getComposite(h.symbol);
                  return (
                    <tr key={h.symbol} style={{ borderBottom: '1px solid #0F0F1A', background: i % 2 === 0 ? '#09090F' : '#07070E' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <Link href={`/stock/${h.symbol}`} style={{ color: '#F59E0B', fontWeight: 600, textDecoration: 'none' }}>{h.symbol}</Link>
                        <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{s.name}</div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#94A3B8', textAlign: 'right' }}>{h.qty}</td>
                      <td style={{ padding: '10px 12px', color: '#94A3B8', textAlign: 'right' }}>{h.avgPrice.toLocaleString('en-US')}</td>
                      <td style={{ padding: '10px 12px', color: '#F1F5F9', textAlign: 'right' }}>{s.price.toLocaleString('en-US')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ color: pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>{pnl >= 0 ? '+' : ''}{Math.round(pnl).toLocaleString('en-US')}</div>
                        <div style={{ fontSize: 9, color: pnl >= 0 ? '#10B981' : '#EF4444' }}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{ fontSize: 14, color: sc(comp), fontWeight: 700 }}>{comp}</span>
                        <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{getSig(comp)}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button onClick={() => removeHolding(h.symbol)} style={{ background: '#EF444415', border: '1px solid #EF444430', borderRadius: 4, padding: '4px 8px', color: '#EF4444', cursor: 'pointer', fontSize: 10 }}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {holdings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#1E293B', background: '#09090F', borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💼</div>
          <div style={{ fontSize: 14, color: '#475569' }}>No holdings yet.</div>
          <div style={{ fontSize: 11, color: '#334155', marginTop: 8 }}>Add stocks manually or import a CSV above.</div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 9, color: '#0F172A', letterSpacing: 1 }}>NOT INVESTMENT ADVICE · EDUCATIONAL SIMULATION</div>
    </div>
  );
}