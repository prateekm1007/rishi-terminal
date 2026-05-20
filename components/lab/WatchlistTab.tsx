'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { addHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';

interface WatchlistItem {
  symbol: string;
  addedDate: string;
  notes?: string;
  conviction?: number;
  catalyst?: string;
}

const STORAGE_KEY = 'rishi_watchlist_v3';

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(changePct: number): string {
  return changePct > 0 ? '#22C55E' : changePct < 0 ? '#EF4444' : '#64748B';
}

function convictionLabel(c: number): string {
  return c >= 9 ? 'Max Conviction' : c >= 7 ? 'High' : c >= 5 ? 'Moderate' : c >= 3 ? 'Low' : 'Speculative';
}

function convictionColor(c: number): string {
  return c >= 9 ? '#22C55E' : c >= 7 ? '#A3E635' : c >= 5 ? '#D4AF37' : c >= 3 ? '#F97316' : '#EF4444';
}

export default function WatchlistTab() {
  const [lists, setLists] = useState<Record<string, WatchlistItem[]>>({
    default: [],
    highConviction: [],
    valueTraps: [],
    earningsWatch: [],
  });
  const [activeList, setActiveList] = useState<string>('default');
  const [addSymbol, setAddSymbol] = useState('TCS');
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'score' | 'change' | 'conviction'>('added');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLists(parsed.lists ?? { default: [], highConviction: [], valueTraps: [], earningsWatch: [] });
        setActiveList(parsed.activeList ?? 'default');
      } else {
        const oldRaw = localStorage.getItem('rishi_watchlist_v2');
        if (oldRaw) {
          const old = JSON.parse(oldRaw);
          setLists({ default: Array.isArray(old) ? old : [], highConviction: [], valueTraps: [], earningsWatch: [] });
        }
      }
    } catch {
      setLists({ default: [], highConviction: [], valueTraps: [], earningsWatch: [] });
    }
  }, []);

  function persist(updatedLists: Record<string, WatchlistItem[]>) {
    setLists(updatedLists);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists: updatedLists, activeList }));
    } catch {
      // ignore
    }
  }

  const isSmart = activeList === 'smartHighScore';

  const items: WatchlistItem[] = useMemo(() => {
    if (isSmart) {
      return Object.keys(STOCKS)
        .filter(sym => {
          const stock = STOCKS[sym];
          const c = stock ? buildConsensus(stock) : null;
          return (c?.consensus ?? 0) > 75;
        })
        .map(sym => ({ symbol: sym, addedDate: '', notes: '', conviction: 0, catalyst: '' }));
    }
    return lists[activeList] ?? [];
  }, [isSmart, lists, activeList]);

  const symbols = useMemo(() => items.map(i => i.symbol), [items]);
  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return items.map(i => {
      const stock = STOCKS[i.symbol];
      const live = prices[i.symbol]?.price ?? (stock?.price ?? 0);
      const changePct = prices[i.symbol]?.changePercent24h ?? 0;
      const consensus = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;
      const topBull = consensus?.topBull?.full ?? '—';
      const rishiConviction = score >= 75 ? 9 : score >= 65 ? 7 : score >= 55 ? 5 : score >= 45 ? 3 : 1;
      const userConviction = i.conviction ?? 5;
      const combinedConviction = Math.round((rishiConviction + userConviction) / 2);
      return { ...i, stock, live, changePct, score, topBull, rishiConviction, userConviction, combinedConviction };
    });
  }, [items, prices]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sortBy === 'added') {
      arr.sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
    } else if (sortBy === 'score') {
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (sortBy === 'conviction') {
      arr.sort((a, b) => (b.combinedConviction ?? 0) - (a.combinedConviction ?? 0));
    } else {
      arr.sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
    }
    return arr;
  }, [enriched, sortBy]);

  function addItem() {
    setError('');
    const sym = (addSymbol ?? '').trim().toUpperCase();
    if (!sym) { setError('Enter a symbol'); return; }
    if (!STOCKS[sym]) { setError('Symbol not found in database'); return; }
    if (items.some(x => x.symbol === sym)) { setError('Already in watchlist'); return; }
    const next = { ...lists, [activeList]: [{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, catalyst: '', notes: '' }, ...items] };
    persist(next);
  }

  function removeItem(symbol: string) {
    const next = { ...lists, [activeList]: items.filter(i => i.symbol !== symbol) };
    persist(next);
  }

  function updateField(symbol: string, field: keyof WatchlistItem, value: string | number) {
    const next = { ...lists, [activeList]: items.map(i => i.symbol === symbol ? { ...i, [field]: value } : i) };
    persist(next);
  }

  function promoteToPortfolio(symbol: string) {
    const stock = STOCKS[symbol];
    if (!stock) return;
    const live = prices[symbol]?.price ?? stock.price;
    const avgPrice = live > 0 ? live : stock.price;
    const suggestedShares = avgPrice > 0 ? Math.max(1, Math.round(10000 / avgPrice)) : 1;
    addHolding({ symbol, shares: suggestedShares, avgPrice, addedDate: new Date().toISOString() });
    if (!isSmart) removeItem(symbol);
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

  const listConfigs = [
    { id: 'default',        label: 'Default',           icon: '★',  smart: false },
    { id: 'highConviction', label: 'High Conviction',   icon: '🔥', smart: false },
    { id: 'valueTraps',     label: 'Value Traps',       icon: '⚠️', smart: false },
    { id: 'earningsWatch',  label: 'Earnings Watch',    icon: '📊', smart: false },
    { id: 'smartHighScore', label: 'Smart: Score > 75', icon: '⚡', smart: true  },
  ];

  return (
    <div>
      {/* Watchlist tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(30,41,59,0.8)', paddingBottom: 10, flexWrap: 'wrap' }}>
        {listConfigs.map(cfg => (
          <button
            key={cfg.id}
            onClick={() => setActiveList(cfg.id)}
            style={{
              padding: '8px 14px',
              background: activeList === cfg.id ? 'rgba(212,175,55,0.15)' : 'transparent',
              border: activeList === cfg.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(30,41,59,0.8)',
              borderRadius: 6,
              color: activeList === cfg.id ? '#D4AF37' : '#64748B',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: activeList === cfg.id ? 700 : 400,
            }}
          >
            {cfg.icon} {cfg.label} {cfg.smart ? `(${items.length})` : `(${(lists[cfg.id] ?? []).length})`}
          </button>
        ))}
      </div>

      {/* Smart list banner */}
      {isSmart && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: '#22C55E' }}>
          ⚡ Auto-generated — all stocks where Rishi Consensus Score exceeds 75. Read-only. Use Promote to add to portfolio.
        </div>
      )}

      {/* Add + Sort controls (manual lists only) */}
      {!isSmart && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD SYMBOL</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <input value={addSymbol} onChange={e => setAddSymbol(e.target.value.toUpperCase())} placeholder="e.g. TCS" style={inputStyle} />
              <button onClick={addItem} style={btnGold}>+ Add</button>
            </div>
            {error && <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{error}</div>}
          </div>

          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>SORT</div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'added' | 'score' | 'change' | 'conviction')} style={inputStyle}>
              <option value="added">Recently Added</option>
              <option value="score">Rishi Score</option>
              <option value="conviction">Conviction Level</option>
              <option value="change">24h Change</option>
            </select>
          </div>

          <div style={{ fontSize: 12, color: '#64748B' }}>
            {loading ? 'Fetching live prices...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      )}

      {/* Sort for smart list */}
      {isSmart && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1 }}>SORT</div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'added' | 'score' | 'change' | 'conviction')} style={{ ...inputStyle, width: 200 }}>
            <option value="score">Rishi Score</option>
            <option value="change">24h Change</option>
          </select>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {loading ? 'Fetching...' : `${items.length} stocks`}
          </div>
        </div>
      )}

      {items.length === 0 && !isSmart && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>★</div>
          <div style={{ color: '#64748B', marginBottom: 16 }}>Your watchlist is empty. Add your first idea.</div>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Symbol</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Price</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>24h %</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Rishi Score</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Conviction</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Top Bull</th>
                {!isSmart && <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Catalyst</th>}
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(i => (
                <>
                  <tr key={i.symbol} style={{ borderBottom: expandedSymbol === i.symbol ? 'none' : '1px solid rgba(30,41,59,0.4)' }}>
                    <td style={{ padding: '12px 12px' }}>
                      <Link href={`/stock/${i.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace' }}>
                        {i.symbol}
                      </Link>
                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{i.stock?.name ?? '—'}</div>
                    </td>

                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0' }}>
                      {(i.live ?? 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: changeColor(i.changePct ?? 0), fontWeight: 700 }}>
                      {(i.changePct ?? 0).toFixed(2)}%
                    </td>

                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: scoreColor(i.score ?? 0) }}>
                        {i.score ?? 0}
                      </span>
                    </td>

                    <td style={{ padding: '12px 12px', minWidth: 180 }}>
                      {!isSmart ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              value={i.userConviction}
                              onChange={e => updateField(i.symbol, 'conviction', Number(e.target.value))}
                              style={{ flex: 1, accentColor: convictionColor(i.combinedConviction) }}
                            />
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: convictionColor(i.combinedConviction), minWidth: 16 }}>
                              {i.combinedConviction}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: convictionColor(i.combinedConviction) }}>
                            {convictionLabel(i.combinedConviction)} · You: {i.userConviction} · Rishi: {i.rishiConviction}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: convictionColor(i.rishiConviction) }}>
                            {i.rishiConviction}/10
                          </span>
                          <div style={{ fontSize: 10, color: convictionColor(i.rishiConviction), marginTop: 2 }}>
                            {convictionLabel(i.rishiConviction)}
                          </div>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 12px', fontSize: 11, color: '#22C55E' }}>
                      {i.topBull}
                    </td>

                    {!isSmart && (
                      <td style={{ padding: '12px 12px', minWidth: 200 }}>
                        <input
                          value={i.catalyst ?? ''}
                          onChange={e => updateField(i.symbol, 'catalyst', e.target.value)}
                          placeholder="Expected catalyst..."
                          style={{ ...inputStyle, fontSize: 11 }}
                        />
                      </td>
                    )}

                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          onClick={() => promoteToPortfolio(i.symbol)}
                          style={btnGold}
                          title="Add suggested shares to portfolio at LTP"
                        >
                          Promote →
                        </button>
                        {!isSmart && (
                          <>
                            <button
                              onClick={() => setExpandedSymbol(expandedSymbol === i.symbol ? null : i.symbol)}
                              style={{ background: 'none', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 4, color: '#64748B', cursor: 'pointer', fontSize: 11, padding: '4px 8px' }}
                              title="Expand thesis"
                            >
                              {expandedSymbol === i.symbol ? '▲' : '▼'}
                            </button>
                            <button
                              onClick={() => removeItem(i.symbol)}
                              style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded thesis row */}
                  {!isSmart && expandedSymbol === i.symbol && (
                    <tr key={`${i.symbol}-thesis`} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)', background: 'rgba(15,23,42,0.4)' }}>
                      <td colSpan={8} style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>IDEA THESIS</div>
                        <textarea
                          value={i.notes ?? ''}
                          onChange={e => updateField(i.symbol, 'notes', e.target.value)}
                          placeholder="Write your thesis here — why you like this idea, key risks, timeline, target price..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(15,23,42,0.8)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            borderRadius: 6,
                            color: '#E2E8F0',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            resize: 'vertical',
                            lineHeight: 1.6,
                          }}
                        />
                        <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
                          Top Bull endorsement: <span style={{ color: '#22C55E', fontWeight: 700 }}>{i.topBull}</span> · Rishi Score: <span style={{ color: scoreColor(i.score), fontFamily: 'monospace', fontWeight: 800 }}>{i.score}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
            {isSmart
              ? 'Smart list auto-generated from all stocks with Rishi Score > 75. Promote adds 10,000 worth of shares at LTP.'
              : 'Conviction = avg of your slider (1–10) + Rishi-derived score. Promote adds 10,000 worth at LTP (min 1 share). ▼ expands idea thesis.'}
          </div>
        </div>
      )}
    </div>
  );
}