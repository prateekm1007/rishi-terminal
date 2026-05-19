'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STOCKS } from '../../data/stocks';
import { buildConsensus } from '../../lib/consensus';
import { useLanguage } from '../../lib/language';
import { useLivePrices } from '../../hooks/useLivePrices';

interface WatchlistItem {
  symbol: string;
  addedDate: string;
  notes?: string;
  targetPrice?: number;
  alertEnabled?: boolean;
}

function scoreColor(s: number) {
  return s >= 75 ? 'var(--accent-green)' : s >= 55 ? 'var(--accent-gold)' : 'var(--accent-red)';
}

function priceChangeColor(change: number) {
  return change > 0 ? 'var(--accent-green)' : change < 0 ? 'var(--accent-red)' : 'var(--text-muted)';
}

export default function WatchlistPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [addSymbol, setAddSymbol] = useState('TCS');
  const [editNote, setEditNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'score' | 'change'>('added');

  const allSymbols = Object.keys(STOCKS);

  const SORT_LABELS = useMemo(() => ({
    added:  t('watchlist.sortRecent'),
    score:  t('watchlist.sortScore'),
    change: t('watchlist.sortChange'),
  }), [t, locale]);

  useEffect(() => {
    const saved = localStorage.getItem('rishi_watchlist_v2');
    if (saved) {
      try { setWatchlist(JSON.parse(saved)); }
      catch { setWatchlist([]); }
    }
  }, []);

  const saveWatchlist = (list: WatchlistItem[]) => {
    localStorage.setItem('rishi_watchlist_v2', JSON.stringify(list));
    setWatchlist(list);
  };

  const addStock = () => {
    if (!allSymbols.includes(addSymbol)) return;
    if (watchlist.some(w => w.symbol === addSymbol)) return;
    saveWatchlist([...watchlist, { symbol: addSymbol, addedDate: new Date().toISOString() }]);
  };

  const removeStock = (symbol: string) => {
    saveWatchlist(watchlist.filter(w => w.symbol !== symbol));
  };

  const saveNote = (symbol: string) => {
    const updated = watchlist.map(w =>
      w.symbol === symbol ? { ...w, notes: noteText.trim() || undefined } : w
    );
    saveWatchlist(updated);
    setEditNote(null);
    setNoteText('');
  };

  // Extract symbols for live prices
  const watchSymbols = useMemo(() => watchlist.map(w => w.symbol), [watchlist]);
  const { prices, loading, lastUpdated } = useLivePrices(watchSymbols);

  // Enrich watchlist with live data
  const enrichedWatchlist = useMemo(() => {
    return watchlist.map(item => {
      const stock = STOCKS[item.symbol];
      const livePrice = prices[item.symbol]?.price ?? stock?.price;
      const change24h = prices[item.symbol]?.change ?? 0;
      const consensus = buildConsensus(stock).consensus;
      return { ...item, stock, livePrice, change24h, consensus };
    });
  }, [watchlist, prices]);

  const sorted = useMemo(() => {
    const items = [...enrichedWatchlist];
    if (sortBy === 'score') items.sort((a, b) => b.consensus - a.consensus);
    else if (sortBy === 'change') items.sort((a, b) => b.change24h - a.change24h);
    else items.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime());
    return items;
  }, [enrichedWatchlist, sortBy]);

  const exportCSV = () => {
    const rows = enrichedWatchlist.map(w => 
      `${w.symbol},${w.stock.name},${w.stock.sector},${w.livePrice},${w.consensus},${w.change24h},${w.notes || ''}`
    );
    const csv = ['Symbol,Name,Sector,Live Price,Rishi Score,24H Change %,Notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchlist-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('watchlist.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
                {t('watchlist.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('watchlist.subtitle')}
              </p>
              {lastUpdated && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 8 }}>
                  ΓÜí Live ΓÇó Updated {lastUpdated.toLocaleTimeString('en-IN')}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                WATCHED STOCKS
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {watchlist.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Real-time tracking
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Items', value: watchlist.length, color: 'var(--accent-gold)', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
              { label: 'Avg Score', value: enrichedWatchlist.length > 0 ? (enrichedWatchlist.reduce((s, w) => s + w.consensus, 0) / enrichedWatchlist.length).toFixed(0) : 'ΓÇö', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
            ].map(stat => (
              <div key={stat.label} style={{ background: stat.bg, border: '1px solid ' + stat.border, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        {/* Add Stock Form */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Enter stock symbol (e.g., TCS)"
            value={addSymbol}
            onChange={e => setAddSymbol(e.target.value.toUpperCase())}
            onKeyPress={e => e.key === 'Enter' && addStock()}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontFamily: 'monospace',
              flex: 1,
            }}
          />
          <button
            onClick={addStock}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--accent-gold)',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            ADD
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            EXPORT CSV
          </button>
        </div>

        {/* Sort Controls */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {Object.entries(SORT_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                background: sortBy === key ? 'var(--accent-gold)' : 'var(--bg-card)',
                color: sortBy === key ? '#000' : 'var(--text-muted)',
                border: sortBy === key ? 'none' : '1px solid var(--border-primary)',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Watchlist Table */}
        {watchlist.length > 0 ? (
          <div className="card-sacred" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                    {['SYMBOL', 'NAME', 'SECTOR', 'LIVE PRICE', '24H CHANGE', 'RISHI SCORE', 'NOTES', 'ACTION'].map(h => (
                      <th key={h} style={{
                        textAlign: 'right',
                        padding: '14px 24px',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        color: 'var(--text-muted)',
                        letterSpacing: 1,
                        fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item => (
                    <tr key={item.symbol} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, color: 'var(--accent-gold)', fontSize: 13 }}>
                        {item.symbol}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {item.stock.name}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-muted)', fontSize: 11 }}>
                        {item.stock.sector}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        {item.livePrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', fontWeight: 700, color: priceChangeColor(item.change24h) }}>
                        {item.change24h > 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, color: scoreColor(item.consensus) }}>
                        {item.consensus.toFixed(0)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-muted)', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.notes || 'ΓÇö'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <button
                          onClick={() => removeStock(item.symbol)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            background: 'rgba(239,68,68,0.1)',
                            color: 'var(--accent-red)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          REMOVE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 14 }}>
            No stocks in watchlist. Add one to get started!
          </div>
        )}
      </div>
    </main>
  );
}