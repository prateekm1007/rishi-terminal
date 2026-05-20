'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { useLivePrices } from '@/hooks/useLivePrices';

const STORAGE_KEY = 'rishi_compare_v2';
const MAX_STOCKS = 10;

type ViewMode = 'matrix' | 'philosophy' | 'heatmap' | 'radar' | 'historical';

interface CompareState {
  symbols: string[];
  viewMode: ViewMode;
}

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(changePct: number): string {
  return changePct > 0 ? '#22C55E' : changePct < 0 ? '#EF4444' : '#64748B';
}

function metricColor(val: number, thresholds: [number, number]): string {
  const [low, high] = thresholds;
  return val >= high ? '#22C55E' : val >= low ? '#D4AF37' : '#EF4444';
}

export default function CompareTab() {
  const [symbols, setSymbols] = useState<string[]>(['TCS', 'RELIANCE']);
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [addSymbol, setAddSymbol] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CompareState;
      if (parsed.symbols && parsed.symbols.length > 0) {
        setSymbols(parsed.symbols.slice(0, MAX_STOCKS));
      }
      if (parsed.viewMode) setViewMode(parsed.viewMode);
    } catch {
      // ignore
    }
  }, []);

  function persist(updatedSymbols: string[], updatedMode?: ViewMode) {
    const state: CompareState = {
      symbols: updatedSymbols,
      viewMode: updatedMode ?? viewMode,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return symbols.map(sym => {
      const stock = STOCKS[sym];
      if (!stock) return null;
      
      const consensus = buildConsensus(stock);
      const live = prices[sym]?.price ?? stock.price;
      const changePct = prices[sym]?.changePercent24h ?? 0;
      
      const moatScore = consensus.scores.find(r => r.name === 'Warren Buffett')?.score ?? 0;
      const valuationScore = consensus.scores.find(r => r.name === 'Ben Graham')?.score ?? 0;
      const growthScore = consensus.scores.find(r => r.name === 'Peter Lynch')?.score ?? 0;
      const governanceScore = consensus.scores.find(r => r.name === 'Charlie Munger')?.score ?? 0;
      const sentimentScore = consensus.scores.find(r => r.name === 'George Soros')?.score ?? 0;
      const qualityScore = consensus.scores.find(r => r.name === 'Philip Fisher')?.score ?? 0;

      return {
        symbol: sym,
        name: stock.name,
        sector: stock.sector,
        live,
        changePct,
        volume: stock.volume ?? 0,
        pe: stock.pe,
        pb: stock.pb ?? 0,
        roe: stock.roe,
        roce: stock.roce ?? 0,
        debtToEquity: stock.debtToEquity ?? 0,
        fcfYield: stock.fcfYield ?? 0,
        dividendYield: stock.dividendYield ?? 0,
        marketCap: stock.marketCap,
        consensus: consensus.consensus,
        category: consensus.category,
        tension: consensus.tension,
        tensionSpread: consensus.tensionSpread,
        topBull: consensus.topBull?.full ?? '—',
        topBear: consensus.topBear?.full ?? '—',
        scores: consensus.scores,
        moatScore,
        valuationScore,
        growthScore,
        governanceScore,
        sentimentScore,
        qualityScore,
      };
    }).filter(Boolean);
  }, [symbols, prices]);

  function addStock() {
    setError('');
    const sym = addSymbol.trim().toUpperCase();
    if (!sym) { setError('Enter a symbol'); return; }
    if (!STOCKS[sym]) { setError('Symbol not found'); return; }
    if (symbols.includes(sym)) { setError('Already in comparison'); return; }
    if (symbols.length >= MAX_STOCKS) { setError(`Max ${MAX_STOCKS} stocks allowed`); return; }
    
    const next = [...symbols, sym];
    setSymbols(next);
    persist(next);
    setAddSymbol('');
  }

  function removeStock(sym: string) {
    const next = symbols.filter(s => s !== sym);
    setSymbols(next);
    persist(next);
  }

  function clearAll() {
    setSymbols([]);
    persist([]);
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6,
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
  };

  const btnGold: React.CSSProperties = {
    padding: '8px 16px',
    background: 'rgba(212,175,55,0.15)',
    border: '1px solid rgba(212,175,55,0.4)',
    borderRadius: 6,
    color: '#D4AF37',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  };

  const viewModes: Array<{ id: ViewMode; label: string; icon: string }> = [
    { id: 'matrix', label: 'Deep Metric Matrix', icon: '⊞' },
    { id: 'philosophy', label: 'Philosophy Showdown', icon: '⚔️' },
    { id: 'heatmap', label: 'Heatmap', icon: '🔥' },
    { id: 'radar', label: 'Radar Chart', icon: '📡' },
    { id: 'historical', label: 'Historical Battle', icon: '📈' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD STOCK (MAX {MAX_STOCKS})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <input
              value={addSymbol}
              onChange={e => setAddSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addStock()}
              placeholder="e.g. INFY"
              style={inputStyle}
            />
            <button onClick={addStock} style={btnGold}>+ Add</button>
          </div>
          {error && <div style={{ marginTop: 6, fontSize: 12, color: '#EF4444' }}>{error}</div>}
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          {loading ? 'Fetching prices...' : `${symbols.length}/${MAX_STOCKS} stocks`}
        </div>

        {symbols.length > 0 && (
          <button onClick={clearAll} style={{ ...btnGold, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
            Clear All
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(30,41,59,0.8)', paddingBottom: 10, flexWrap: 'wrap' }}>
        {viewModes.map(vm => (
          <button
            key={vm.id}
            onClick={() => { setViewMode(vm.id); persist(symbols, vm.id); }}
            style={{
              padding: '8px 14px',
              background: viewMode === vm.id ? 'rgba(212,175,55,0.15)' : 'transparent',
              border: viewMode === vm.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(30,41,59,0.8)',
              borderRadius: 6,
              color: viewMode === vm.id ? '#D4AF37' : '#64748B',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: viewMode === vm.id ? 700 : 400,
            }}
          >
            {vm.icon} {vm.label}
          </button>
        ))}
      </div>

      {symbols.length === 0 && (
        <div style={{ padding: 64, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>⚔️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37', marginBottom: 12 }}>
            The Arena is Empty
          </div>
          <div style={{ color: '#64748B', marginBottom: 20 }}>
            Add stocks to begin the battle of philosophies and metrics.
          </div>
        </div>
      )}

      {symbols.length > 0 && viewMode === 'matrix' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(212,175,55,0.4)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600, position: 'sticky', left: 0, background: '#0B1221', zIndex: 10 }}>STOCK</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>PRICE</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>24H %</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>VOLUME</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>MKT CAP</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>RISHI SCORE</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>CATEGORY</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>MOAT</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>VALUATION</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>GROWTH</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>GOVERNANCE</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>SENTIMENT</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>QUALITY</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>P/E</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>P/B</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>ROE %</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>ROCE %</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>D/E</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>FCF YLD %</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>DIV YLD %</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>TOP BULL</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>TOP BEAR</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>TENSION</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((e: any) => (
                <tr key={e.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                  <td style={{ padding: '12px 12px', position: 'sticky', left: 0, background: '#0B1221', zIndex: 9 }}>
                    <Link href={`/stock/${e.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 800, fontFamily: 'monospace' }}>
                      {e.symbol}
                    </Link>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{e.name}</div>
                    <div style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}>{e.sector}</div>
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#E2E8F0' }}>
                    {e.live.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: changeColor(e.changePct) }}>
                    {e.changePct >= 0 ? '+' : ''}{e.changePct.toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>
                    {e.volume > 0 ? (e.volume / 1000000).toFixed(2) + 'M' : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>
                    {e.marketCap > 0 ? '' + (e.marketCap / 10000000).toFixed(0) + 'Cr' : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: scoreColor(e.consensus) }}>
                      {e.consensus}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: 10, color: '#94A3B8' }}>
                    {e.category}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(e.moatScore) }}>
                    {e.moatScore}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(e.valuationScore) }}>
                    {e.valuationScore}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(e.growthScore) }}>
                    {e.growthScore}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(e.governanceScore) }}>
                    {e.governanceScore}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(e.sentimentScore) }}>
                    {e.sentimentScore}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: scoreColor(e.qualityScore) }}>
                    {e.qualityScore}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: metricColor(e.pe, [20, 30]) }}>
                    {e.pe > 0 ? e.pe.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: metricColor(e.pb, [2, 4]) }}>
                    {e.pb > 0 ? e.pb.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: metricColor(e.roe, [12, 18]) }}>
                    {e.roe > 0 ? e.roe.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: metricColor(e.roce, [15, 25]) }}>
                    {e.roce > 0 ? e.roce.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: e.debtToEquity > 1 ? '#EF4444' : '#22C55E' }}>
                    {e.debtToEquity > 0 ? e.debtToEquity.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: metricColor(e.fcfYield, [2, 5]) }}>
                    {e.fcfYield > 0 ? e.fcfYield.toFixed(1) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: metricColor(e.dividendYield, [1, 3]) }}>
                    {e.dividendYield > 0 ? e.dividendYield.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: 10, color: '#22C55E' }}>
                    {e.topBull}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: 10, color: '#EF4444' }}>
                    {e.topBear}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: 10, color: e.tensionSpread > 40 ? '#EF4444' : '#64748B' }}>
                    {e.tension} ({e.tensionSpread})
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => removeStock(e.symbol)}
                      style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, fontSize: 11, color: '#64748B' }}>
            Deep Metric Matrix — 24 columns covering price, volume, Rishi pillar scores, valuation ratios, profitability, and tension.
          </div>
        </div>
      )}

      {symbols.length > 0 && viewMode !== 'matrix' && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37', marginBottom: 12 }}>
            {viewModes.find(vm => vm.id === viewMode)?.label}
          </div>
          <div style={{ color: '#64748B' }}>
            Coming in next patch...
          </div>
        </div>
      )}
    </div>
  );
}