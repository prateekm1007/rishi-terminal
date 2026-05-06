'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STOCKS } from '../../data/stocks';
import { buildConsensus } from '../../lib/consensus';

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

export default function WatchlistPage() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [addSymbol, setAddSymbol] = useState('TCS');
  const [editNote, setEditNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'score' | 'change'>('added');

  const allSymbols = Object.keys(STOCKS);

  useEffect(() => {
    const saved = localStorage.getItem('rishi_watchlist_v2');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  const saveWatchlist = (list: WatchlistItem[]) => {
    localStorage.setItem('rishi_watchlist_v2', JSON.stringify(list));
    setWatchlist(list);
  };

  const addStock = () => {
    if (!allSymbols.includes(addSymbol)) return;
    if (watchlist.some(w => w.symbol === addSymbol)) return;

    const newItem: WatchlistItem = {
      symbol: addSymbol,
      addedDate: new Date().toISOString(),
    };
    saveWatchlist([...watchlist, newItem]);
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

  const exportCSV = () => {
    const rows = watchlist.map(w => {
      const stock = STOCKS[w.symbol];
      const consensus = buildConsensus(stock).consensus;
      return `${w.symbol},${stock.name},${stock.sector},${stock.price},${consensus},${w.notes || ''}`;
    });
    const csv = ['Symbol,Name,Sector,Price,Rishi Score,Notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rishi_watchlist_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  };

  // Sort watchlist
  let sortedList = [...watchlist];
  if (sortBy === 'score') {
    sortedList.sort((a, b) => {
      const scoreA = buildConsensus(STOCKS[a.symbol]).consensus;
      const scoreB = buildConsensus(STOCKS[b.symbol]).consensus;
      return scoreB - scoreA;
    });
  } else if (sortBy === 'change') {
    sortedList.sort((a, b) => {
      const changeA = ((STOCKS[a.symbol].price - STOCKS[a.symbol].price * 0.98) / STOCKS[a.symbol].price) * 100;
      const changeB = ((STOCKS[b.symbol].price - STOCKS[b.symbol].price * 0.98) / STOCKS[b.symbol].price) * 100;
      return changeB - changeA;
    });
  }

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > WATCHLIST'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
                Watchlist
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                Track your favorite stocks with notes and price alerts
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '12px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>WATCHING</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-gold)' }}>
                  {watchlist.length}
                </div>
              </div>
            </div>
          </div>

          {/* Add Controls */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={addSymbol}
              onChange={e => setAddSymbol(e.target.value)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                borderRadius: 6, padding: '8px 14px', color: 'var(--text-primary)',
                fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
              }}
            >
              {allSymbols.map(s => (
                <option key={s} value={s}>{s} — {STOCKS[s].name}</option>
              ))}
            </select>

            <button
              onClick={addStock}
              style={{
                background: 'var(--accent-gold)', color: '#000',
                border: 'none', borderRadius: 6, padding: '8px 18px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              + Add to Watchlist
            </button>

            {watchlist.length > 0 && (
              <>
                <button
                  onClick={exportCSV}
                  style={{
                    background: 'var(--bg-card)', color: 'var(--accent-green)',
                    border: '1px solid var(--accent-green)', borderRadius: 6,
                    padding: '8px 18px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Export CSV
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {['added', 'score', 'change'].map(sort => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort as any)}
                      style={{
                        padding: '6px 12px', fontSize: 11, borderRadius: 4,
                        background: sortBy === sort ? 'var(--accent-gold)' : 'var(--bg-card)',
                        color: sortBy === sort ? '#000' : 'var(--text-muted)',
                        border: sortBy === sort ? 'none' : '1px solid var(--border-primary)',
                        cursor: 'pointer', fontFamily: 'monospace',
                      }}
                    >
                      {sort === 'added' ? 'Recent' : sort === 'score' ? 'Score' : 'Change'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        {watchlist.length === 0 ? (
          <div className="card-sacred" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 1 }}>
              NO STOCKS IN WATCHLIST
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Add stocks above to track their Rishi scores and set price alerts.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedList.map(item => {
              const stock = STOCKS[item.symbol];
              const consensus = buildConsensus(stock).consensus;
              const change1D = ((stock.price - stock.price * 0.98) / stock.price) * 100; // Simulated

              return (
                <div
                  key={item.symbol}
                  className="card-sacred"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => router.push(`/stock/${item.symbol}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                >
                  <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${scoreColor(consensus)}, transparent)` }} />

                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                          <span style={{ fontSize: 16, color: 'var(--accent-gold)', fontWeight: 700, fontFamily: 'monospace' }}>
                            {item.symbol}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{stock.name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {stock.sector} · Added {new Date(item.addedDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            Rs {stock.price.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: change1D >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {change1D >= 0 ? '+' : ''}{change1D.toFixed(2)}%
                          </div>
                        </div>

                        <div style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          background: scoreColor(consensus) + '15',
                          border: `1px solid ${scoreColor(consensus)}40`,
                        }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 2 }}>RISHI</div>
                          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: scoreColor(consensus) }}>
                            {consensus}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditNote(editNote === item.symbol ? null : item.symbol);
                              setNoteText(item.notes || '');
                            }}
                            style={{
                              background: 'var(--bg-secondary)', border: 'none',
                              borderRadius: 4, padding: '4px 8px', color: 'var(--text-muted)',
                              cursor: 'pointer', fontSize: 10,
                            }}
                          >
                            Note
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(`Remove ${item.symbol} from watchlist?`)) {
                                removeStock(item.symbol);
                              }
                            }}
                            style={{
                              background: 'transparent', border: '1px solid var(--accent-red)',
                              borderRadius: 4, padding: '4px 8px', color: 'var(--accent-red)',
                              cursor: 'pointer', fontSize: 10,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {item.notes && editNote !== item.symbol && (
                      <div style={{
                        marginTop: 12, fontSize: 11, color: 'var(--text-secondary)',
                        fontStyle: 'italic', padding: '10px 12px',
                        background: 'var(--bg-secondary)', borderRadius: 6,
                        borderLeft: '3px solid var(--accent-gold)',
                      }}>
                        {item.notes}
                      </div>
                    )}

                    {editNote === item.symbol && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <input
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add a note... (e.g., 'Buy below 3500')"
                          onClick={e => e.stopPropagation()}
                          style={{
                            flex: 1, background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)', borderRadius: 4,
                            padding: '8px 12px', color: 'var(--text-primary)',
                            fontSize: 11, fontFamily: 'inherit',
                          }}
                        />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            saveNote(item.symbol);
                          }}
                          style={{
                            background: 'var(--accent-green)', color: '#000',
                            border: 'none', borderRadius: 4, padding: '8px 16px',
                            cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}