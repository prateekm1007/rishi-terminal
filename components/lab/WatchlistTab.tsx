'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { addHolding } from '@/lib/portfolio/index';
import { useLivePrices } from '@/hooks/useLivePrices';
import type { ConsensusResult } from '@/lib/consensus/types';

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
  return c >= 9 ? '#22C55E' : c >= 7 ? '#D4AF37' : c >= 5 ? '#94A3B8' : '#EF4444';
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALYST ENGINE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function getProbability(spread: number): { pct: number; label: string; color: string } {
  if (spread < 20) return { pct: 88, label: 'Strong Consensus', color: '#22C55E' };
  if (spread < 40) return { pct: 75, label: 'Mild Disagreement', color: '#D4AF37' };
  if (spread < 60) return { pct: 60, label: 'Moderate Disagreement', color: '#F59E0B' };
  return { pct: 45, label: 'Significant Disagreement', color: '#EF4444' };
}

function getTimeline(topBullName: string): { label: string; color: string } {
  const name = topBullName.toLowerCase();
  if (name.includes('graham') || name.includes('schloss') || name.includes('klarman')) {
    return { label: 'Short-term (0-3M)', color: '#22C55E' };
  }
  if (name.includes('lynch') || name.includes('greenblatt')) {
    return { label: 'Medium-term (3-12M)', color: '#D4AF37' };
  }
  if (name.includes('jhunjhunwala') || name.includes('damani') || name.includes('kacholia')) {
    return { label: 'Long-term (12-36M)', color: '#8B5CF6' };
  }
  return { label: 'Long-term (6-24M)', color: '#3B82F6' };
}

function getCatalystTypes(consensus: ConsensusResult): string[] {
  const types: string[] = [];
  const topBull = consensus.topBull;
  
  // Analyze top bull's component weights
  const comps = topBull.comps || [];
  const labels = comps.map(c => c.label.toLowerCase());
  
  if (labels.some(l => l.includes('roe') || l.includes('moat') || l.includes('roce'))) types.push('Quality/Moat');
  if (labels.some(l => l.includes('growth') || l.includes('cagr') || l.includes('revenue'))) types.push('Growth');
  if (labels.some(l => l.includes('p/e') || l.includes('p/b') || l.includes('ncav') || l.includes('discount'))) types.push('Value');
  if (labels.some(l => l.includes('promoter') || l.includes('management') || l.includes('governance'))) types.push('Governance');
  if (labels.some(l => l.includes('debt') || l.includes('fcf') || l.includes('cash'))) types.push('Financial Strength');
  
  return types.length > 0 ? types : ['General'];
}

