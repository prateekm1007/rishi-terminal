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
}

const STORAGE_KEY = 'rishi_watchlist_v3';

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(changePct: number): string {
  return changePct > 0 ? '#22C55E' : changePct < 0 ? '#EF4444' : '#64748B';
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
  const [sortBy, setSortBy] = useState<'added' | 'score' | 'change'>('added');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLists(parsed.lists ?? { default: [], highConviction: [], valueTraps: [], earningsWatch: [] });
        setActiveList(parsed.activeList ?? 'default');
      } else {
        // Migrate from v2 (single array)
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

  const items = lists[activeList] ?? [];
  const symbols = useMemo(() => items.map(i => i.symbol), [items]);
  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return items.map(i => {
      const stock = STOCKS[i.symbol];
      const live = prices[i.symbol]?.price ?? (stock?.price ?? 0);
      const changePct = prices[i.symbol]?.changePercent24h ?? 0;
      const consensus = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;

      return { ...i, stock, live, changePct, score };
    });
  }, [items, prices]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sortBy === 'added') {
      arr.sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
    } else if (sortBy === 'score') {
      arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
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

    const next = { ...lists, [activeList]: [{ symbol: sym, addedDate: new Date().toISOString() }, ...items] };
    persist(next);
  }

  function removeItem(symbol: string) {
    const next = { ...lists, [activeList]: items.filter(i => i.symbol !== symbol) };
    persist(next);
  }

  function updateNotes(symbol: string, notes: string) {
    const next = { ...lists, [activeList]: items.map(i => i.symbol === symbol ? { ...i, notes } : i) };
    persist(next);
  }

  function promoteToPortfolio(symbol: string) {
    const stock = STOCKS[symbol];
    if (!stock) return;

    const live = prices[symbol]?.price ?? stock.price;
    const avgPrice = live > 0 ? live : stock.price;

    addHolding({
      symbol,
      shares: 1,
      avgPrice,
      addedDate: new Date().toISOString(),
    });

    // Optional: remove from watchlist after promotion
    removeItem(symbol);
  }

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

  const listConfigs = [
    { id: 'default', label: 'Default', icon: '★' },
    { id: 'highConviction', label: 'High Conviction', icon: '🔥' },
    { id: 'valueTraps', label: 'Value Traps', icon: '⚠️' },
    { id: 'earningsWatch', label: 'Earnings Watch', icon: '📊' },
  ];

  return (
    <div>
      {/* Watchlist tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid rgba(30,41,59,0.8)', paddingBottom: 10 }}>
        {listConfigs.map(cfg => (
          <button
            key={cfg.id}
            onClick={() => setActiveList(cfg.id)}
            style={{
              padding: '8px 16px',
              background: activeList === cfg.id ? 'rgba(212,175,55,0.15)' : 'transparent',
              border: activeList === cfg.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(30,41,59,0.8)',
              borderRadius: 6,
              color: activeList === cfg.id ? '#D4AF37' : '#64748B',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: activeList === cfg.id ? 700 : 400,
            }}
          >
            {cfg.icon} {cfg.label} ({(lists[cfg.id] ?? []).length})
          </button>
        ))}
      </div>

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
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={inputStyle}>
            <option value="added">Recently Added</option>
            <option value="score">Rishi Score</option>
            <option value="change">24h Change</option>
          </select>
        </div>

        <div style={{ fontSize: 12, color: '#64748B' }}>
          {loading ? 'Fetching live prices...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {items.length === 0 && (
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
                {['Symbol', 'Price', '24h %', 'Rishi Score', 'Notes', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(i => (
                <tr key={i.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
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

                  <td style={{ padding: '12px 12px', minWidth: 260 }}>
                    <input
                      value={i.notes ?? ''}
                      onChange={e => updateNotes(i.symbol, e.target.value)}
                      placeholder="Thesis / catalyst / risk..."
                      style={inputStyle}
                    />
                  </td>

                  <td style={{ padding: '12px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={() => promoteToPortfolio(i.symbol)} style={btnGold} title="Add 1 share to portfolio at LTP and remove from watchlist">
                      Promote → Holdings
                    </button>
                    <button onClick={() => removeItem(i.symbol)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }} title="Remove">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
            Promote uses: <span style={{ fontFamily: 'monospace' }}>shares=1</span> at current live price (fallback: stock.price).
          </div>
        </div>
      )}
    </div>
  );
}