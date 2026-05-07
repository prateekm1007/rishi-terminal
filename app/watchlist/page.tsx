'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STOCKS } from '../../data/stocks';
import { buildConsensus } from '../../lib/consensus';
import { useLanguage } from '../../lib/language';

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

  let sortedList = [...watchlist];
  if (sortBy === 'score') {
    sortedList.sort((a, b) =>
      buildConsensus(STOCKS[b.symbol]).consensus - buildConsensus(STOCKS[a.symbol]).consensus
    );
  } else if (sortBy === 'change') {
    sortedList.sort((a, b) => {
      const ca = ((STOCKS[a.symbol].price - STOCKS[a.symbol].price * 0.98) / STOCKS[a.symbol].price) * 100;
      const cb = ((STOCKS[b.symbol].price - STOCKS[b.symbol].price * 0.98) / STOCKS[b.symbol].price) * 100;
      return cb - ca;
    });
  }

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">

          {/* Breadcrumb */}
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>
              {t('header.title')}
            </Link>
            {' > '}{t('watchlist.title').toUpperCase()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
                {t('watchlist.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('watchlist.subtitle')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '12px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>
                  {t('watchlist.watching')}
                </div>
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
              + {t('watchlist.addToWatchlist')}
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
                  {t('watchlist.exportCSV')}
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {(['added', 'score', 'change'] as const).map(sort => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      style={{
                        padding: '6px 12px', fontSize: 11, borderRadius: 4,
                        background: sortBy === sort ? 'var(--accent-gold)' : 'var(--bg-card)',
                        color: sortBy === sort ? '#000' : 'var(--text-muted)',
                        border: sortBy === sort ? 'none' : '1px solid var(--border-primary)',
                        cursor: 'pointer', fontFamily: 'monospace',
                      }}
                    >
                      {SORT_LABELS[sort]}
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
              {t('watchlist.empty')}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              {t('watchlist.emptyHint')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedList.map(item => {
              const stock = STOCKS[item.symbol];
              const consensus = buildConsensus(stock).consensus;
              const change1D = ((stock.price - stock.price * 0.98) / stock.price) * 100;

              return (
                <div
                  key={item.symbol}
                  className="card-sacred"
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => router.push('/stock/' + item.symbol)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                >
                  <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, ' + scoreColor(consensus) + ', transparent)' }} />

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
                          {stock.sector} · {t('watchlist.added')} {new Date(item.addedDate).toLocaleDateString('en-IN')}
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
                          padding: '8px 16px', borderRadius: 6,
                          background: scoreColor(consensus) + '15',
                          border: '1px solid ' + scoreColor(consensus) + '40',
                        }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 2 }}>
                            {t('watchlist.rishiScore')}
                          </div>
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
                            {t('watchlist.note')}
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(t('watchlist.confirmRemove') + ' ' + item.symbol + '?')) {
                                removeStock(item.symbol);
                              }
                            }}
                            style={{
                              background: 'transparent', border: '1px solid var(--accent-red)',
                              borderRadius: 4, padding: '4px 8px', color: 'var(--accent-red)',
                              cursor: 'pointer', fontSize: 10,
                            }}
                          >
                            {t('watchlist.remove')}
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
                          placeholder={t('watchlist.notePlaceholder')}
                          onClick={e => e.stopPropagation()}
                          style={{
                            flex: 1, background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)', borderRadius: 4,
                            padding: '8px 12px', color: 'var(--text-primary)',
                            fontSize: 11, fontFamily: 'inherit',
                          }}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); saveNote(item.symbol); }}
                          style={{
                            background: 'var(--accent-green)', color: '#000',
                            border: 'none', borderRadius: 4, padding: '8px 16px',
                            cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          }}
                        >
                          {t('common.save')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
          paddingTop: 24, marginTop: 24, borderTop: '1px solid var(--border-primary)',
        }}>
          {t('dashboard.notInvestmentAdvice')}
        </div>
      </div>
    </main>
  );
}