function getActionVerdict(score: number, spread: number): { text: string; color: string } {
  if (score >= 75 && spread < 40) return { text: 'High Conviction Buy', color: '#22C55E' };
  if (score >= 65 && spread < 40) return { text: 'Accumulate on Dips', color: '#D4AF37' };
  if (score >= 55 && spread < 30) return { text: 'Monitor Closely', color: '#3B82F6' };
  if (spread > 60) return { text: 'Wait for Clarity — High Disagreement', color: '#EF4444' };
  return { text: 'Cautious — Below Conviction Threshold', color: '#64748B' };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

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
  const [promoteDialog, setPromoteDialog] = useState<PromoteDialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function persist(updatedLists: Record<string, WatchlistItem[]>) {
    setLists(updatedLists);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists: updatedLists, activeList }));
    } catch {}
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
        .map(sym => ({ symbol: sym, addedDate: '', notes: '', conviction: 0 }));
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
      return { ...i, stock, live, changePct, score, topBull, rishiConviction, userConviction, combinedConviction, consensus };
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
    const next = { ...lists, [activeList]: [{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, notes: '' }, ...items] };
    persist(next);
    setSearchQuery('');
    setShowDropdown(false);
    setAddSymbol('');
  }

  function removeItem(symbol: string) {
    const next = { ...lists, [activeList]: items.filter(i => i.symbol !== symbol) };
    persist(next);
  }

  function updateField(symbol: string, field: keyof WatchlistItem, value: string | number) {
    const next = { ...lists, [activeList]: items.map(i => i.symbol === symbol ? { ...i, [field]: value } : i) };
    persist(next);
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
    if (!keepInWatchlist && !isSmart) removeItem(symbol);
    setPromoteDialog(null);
    showToast(`✅ Added ${finalShares} share${finalShares !== 1 ? 's' : ''} of ${symbol} to Holdings at ${avgPrice.toLocaleString('en-IN')}`);
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
    <div style={{ position: 'relative' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '14px 20px',
          background: 'rgba(15,23,42,0.97)',
          border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 10,
          color: '#22C55E',
          fontSize: 13,
          fontFamily: 'monospace',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          maxWidth: 380,
        }}>
          {toast}
        </div>
      )}

      {/* Promote Dialog Modal */}
      {promoteDialog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setPromoteDialog(null)}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: 12,
              padding: 28,
              minWidth: 360,
              maxWidth: 440,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: '#D4AF37', marginBottom: 4, fontFamily: 'monospace' }}>
              Promote {promoteDialog.symbol} → Holdings
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 20 }}>
              {STOCKS[promoteDialog.symbol]?.name ?? ''}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, background: 'rgba(30,41,59,0.6)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>LTP (LIVE PRICE)</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#E2E8F0' }}>
                  {promoteDialog.avgPrice.toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ padding: 12, background: 'rgba(30,41,59,0.6)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>TOTAL VALUE</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color: '#D4AF37' }}>
                  {(promoteDialog.shares * promoteDialog.avgPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>
                NUMBER OF SHARES (suggested: {promoteDialog.suggestedShares} ≈ 10,000)
              </div>
              <input
                type="number"
                min={1}
                value={promoteDialog.shares}
                onChange={e => setPromoteDialog({ ...promoteDialog, shares: Math.max(1, Number(e.target.value)) })}
                style={{ ...inputStyle, fontSize: 18, fontWeight: 900, textAlign: 'center' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[5000, 10000, 25000, 50000, 100000].map(amt => {
                const qty = Math.max(1, Math.round(amt / promoteDialog.avgPrice));
                return (
                  <button
                    key={amt}
                    onClick={() => setPromoteDialog({ ...promoteDialog, shares: qty })}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(30,41,59,0.6)',
                      border: '1px solid rgba(30,41,59,0.8)',
                      borderRadius: 6,
                      color: '#94A3B8',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    {amt >= 100000 ? '1L' : amt >= 1000 ? `${amt/1000}k` : amt} ({qty} sh)
                  </button>
                );
              })}
            </div>

            {!isSmart && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="keepInWatchlist"
                  checked={promoteDialog.keepInWatchlist}
                  onChange={e => setPromoteDialog({ ...promoteDialog, keepInWatchlist: e.target.checked })}
                  style={{ accentColor: '#D4AF37', width: 16, height: 16 }}
                />
                <label htmlFor="keepInWatchlist" style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer' }}>
                  Keep in watchlist after promoting
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={confirmPromote}
                style={{ ...btnGold, flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
              >
                ✓ CONFIRM PROMOTE
              </button>
              <button
                onClick={() => setPromoteDialog(null)}
                style={{ padding: '12px 16px', background: 'transparent', border: '1px solid rgba(30,41,59,0.8)', borderRadius: 6, color: '#64748B', fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {isSmart && (
        <div style={{ padding: '10px 16px', marginBottom: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: '#22C55E' }}>
          ⚡ Auto-generated — all stocks where Rishi Consensus Score exceeds 75. Read-only. Use Promote to add to portfolio.
        </div>
      )}

      {!isSmart && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD SYMBOL (type to search)</div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    value={searchQuery}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setSearchQuery(val);
                      setShowDropdown(val.trim().length > 0);
                      setAddSymbol(val);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addItem();
                      if (e.key === 'Escape') setShowDropdown(false);
                    }}
                    onFocus={() => searchQuery.trim().length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                    placeholder="Type symbol / name / sector… (e.g., TCS, Reliance, IT)"
                    style={inputStyle}
                  />

                  {showDropdown && searchQuery.trim().length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      maxHeight: 280,
                      overflowY: 'auto',
                      background: 'rgba(15,23,42,0.98)',
                      border: '1px solid rgba(212,175,55,0.4)',
                      borderRadius: 6,
                      zIndex: 1000,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}>
                      {Object.keys(STOCKS)
                        .filter(sym => {
                          const stock = STOCKS[sym];
                          const q = searchQuery.toLowerCase();
                          return (
                            sym.toLowerCase().includes(q) ||
                            stock.name.toLowerCase().includes(q) ||
                            stock.sector.toLowerCase().includes(q)
                          );
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
                                const next = {
                                  ...lists,
                                  [activeList]: [{ symbol: sym, addedDate: new Date().toISOString(), conviction: 5, notes: '' }, ...items],
                                };
                                persist(next);
                                setSearchQuery('');
                                setAddSymbol('');
                                setShowDropdown(false);
                                showToast(`✅ Added ${sym} to watchlist`);
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                                background: 'transparent',
                                borderBottom: '1px solid rgba(30,41,59,0.4)',
                                opacity: alreadyAdded ? 0.45 : 1,
                              }}
                              onMouseEnter={e => !alreadyAdded && (e.currentTarget.style.background = 'rgba(212,175,55,0.10)')}
                              onMouseLeave={e => !alreadyAdded && (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <div>
                                  <div style={{ fontFamily: 'monospace', fontWeight: 800, color: alreadyAdded ? '#64748B' : '#D4AF37', fontSize: 13 }}>
                                    {sym}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                                    {stock.name} · {stock.sector}
                                  </div>
                                </div>
                                {alreadyAdded && <div style={{ fontSize: 10, color: '#64748B' }}>Already added</div>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                <button onClick={addItem} style={btnGold}>+ Add</button>
              </div>
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
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>STOCK</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>PRICE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>24H %</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>RISHI SCORE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>CONVICTION</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>TOP BULL</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: 600 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(i => {
                const c = i.consensus;
                const prob = c ? getProbability(c.tensionSpread) : null;
                const timeline = c ? getTimeline(c.topBull.full) : null;
                const types = c ? getCatalystTypes(c) : [];
                const verdict = c ? getActionVerdict(c.consensus, c.tensionSpread) : null;

                return (
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
                        {(i.changePct ?? 0) >= 0 ? '+' : ''}{(i.changePct ?? 0).toFixed(2)}%
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
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            onClick={() => openPromoteDialog(i.symbol)}
                            style={btnGold}
                            title="Promote to Holdings"
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

                    {/* Expanded row with Thesis + Catalyst Engine */}
                    {!isSmart && expandedSymbol === i.symbol && c && (
                      <tr key={`${i.symbol}-expanded`} style={{ borderBottom: '1px solid rgba(30,41,59,0.4)', background: 'rgba(15,23,42,0.4)' }}>
                        <td colSpan={7} style={{ padding: '20px 16px' }}>
                          
                          {/* Thesis Section */}
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>INVESTMENT THESIS</div>
                            <textarea
                              value={i.notes ?? ''}
                              onChange={e => updateField(i.symbol, 'notes', e.target.value)}
                              placeholder="Write your thesis — why you like this idea, key risks, timeline, target price..."
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
                          </div>

                          {/* Catalyst Engine */}
                          <div style={{ border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: 16, background: 'rgba(30,41,59,0.3)' }}>
                            
                            {/* Header */}
                            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(30,41,59,0.6)' }}>
                              <div style={{ fontSize: 13, fontWeight: 900, color: '#D4AF37', marginBottom: 8, letterSpacing: 1 }}>
                                🔮 RISHI CATALYST ENGINE
                              </div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Probability */}
                                {prob && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ fontSize: 10, color: '#64748B' }}>CONSENSUS:</div>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: prob.color }}>
                                      {prob.pct}%
                                    </div>
                                    <div style={{ fontSize: 10, color: prob.color }}>({prob.label})</div>
                                  </div>
                                )}
                                {/* Timeline */}
                                {timeline && (
                                  <div style={{ padding: '4px 10px', background: 'rgba(30,41,59,0.6)', borderRadius: 6, border: `1px solid ${timeline.color}40` }}>
                                    <div style={{ fontSize: 10, color: timeline.color, fontWeight: 700 }}>{timeline.label}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Catalyst Types */}
                            {types.length > 0 && (
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>CATALYST TYPES:</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {types.map(t => (
                                    <div key={t} style={{ padding: '4px 8px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 4, fontSize: 10, color: '#D4AF37' }}>
                                      {t}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Top Bulls (positions 1-3) */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 8, letterSpacing: 1 }}>BULL PERSPECTIVES</div>
                              <div style={{ display: 'grid', gap: 10 }}>
                                {c.scores.slice(0, 3).map((r, idx) => {
                                  const topComp = r.comps && r.comps.length > 0 ? r.comps.sort((a, b) => b.wt - a.wt)[0] : null;
                                  return (
                                    <div key={r.full} style={{ padding: 12, background: 'rgba(15,23,42,0.6)', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>
                                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {r.full}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748B' }}>({r.label})</div>
                                        <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: scoreColor(r.score) }}>
                                          {r.score}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5, marginBottom: 6 }}>
                                        {r.insight}
                                      </div>
                                      {topComp && (
                                        <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>
                                          Key: {topComp.label} ({topComp.v}/100) — {topComp.detail}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Bear Risks (bottom 2) */}
                            {c.scores.length > 3 && (
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 8, letterSpacing: 1 }}>RISK PERSPECTIVES (BEARS)</div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                  {c.scores.slice(-2).reverse().map(r => (
                                    <div key={r.full} style={{ padding: 10, background: 'rgba(239,68,68,0.05)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>
                                          ⚠️ {r.full}
                                        </div>
                                        <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#EF4444' }}>
                                          {r.score}
                                        </div>
                                      </div>
                                      <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.4 }}>
                                        {r.insight}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Verdict */}
                            {verdict && (
                              <div style={{ padding: 14, background: 'rgba(30,41,59,0.6)', borderRadius: 8, border: `1px solid ${verdict.color}40` }}>
                                <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>RISHI COUNCIL VERDICT:</div>
                                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: verdict.color, letterSpacing: 0.5 }}>
                                  {verdict.text}
                                </div>
                              </div>
                            )}

                          </div>

                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
            {isSmart
              ? 'Smart list auto-generated. Promote opens dialog to set share quantity.'
              : 'Conviction = avg of your slider + Rishi score. ▼ expands full thesis + Rishi Catalyst Engine.'}
          </div>
        </div>
      )}
    </div>
  );
}
