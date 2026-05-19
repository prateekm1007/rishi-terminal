'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { useLivePrices } from '@/hooks/useLivePrices';

const STORAGE_KEY = 'rishi_compare_v1';

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(changePct: number): string {
  return changePct > 0 ? '#22C55E' : changePct < 0 ? '#EF4444' : '#64748B';
}

function clampList(list: string[], max = 8) {
  const uniq: string[] = [];
  for (const s of list) {
    const k = (s || '').trim().toUpperCase();
    if (!k) continue;
    if (uniq.includes(k)) continue;
    uniq.push(k);
    if (uniq.length >= max) break;
  }
  return uniq;
}

export default function CompareTab() {
  const [symbols, setSymbols] = useState<string[]>(['TCS', 'RELIANCE']);
  const [addSymbol, setAddSymbol] = useState('INFY');
  const [error, setError] = useState('');
  const [view, setView] = useState<'table' | 'rishis'>('table');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { symbols?: string[] };
      const next = clampList(parsed?.symbols ?? []);
      if (next.length >= 1) setSymbols(next);
    } catch {
      // ignore
    }
  }, []);

  function persist(next: string[]) {
    const clamped = clampList(next);
    setSymbols(clamped);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ symbols: clamped }));
    } catch {
      // ignore
    }
  }

  function add() {
    setError('');
    const sym = (addSymbol || '').trim().toUpperCase();
    if (!sym) { setError('Enter a symbol'); return; }
    if (!STOCKS[sym]) { setError('Symbol not found in database'); return; }
    if (symbols.includes(sym)) { setError('Already added'); return; }
    if (symbols.length >= 8) { setError('Max 8 assets'); return; }
    persist([sym, ...symbols]);
  }

  function remove(sym: string) {
    persist(symbols.filter(s => s !== sym));
  }

  const { prices, loading } = useLivePrices(symbols);

  const rows = useMemo(() => {
    return symbols.map(sym => {
      const stock = STOCKS[sym];
      const live = prices[sym]?.price ?? stock?.price ?? 0;
      const changePct = prices[sym]?.changePercent24h ?? 0;
      const consensus = stock ? buildConsensus(stock) : null;

      return {
        sym,
        stock,
        live,
        changePct,
        consensus,
        score: consensus?.consensus ?? 0,
        tension: consensus?.tension ?? '—',
        tensionSpread: consensus?.tensionSpread ?? 0,
        topBull: consensus?.topBull,
        topBear: consensus?.topBear,
      };
    });
  }, [symbols, prices]);

  const inputStyle: any = {
    padding: '8px 12px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6,
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
  };

  const btnGold: any = {
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

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 380px' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD ASSET (max 8)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <input
              value={addSymbol}
              onChange={e => setAddSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. HDFCBANK"
              style={inputStyle}
              list="rishi-stock-symbols"
            />
            <button onClick={add} style={btnGold}>+ Add</button>
          </div>
          <datalist id="rishi-stock-symbols">
            {Object.keys(STOCKS).slice(0, 250).map(s => <option key={s} value={s} />)}
          </datalist>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{error}</div>}
        </div>

        <div style={{ minWidth: 220 }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>VIEW</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setView('table')} style={{ ...btnGold, opacity: view === 'table' ? 1 : 0.6 }}>Table</button>
            <button onClick={() => setView('rishis')} style={{ ...btnGold, opacity: view === 'rishis' ? 1 : 0.6 }}>Rishis</button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          {loading ? 'Fetching live prices...' : `${symbols.length} asset${symbols.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {symbols.map(sym => (
          <div key={sym} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 999, background: 'rgba(212,175,55,0.06)' }}>
            <Link href={`/stock/${sym}`} style={{ color: '#D4AF37', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 800 }}>
              {sym}
            </Link>
            <button onClick={() => remove(sym)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }} title="Remove">✕</button>
          </div>
        ))}
      </div>

      {/* Views */}
      {view === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                {['Symbol', 'Price', '24h %', 'Rishi Score', 'Tension', 'P/E', 'ROE', 'D/E', 'Rev CAGR', 'EPS CAGR', 'OPM', 'Promoter', 'Mkt Cap'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sym} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                  <td style={{ padding: '12px 12px' }}>
                    <Link href={`/stock/${r.sym}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 800, fontFamily: 'monospace' }}>
                      {r.sym}
                    </Link>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{r.stock?.name ?? '—'}</div>
                  </td>

                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0' }}>{(r.live ?? 0).toLocaleString('en-IN')}</td>

                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: changeColor(r.changePct ?? 0), fontWeight: 800 }}>
                    {(r.changePct ?? 0).toFixed(2)}%
                  </td>

                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color: scoreColor(r.score) }}>{r.score}</span>
                  </td>

                  <td style={{ padding: '12px 12px', color: '#94A3B8' }}>
                    {r.tension}{r.tensionSpread ? ` (${r.tensionSpread})` : ''}
                  </td>

                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.pe ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.roe ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.de ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.revcagr ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.epscagr ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.opm ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.promo ?? '—'}</td>
                  <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{r.stock?.mktcap ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'rishis' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {rows.map(r => (
            <div key={r.sym} style={{ padding: 16, border: '1px solid rgba(30,41,59,0.8)', borderRadius: 10, background: 'rgba(15,23,42,0.55)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Link href={`/stock/${r.sym}`} style={{ color: '#D4AF37', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 900 }}>
                  {r.sym}
                </Link>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, color: scoreColor(r.score) }}>{r.score}</div>
              </div>

              <div style={{ marginTop: 10, color: '#94A3B8', fontSize: 12 }}>
                {r.tension}{r.tensionSpread ? ` (${r.tensionSpread})` : ''}
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 12, border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, background: 'rgba(34,197,94,0.06)' }}>
                  <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>TOP BULL</div>
                  <div style={{ color: '#E2E8F0', fontWeight: 800 }}>{r.topBull?.full ?? '—'}</div>
                  <div style={{ fontFamily: 'monospace', color: '#22C55E', marginTop: 6 }}>{r.topBull?.score ?? '—'}</div>
                </div>

                <div style={{ padding: 12, border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, background: 'rgba(239,68,68,0.06)' }}>
                  <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 6 }}>TOP BEAR</div>
                  <div style={{ color: '#E2E8F0', fontWeight: 800 }}>{r.topBear?.full ?? '—'}</div>
                  <div style={{ fontFamily: 'monospace', color: '#EF4444', marginTop: 6 }}>{r.topBear?.score ?? '—'}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 11, color: '#64748B' }}>
                Tip: use the Table view for metrics; Rishis view for divergence.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}