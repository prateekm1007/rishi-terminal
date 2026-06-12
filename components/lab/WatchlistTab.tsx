'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { addHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';
import { useLanguage } from '../../lib/language';
import type { ConsensusResult } from '@/lib/consensus/types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface WatchlistItem {
  symbol: string;
  addedDate: string;
  notes?: string;
  conviction?: number;
}

interface PromoteDialog {
  symbol: string;
  avgPrice: number;
  suggestedShares: number;
  shares: number;
  keepInWatchlist: boolean;
}

const STORAGE_KEY = 'rishi_watchlist_v3';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(v: number): string {
  return v > 0 ? '#22C55E' : v < 0 ? '#EF4444' : '#64748B';
}

function convictionLabel(c: number): string {
  return c >= 9 ? 'Max Conviction' : c >= 7 ? 'High' : c >= 5 ? 'Moderate' : c >= 3 ? 'Low' : 'Speculative';
}

function convictionColor(c: number): string {
  return c >= 9 ? '#22C55E' : c >= 7 ? '#D4AF37' : c >= 5 ? '#94A3B8' : '#EF4444';
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function WatchlistTab() {
  const { t } = useLanguage();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [addSymbol, setAddSymbol] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'added' | 'score' | 'change' | 'conviction'>('added');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [promoteDialog, setPromoteDialog] = useState<PromoteDialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const list = parsed.lists?.default ?? parsed.items ?? [];
        setItems(Array.isArray(list) ? list : []);
      } else {
        const oldRaw = localStorage.getItem('rishi_watchlist_v2');
        if (oldRaw) {
          const old = JSON.parse(oldRaw);
          setItems(Array.isArray(old) ? old : []);
        }
      }
    } catch {
      setItems([]);
    }
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function persist(next: WatchlistItem[]) {
    setItems(next);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists: { default: next }, activeList: 'default' }));
    } catch {}
  }

  const symbols = useMemo(() => items.map(i => i.symbol), [items]);
  const { prices, loading } = useLivePrices(symbols);

  const enriched = useMemo(() => {
    return items.map(i => {
      const stock = STOCKS[i.symbol];
      const live = prices[i.symbol]?.price ?? (stock?.price ?? 0);
      const changePct = prices[i.symbol]?.changePercent24h ?? 0;
      const consensus: ConsensusResult | null = stock ? buildConsensus(stock) : null;
      const score = consensus?.consensus ?? 0;
      const topBull = consensus?.topBull?.full ?? '—';
      const rishiConviction = score >= 75 ? 9 : score >= 65 ? 7 : score >= 55 ? 5 : score >= 45 ? 3 : 1;
      const userConviction = i.conviction ?? 5;
      const combinedConviction = Math.round((rishiConviction + userConviction) / 2);
      return { ...i, stock, live, changePct, score, topBull, rishiConviction, userConviction, combinedConviction, consensus };
    });
  }, [items, prices]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sortBy === 'added') arr.sort((a, b) => (b.addedDate || '').localeCompare(a.addedDate || ''));
    else if (sortBy === 'score') arr.sort((a, b) => b.score - a.score);
    else if (sortBy === 'conviction') arr.sort((a, b) => b.combinedConviction - a.combinedConviction);
    else arr.sort((a, b) => b.changePct - a.changePct);
    return arr;
  }, [enriched, sortBy]);

  function addItem() {
    setError('');
    const sym = addSymbol.trim().toUpperCase();
    if (!sym) { setError('Enter a symbol'); return; }
    if (!STOCKS[sym]) { setError('Symbol not in database'); return; }
    if (items.some(x => x.symbol === sym)) { setError('Already in watchlist'); return; }
    persist([{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, notes: '' }, ...items]);
    setSearchQuery(''); setAddSymbol(''); setShowDropdown(false);
  }

  function removeItem(symbol: string) {
    persist(items.filter(i => i.symbol !== symbol));
  }

  function updateField(symbol: string, field: keyof WatchlistItem, value: string | number) {
    persist(items.map(i => i.symbol === symbol ? { ...i, [field]: value } : i));
  }

  function openPromoteDialog(symbol: string) {
    const stock = STOCKS[symbol];
    if (!stock) return;
    const live = prices[symbol]?.price ?? stock.price;
    const avgPrice = live > 0 ? live : stock.price;
    const suggestedShares = avgPrice > 0 ? Math.max(1, Math.round(10000 / avgPrice)) : 1;
    setPromoteDialog({ symbol, avgPrice, suggestedShares, shares: suggestedShares, keepInWatchlist: false });
  }

  function confirmPromote() {
    if (!promoteDialog) return;
    const { symbol, avgPrice, shares, keepInWatchlist } = promoteDialog;
    const finalShares = Math.max(1, shares);
    addHolding({ symbol, shares: finalShares, avgPrice, addedDate: new Date().toISOString() });
    if (!keepInWatchlist) removeItem(symbol);
    setPromoteDialog(null);
    showToast(`✅ Added ${finalShares} shares of ${symbol} to Holdings`);
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

  return (
    <div style={{ position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '14px 20px', background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 10, color: '#22C55E', fontSize: 13, fontFamily: 'monospace', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', maxWidth: 400 }}>
          {toast}
        </div>
      )}

      {/* Promote Dialog */}
      {promoteDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPromoteDialog(null)}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 12, padding: 28, minWidth: 360, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#D4AF37', marginBottom: 4, fontFamily: 'monospace' }}>
              {t('lab.promoteDialog.promote')} {promoteDialog.symbol} → {t('lab.promoteDialog.holdings')}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 20 }}>{STOCKS[promoteDialog.symbol]?.name ?? ''}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'rgba(30,41,59,0.6)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>LTP</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#E2E8F0' }}>{promoteDialog.avgPrice.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ padding: 12, background: 'rgba(30,41,59,0.6)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>TOTAL</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#D4AF37' }}>{(promoteDialog.shares * promoteDialog.avgPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>
                {t('lab.promoteDialog.shares')} ({t('lab.promoteDialog.suggested')}: {promoteDialog.suggestedShares} ≈ 10,000)
              </div>
              <input type="number" min={1} value={promoteDialog.shares} onChange={e => setPromoteDialog({ ...promoteDialog, shares: Math.max(1, Number(e.target.value)) })} style={{ ...inputStyle, fontSize: 18, fontWeight: 900, textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[5000, 10000, 25000, 50000, 100000].map(amt => {
                const qty = Math.max(1, Math.round(amt / promoteDialog.avgPrice));
                return (
                  <button key={amt} onClick={() => setPromoteDialog({ ...promoteDialog, shares: qty })} style={{ padding: '6px 10px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: '#94A3B8', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
                    {amt >= 100000 ? '1L' : `${amt / 1000}k`} ({qty}sh)
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <input type="checkbox" id="keepInWl" checked={promoteDialog.keepInWatchlist} onChange={e => setPromoteDialog({ ...promoteDialog, keepInWatchlist: e.target.checked })} style={{ accentColor: '#D4AF37', width: 16, height: 16 }} />
              <label htmlFor="keepInWl" style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer' }}>{t('lab.promoteDialog.keepInWatchlist')}</label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmPromote} style={{ ...btnGold, flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>{t('lab.promoteDialog.confirm')}</button>
              <button onClick={() => setPromoteDialog(null)} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: '#64748B', fontSize: 12, cursor: 'pointer' }}>{t('lab.promoteDialog.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add + Sort Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD TO WATCHLIST</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => { const v = e.target.value.toUpperCase(); setSearchQuery(v); setShowDropdown(v.trim().length > 0); setAddSymbol(v); }}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setShowDropdown(false); }}
                onFocus={() => searchQuery.trim().length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                placeholder="Type symbol or name…"
                style={inputStyle}
              />
              {showDropdown && searchQuery.trim().length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 280, overflowY: 'auto', background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 6, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  {Object.keys(STOCKS)
                    .filter(sym => {
                      const s = STOCKS[sym];
                      const q = searchQuery.toLowerCase();
                      return sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
                    })
                    .slice(0, 20)
                    .map(sym => {
                      const stock = STOCKS[sym];
                      const alreadyAdded = items.some(x => x.symbol === sym);
                      return (
                        <div
                          key={sym}
                          onClick={() => {
                            if (alreadyAdded) return;
                            persist([{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, notes: '' }, ...items]);
                            setSearchQuery(''); setAddSymbol(''); setShowDropdown(false);
                            showToast(`✅ Added ${sym} to watchlist`);
                          }}
                          style={{ padding: '10px 12px', cursor: alreadyAdded ? 'not-allowed' : 'pointer', borderBottom: '1px solid rgba(30,41,59,0.4)', opacity: alreadyAdded ? 0.45 : 1 }}
                          onMouseEnter={e => !alreadyAdded && (e.currentTarget.style.background = 'rgba(212,175,55,0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: alreadyAdded ? '#64748B' : '#D4AF37', fontSize: 13 }}>{sym}</div>
                              <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{stock.name} · {stock.sector}</div>
                            </div>
                            {alreadyAdded && <div style={{ fontSize: 10, color: '#64748B' }}>Already added</div>}
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(STOCKS).filter(sym => {
                    const s = STOCKS[sym];
                    const q = searchQuery.toLowerCase();
                    return sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
                  }).length === 0 && (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: '#64748B', fontSize: 12 }}>No stocks found matching "{searchQuery}"</div>
                  )}
                </div>
              )}
            </div>
            <button onClick={addItem} style={btnGold}>+ Add</button>
          </div>
          {error && <div style={{ marginTop: 8, fontSize: 12, color: '#EF4444' }}>{error}</div>}
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>SORT</div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={inputStyle}>
            <option value="added">{t('lab.sort.recentlyAdded')}</option>
            <option value="score">{t('lab.sort.rishiScore')}</option>
            <option value="conviction">{t('lab.sort.convictionLevel')}</option>
            <option value="change">{t('lab.sort.change24h')}</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: '#64748B', alignSelf: 'flex-end', paddingBottom: 2 }}>
          {loading ? 'Fetching prices…' : `${items.length} stock${items.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px dashed rgba(212,175,55,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>★</div>
          <div style={{ color: '#64748B', marginBottom: 8 }}>Your watchlist is empty.</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Type a symbol above to add your first idea.</div>
        </div>
      )}

      {/* Stock Table */}
      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>STOCK</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>PRICE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>24H %</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>{t('lab.scoreHeader')}</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>CONVICTION</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>TOP BULL</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#475569', letterSpacing: 1, fontWeight: 700 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(i => {
                const isExpanded = expandedSymbol === i.symbol;
                return (
                  <Fragment key={i.symbol}>
                    <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(30,41,59,0.4)', background: isExpanded ? 'rgba(212,175,55,0.04)' : 'transparent' }}>
                      <td style={{ padding: '12px 12px' }}>
                        <Link href={`/stock/${i.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 800, fontFamily: 'monospace', fontSize: 13 }}>{i.symbol}</Link>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{i.stock?.name ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: '#E2E8F0', fontWeight: 700 }}>{(i.live ?? 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', color: changeColor(i.changePct ?? 0), fontWeight: 700 }}>
                        {(i.changePct ?? 0) >= 0 ? '+' : ''}{(i.changePct ?? 0).toFixed(2)}%
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: scoreColor(i.score) }}>{i.score}</div>
                        <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>{i.consensus?.category ?? '—'}</div>
                      </td>
                      <td style={{ padding: '12px 12px', minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <input
                            type="range" min={1} max={10}
                            value={i.userConviction}
                            onChange={e => updateField(i.symbol, 'conviction', Number(e.target.value))}
                            style={{ flex: 1, accentColor: convictionColor(i.combinedConviction) }}
                          />
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: convictionColor(i.combinedConviction), minWidth: 18 }}>{i.combinedConviction}</span>
                        </div>
                        <div style={{ fontSize: 9, color: convictionColor(i.combinedConviction) }}>
                          {convictionLabel(i.combinedConviction)} · You: {i.userConviction} · Rishi: {i.rishiConviction}
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: 11, color: '#22C55E', fontWeight: 700 }}>{i.topBull}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button onClick={() => openPromoteDialog(i.symbol)} style={btnGold}>{t('lab.promoteButton')}</button>
                          <button
                            onClick={() => setExpandedSymbol(isExpanded ? null : i.symbol)}
                            style={{ background: isExpanded ? 'rgba(212,175,55,0.12)' : 'none', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 4, color: isExpanded ? '#D4AF37' : '#64748B', cursor: 'pointer', fontSize: 11, padding: '4px 8px' }}
                          >
                            {isExpanded ? '▲ Hide' : '▼ Thesis'}
                          </button>
                          <button onClick={() => removeItem(i.symbol)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14 }} title={t('lab.remove')}>✕</button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${i.symbol}-detail`} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                        <td colSpan={7} style={{ padding: '20px 16px 24px', background: 'rgba(15,23,42,0.3)' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#475569', marginBottom: 8 }}>INVESTMENT THESIS</div>
                          <textarea
                            value={i.notes ?? ''}
                            onChange={e => updateField(i.symbol, 'notes', e.target.value)}
                            placeholder="Write your thesis — why you like this idea, key risks, timeline, target price…"
                            rows={4}
                            style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 6, color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>{t('lab.conviction.description')}</div>
        </div>
      )}
    </div>
  );
}