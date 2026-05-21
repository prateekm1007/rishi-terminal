'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { STOCKS } from '@/data/stocks/index';
import { buildConsensus } from '@/lib/consensus';
import { useLivePrices } from '@/hooks/useLivePrices';
import { fetchHistoryPoints } from '@/components/lab/helpers';
import type { HistoryPoint } from '@/components/lab/helpers';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const STORAGE_KEY = 'rishi_compare_v2';
const RIVALRY_KEY = 'rishi_compare_rivalries_v1';
const MAX_STOCKS = 10;

type ViewMode = 'matrix' | 'philosophy' | 'heatmap' | 'radar' | 'historical';
type HistoricalTF = '1Y' | '3Y' | '5Y';

interface CompareState {
  symbols: string[];
  viewMode: ViewMode;
}

interface SavedRivalry {
  id: string;
  name: string;
  symbols: string[];
  savedAt: string;
}

// Pillar mapping: Rishi full name → pillar label
const PILLAR_MAP: Record<string, string> = {
  'Warren Buffett': 'Moat',
  'Benjamin Graham': 'Valuation',
  'Peter Lynch': 'Growth',
  'Charlie Munger': 'Governance',
  'George Soros': 'Sentiment',
  'Philip Fisher': 'Quality',
};

function scoreColor(s: number): string {
  return s >= 75 ? '#22C55E' : s >= 55 ? '#D4AF37' : '#EF4444';
}

function changeColor(v: number): string {
  return v > 0 ? '#22C55E' : v < 0 ? '#EF4444' : '#64748B';
}

function metricColor(val: number, lo: number, hi: number): string {
  return val >= hi ? '#22C55E' : val >= lo ? '#D4AF37' : '#EF4444';
}

function heatBg(val: number, lo: number, hi: number): string {
  if (val <= 0) return 'rgba(100,116,139,0.08)';
  const ratio = Math.min(1, Math.max(0, (val - lo) / Math.max(hi - lo, 1)));
  const r = Math.round(239 - ratio * (239 - 34));
  const g = Math.round(68 + ratio * (197 - 68));
  const b = Math.round(68 + ratio * (94 - 68));
  return `rgba(${r},${g},${b},0.22)`;
}

function fmt(v: number | null, dec = 1, suffix = ''): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return v.toFixed(dec) + suffix;
}

function fmtCr(v: number): string {
  if (v <= 0) return '—';
  if (v >= 100000) return (v / 100000).toFixed(1) + 'L Cr';
  return (v / 100).toFixed(0) + ' Cr';
}

export default function CompareTab() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [addSymbol, setAddSymbol] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [rivalries, setRivalries] = useState<SavedRivalry[]>([]);
  const [rivalryName, setRivalryName] = useState('');
  const [showRivalry, setShowRivalry] = useState(false);
  const [toast, setToast] = useState('');
  const [histTF, setHistTF] = useState<HistoricalTF>('1Y');
  const [histLoading, setHistLoading] = useState(false);
  const [histData, setHistData] = useState<Record<string, HistoryPoint[]>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as CompareState;
        if (p.symbols?.length) setSymbols(p.symbols.slice(0, MAX_STOCKS));
        if (p.viewMode) setViewMode(p.viewMode);
      }
      const rr = localStorage.getItem(RIVALRY_KEY);
      if (rr) setRivalries(JSON.parse(rr));
    } catch {}
  }, []);

  function persist(syms: string[], mode?: ViewMode) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ symbols: syms, viewMode: mode ?? viewMode }));
    } catch {}
  }

  const { prices, loading } = useLivePrices(symbols);

  function handleInput(val: string) {
    setAddSymbol(val.toUpperCase());
    setError('');
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const q = val.toUpperCase();
    const matches = Object.values(STOCKS)
      .filter(s => (s.symbol.includes(q) || s.name.toUpperCase().includes(q)) && !symbols.includes(s.symbol))
      .slice(0, 6)
      .map(s => s.symbol);
    setSuggestions(matches);
  }

  function addStock(sym?: string) {
    const s = (sym ?? addSymbol).trim().toUpperCase();
    setError('');
    setSuggestions([]);
    if (!s) {
      setError('Enter a symbol');
      return;
    }
    if (!STOCKS[s]) {
      setError(`"${s}" not found`);
      return;
    }
    if (symbols.includes(s)) {
      setError('Already in arena');
      return;
    }
    if (symbols.length >= MAX_STOCKS) {
      setError(`Max ${MAX_STOCKS} stocks`);
      return;
    }
    const next = [...symbols, s];
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  function saveRivalry() {
    if (!symbols.length) return;
    const name = rivalryName.trim() || symbols.join(' vs ');
    const entry: SavedRivalry = {
      id: Date.now().toString(),
      name,
      symbols: [...symbols],
      savedAt: new Date().toISOString(),
    };
    const next = [...rivalries, entry];
    setRivalries(next);
    try {
      localStorage.setItem(RIVALRY_KEY, JSON.stringify(next));
    } catch {}
    setRivalryName('');
    setShowRivalry(false);
    showToast(`⚔️ Rivalry "${name}" saved!`);
  }

  function loadRivalry(r: SavedRivalry) {
    setSymbols(r.symbols);
    persist(r.symbols);
    showToast(`Loaded: ${r.name}`);
  }

  function deleteRivalry(id: string) {
    const next = rivalries.filter(r => r.id !== id);
    setRivalries(next);
    try {
      localStorage.setItem(RIVALRY_KEY, JSON.stringify(next));
    } catch {}
  }

  const peerSuggestions = useMemo(() => {
    if (symbols.length === 0) return [];
    const sectors = [...new Set(symbols.map(s => STOCKS[s]?.sector).filter(Boolean))];
    return Object.values(STOCKS)
      .filter(s => sectors.includes(s.sector) && !symbols.includes(s.symbol))
      .slice(0, 5)
      .map(s => s.symbol);
  }, [symbols]);

  const enriched = useMemo(() => {
    return symbols
      .map(sym => {
        const stock = STOCKS[sym] as any;
        if (!stock) return null;
        const c = buildConsensus(stock);
        const live = prices[sym]?.price ?? stock.price ?? 0;
        const chg = prices[sym]?.changePercent24h ?? 0;
        const fcfYield = stock.mktcap > 0 && stock.fcf ? (stock.fcf / stock.mktcap) * 100 : 0;

        // Extract pillar scores by matching full names
        const pillarScores: Record<string, number> = {};
        Object.entries(PILLAR_MAP).forEach(([fullName, pillar]) => {
          const match = c.scores.find(r => r.full === fullName);
          pillarScores[pillar.toLowerCase() + 'Score'] = match?.score ?? 0;
        });

        return {
          symbol: sym,
          name: stock.name,
          sector: stock.sector ?? '—',
          live,
          changePct: chg,
          pe: stock.pe ?? 0,
          pb: (stock.price && stock.bvps) ? stock.price / stock.bvps : 0,
          roe: stock.roe ?? 0,
          roce: stock.roce ?? 0,
          de: stock.de ?? 0,
          fcfYield,
          mktcap: stock.mktcap ?? 0,
          consensus: c.consensus,
          category: c.category,
          tension: c.tension,
          tensionSpread: c.tensionSpread,
          topBull: c.topBull?.full ?? '—',
          topBear: c.topBear?.full ?? '—',
          scores: c.scores,
          moatScore: c.scores.find((r: any) => r.full === 'Warren Buffett')?.score ?? 0,
          valuationScore: c.scores.find((r: any) => r.full === 'Benjamin Graham')?.score ?? 0,
          growthScore: c.scores.find((r: any) => r.full === 'Peter Lynch')?.score ?? 0,
          governanceScore: c.scores.find((r: any) => r.full === 'Charlie Munger')?.score ?? 0,
          sentimentScore: c.scores.find((r: any) => r.full === 'George Soros')?.score ?? 0,
          qualityScore: c.scores.find((r: any) => r.full === 'Philip Fisher')?.score ?? 0,
          ...pillarScores,
        };
      })
      .filter(Boolean) as any[];
  }, [symbols, prices]);

  const disagreementIndex = useMemo(() => {
    if (!enriched.length) return 0;
    return Math.round(enriched.reduce((s: number, e: any) => s + e.tensionSpread, 0) / enriched.length);
  }, [enriched]);

  // Build dynamic Rishi list from actual scores
  const allRishis = useMemo(() => {
    if (!enriched.length) return [];
    const rishiSet = new Set<string>();
    enriched.forEach((e: any) => {
      e.scores.forEach((r: any) => rishiSet.add(r.full));
    });
    return Array.from(rishiSet).sort();
  }, [enriched]);

  const crowns = useMemo(() => {
    const map: Record<string, string> = {};
    allRishis.forEach(rishi => {
      let best = -1,
        bestSym = '';
      enriched.forEach((e: any) => {
        const sc = e.scores.find((r: any) => r.full === rishi)?.score ?? 0;
        if (sc > best) {
          best = sc;
          bestSym = e.symbol;
        }
      });
      if (best > 0) map[rishi] = bestSym;
    });
    return map;
  }, [enriched, allRishis]);

  function generateThesis(): string {
    if (!enriched.length) return '';
    const winner = [...enriched].sort((a: any, b: any) => b.consensus - a.consensus)[0];
    const loser = [...enriched].sort((a: any, b: any) => a.consensus - b.consensus)[0];
    const lines: string[] = [
      `# ⚔️ Battle Thesis — ${enriched.map((e: any) => e.symbol).join(' vs ')}`,
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      '',
      `## 🏆 Rishi Council Verdict`,
      `**${winner.symbol}** leads with a Rishi Score of **${winner.consensus}** (${winner.category}).`,
      `**${loser.symbol}** trails at **${loser.consensus}** (${loser.category}).`,
      '',
      `## 📊 Pillar Scores`,
      '| Stock | Moat | Valuation | Growth | Governance | Sentiment | Quality |',
      '|-------|------|-----------|--------|------------|-----------|---------|',
      ...enriched.map((e: any) => `| ${e.symbol} | ${e.moatScore || 0} | ${e.valuationScore || 0} | ${e.growthScore || 0} | ${e.governanceScore || 0} | ${e.sentimentScore || 0} | ${e.qualityScore || 0} |`),
      '',
      `## 🔑 Key Ratios`,
      '| Stock | P/E | P/B | ROE% | ROCE% | D/E | FCF Yield% |',
      '|-------|-----|-----|------|-------|-----|------------|',
      ...enriched.map((e: any) => `| ${e.symbol} | ${fmt(e.pe, 1)} | ${fmt(e.pb, 1)} | ${fmt(e.roe, 1)} | ${fmt(e.roce, 1)} | ${fmt(e.de, 2)} | ${fmt(e.fcfYield, 1)} |`),
      '',
      `## 🧠 Disagreement Index: ${disagreementIndex}/100`,
      disagreementIndex < 20 ? 'Strong consensus across all stocks — high conviction comparison.' : disagreementIndex < 50 ? 'Moderate disagreement — some philosophical differences worth noting.' : 'High disagreement — requires deep due diligence before committing.',
      '',
      `## 👑 Philosophy Kings`,
      ...Object.entries(crowns).slice(0, 10).map(([rishi, sym]) => `- **${rishi}** prefers **${sym}**`),
    ];
    return lines.join('\n');
  }

  function copyThesis() {
    const t = generateThesis();
    navigator.clipboard
      .writeText(t)
      .then(() => showToast('📋 Battle Thesis copied!'))
      .catch(() => showToast('❌ Copy failed'));
  }

  // Fetch historical data
  useEffect(() => {
    if (viewMode !== 'historical' || !symbols.length) return;
    setHistLoading(true);
    Promise.all(symbols.map(sym => fetchHistoryPoints(sym, histTF)))
      .then(results => {
        const map: Record<string, HistoryPoint[]> = {};
        symbols.forEach((sym, i) => {
          map[sym] = results[i];
        });
        setHistData(map);
        setHistLoading(false);
      })
      .catch(() => {
        setHistLoading(false);
        showToast('❌ Failed to fetch history');
      });
  }, [viewMode, symbols.join(','), histTF]);

  const normalizedHistData = useMemo(() => {
    if (!Object.keys(histData).length) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    
    // Normalize each symbol to base 100
    Object.entries(histData).forEach(([sym, points]) => {
      if (!points.length) return;
      const base = points[0].close;
      points.forEach(pt => {
        const date = pt.date;
        if (!dateMap[date]) dateMap[date] = {};
        dateMap[date][sym] = (pt.close / base) * 100;
      });
    });

    return Object.entries(dateMap)
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [histData]);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 8,
    padding: '16px 20px',
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

  const btnGhost: React.CSSProperties = {
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid rgba(100,116,139,0.3)',
    borderRadius: 6,
    color: '#64748B',
    fontSize: 11,
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 6,
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'right' as const,
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 0.8,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'right' as const,
    fontFamily: 'monospace',
    fontSize: 11,
  };

  const viewModes: Array<{ id: ViewMode; label: string; icon: string }> = [
    { id: 'matrix', label: 'Matrix', icon: '⊞' },
    { id: 'philosophy', label: 'Philosophy', icon: '⚔️' },
    { id: 'heatmap', label: 'Heatmap', icon: '🔥' },
    { id: 'radar', label: 'Radar', icon: '📡' },
    { id: 'historical', label: 'Historical', icon: '📈' },
  ];

  const STOCK_COLORS = ['#D4AF37', '#22C55E', '#3B82F6', '#F97316', '#A855F7', '#EF4444', '#14B8A6', '#F59E0B', '#6366F1', '#EC4899'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(212,175,55,0.5)',
            borderRadius: 8,
            padding: '12px 20px',
            color: '#D4AF37',
            fontSize: 13,
            fontFamily: 'monospace',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}

      {/* ADD STOCK */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6, letterSpacing: 1 }}>ADD STOCK (MAX {MAX_STOCKS})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  value={addSymbol}
                  onChange={e => handleInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addStock();
                    if (e.key === 'Escape') setSuggestions([]);
                  }}
                  placeholder="Symbol or name..."
                  style={inputStyle}
                />
                {suggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: '#0B1221',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: '0 0 6px 6px',
                      overflow: 'hidden',
                    }}
                  >
                    {suggestions.map(sym => (
                      <div
                        key={sym}
                        onClick={() => {
                          addStock(sym);
                          setSuggestions([]);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: '#E2E8F0',
                          borderBottom: '1px solid rgba(30,41,59,0.5)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(212,175,55,0.1)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        }}
                      >
                        <span style={{ color: '#D4AF37', fontWeight: 700 }}>{sym}</span>
                        <span style={{ color: '#64748B', marginLeft: 8 }}>{STOCKS[sym]?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => addStock()} style={btnGold}>
                + Add
              </button>
            </div>
            {error && <div style={{ marginTop: 6, fontSize: 11, color: '#EF4444' }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748B' }}>{loading ? '⟳ Loading...' : `${symbols.length}/${MAX_STOCKS}`}</span>
            {symbols.length > 0 && (
              <>
                <button onClick={() => setShowRivalry(v => !v)} style={btnGhost}>
                  ⚔️ Save
                </button>
                <button onClick={copyThesis} style={btnGhost}>
                  📋 Thesis
                </button>
                <button onClick={clearAll} style={{ ...btnGhost, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {showRivalry && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={rivalryName} onChange={e => setRivalryName(e.target.value)} placeholder={`e.g. ${symbols.slice(0, 2).join(' vs ')}`} style={{ ...inputStyle, flex: '1 1 200px', padding: '7px 10px' }} />
            <button onClick={saveRivalry} style={btnGold}>
              Save
            </button>
            <button onClick={() => setShowRivalry(false)} style={btnGhost}>
              Cancel
            </button>
          </div>
        )}

        {peerSuggestions.length > 0 && symbols.length > 0 && symbols.length < MAX_STOCKS && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748B', letterSpacing: 1 }}>PEERS:</span>
            {peerSuggestions.map(sym => (
              <button key={sym} onClick={() => addStock(sym)} style={{ ...btnGhost, fontSize: 10, padding: '4px 8px' }}>
                + {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIVALRIES */}
      {rivalries.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 10 }}>⚔️ SAVED RIVALRIES</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rivalries.map(r => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: 6,
                  padding: '6px 10px',
                }}
              >
                <button onClick={() => loadRivalry(r)} style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', padding: 0 }}>
                  {r.name}
                </button>
                <button onClick={() => deleteRivalry(r.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STOCK CHIPS */}
      {symbols.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {enriched.map((e: any, i: number) => (
            <div
              key={e.symbol}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(15,23,42,0.7)',
                border: `1px solid ${STOCK_COLORS[i % STOCK_COLORS.length]}44`,
                borderRadius: 20,
                padding: '6px 12px',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STOCK_COLORS[i % STOCK_COLORS.length] }} />
              <Link href={`/stock/${e.symbol}`} style={{ color: '#E2E8F0', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>
                {e.symbol}
              </Link>
              <span style={{ fontSize: 11, color: scoreColor(e.consensus), fontFamily: 'monospace' }}>{e.consensus}</span>
              <span style={{ fontSize: 11, color: changeColor(e.changePct) }}>
                {e.changePct >= 0 ? '+' : ''}
                {e.changePct.toFixed(1)}%
              </span>
              <button onClick={() => removeStock(e.symbol)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VIEW TABS */}
      {symbols.length > 0 && (
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(30,41,59,0.8)', paddingBottom: 10, flexWrap: 'wrap' }}>
          {viewModes.map(vm => (
            <button
              key={vm.id}
              onClick={() => {
                setViewMode(vm.id);
                persist(symbols, vm.id);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: viewMode === vm.id ? 700 : 400,
                background: viewMode === vm.id ? 'rgba(212,175,55,0.15)' : 'transparent',
                border: viewMode === vm.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(30,41,59,0.6)',
                color: viewMode === vm.id ? '#D4AF37' : '#64748B',
              }}
            >
              {vm.icon} {vm.label}
            </button>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {symbols.length === 0 && (
        <div style={{ ...cardStyle, padding: 64, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#D4AF37', marginBottom: 8 }}>The Arena is Empty</div>
          <div style={{ color: '#64748B', marginBottom: 20, fontSize: 14 }}>Add 2–10 stocks to begin the battle.</div>
        </div>
      )}

      {/* VIEW: MATRIX (SIMPLIFIED TO 15 COLUMNS) */}
      {symbols.length > 0 && viewMode === 'matrix' && (
        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(212,175,55,0.3)' }}>
                  <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', left: 0, background: '#0B1221', zIndex: 10 }}>STOCK</th>
                  <th style={thStyle}>PRICE</th>
                  <th style={thStyle}>24H%</th>
                  <th style={thStyle}>MKT CAP</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>SCORE</th>
                  <th style={thStyle}>P/E</th>
                  <th style={thStyle}>P/B</th>
                  <th style={thStyle}>ROE%</th>
                  <th style={thStyle}>ROCE%</th>
                  <th style={thStyle}>D/E</th>
                  <th style={thStyle}>FCF YLD%</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>TENSION</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>BULL</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>BEAR</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>✕</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((e: any, i: number) => (
                  <tr
                    key={e.symbol}
                    style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}
                    onMouseEnter={ev => {
                      (ev.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,175,55,0.04)';
                    }}
                    onMouseLeave={ev => {
                      (ev.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'left', position: 'sticky', left: 0, background: '#0B1221', zIndex: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: STOCK_COLORS[i % STOCK_COLORS.length], flexShrink: 0 }} />
                        <div>
                          <Link href={`/stock/${e.symbol}`} style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 800, fontSize: 12 }}>
                            {e.symbol}
                          </Link>
                          <div style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}>{e.sector}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#E2E8F0' }}>{e.live.toLocaleString('en-IN')}</td>
                    <td style={{ ...tdStyle, color: changeColor(e.changePct), fontWeight: 700 }}>
                      {e.changePct >= 0 ? '+' : ''}
                      {e.changePct.toFixed(1)}%
                    </td>
                    <td style={{ ...tdStyle, color: '#94A3B8', fontSize: 10 }}>{fmtCr(e.mktcap)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: scoreColor(e.consensus) }}>{e.consensus}</span>
                    </td>
                    <td style={{ ...tdStyle, color: e.pe > 0 ? metricColor(e.pe, 15, 30) : '#64748B' }}>{fmt(e.pe, 1)}</td>
                    <td style={{ ...tdStyle, color: e.pb > 0 ? metricColor(e.pb, 1.5, 4) : '#64748B' }}>{fmt(e.pb, 1)}</td>
                    <td style={{ ...tdStyle, color: metricColor(e.roe, 12, 20) }}>{fmt(e.roe, 1)}</td>
                    <td style={{ ...tdStyle, color: metricColor(e.roce, 15, 25) }}>{fmt(e.roce, 1)}</td>
                    <td style={{ ...tdStyle, color: e.de > 1 ? '#EF4444' : e.de > 0 ? '#D4AF37' : '#22C55E' }}>{fmt(e.de, 2)}</td>
                    <td style={{ ...tdStyle, color: metricColor(e.fcfYield, 2, 5) }}>{fmt(e.fcfYield, 1)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10, color: e.tensionSpread > 40 ? '#EF4444' : '#64748B' }}>
                      {e.tension.split(' ')[0]} <span style={{ color: '#475569' }}>({e.tensionSpread})</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 9, color: '#22C55E' }}>{e.topBull.split(' ')[0]}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 9, color: '#EF4444' }}>{e.topBear.split(' ')[0]}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => removeStock(e.symbol)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: '#475569' }}>{enriched.length} stocks × 15 cols · Disagreement: {disagreementIndex}</div>
        </div>
      )}

      {/* VIEW: PHILOSOPHY SHOWDOWN */}
      {symbols.length > 0 && viewMode === 'philosophy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* CROWNS */}
          <div style={cardStyle}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>👑 PHILOSOPHY KINGS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {Object.entries(crowns).slice(0, 12).map(([rishi, sym]) => (
                <div
                  key={rishi}
                  style={{
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ fontSize: 9, color: '#64748B', marginBottom: 4 }}>{rishi.toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>👑 {sym}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RISHI × STOCK MATRIX */}
          <div style={cardStyle}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>⚔️ RISHI × STOCK SCORE MATRIX ({allRishis.length} Rishis)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(212,175,55,0.3)' }}>
                    <th style={{ ...thStyle, textAlign: 'left', minWidth: 140, fontSize: 8 }}>RISHI</th>
                    {enriched.map((e: any, i: number) => (
                      <th key={e.symbol} style={{ ...thStyle, textAlign: 'center', color: STOCK_COLORS[i % STOCK_COLORS.length], fontSize: 9 }}>
                        {e.symbol}
                      </th>
                    ))}
                    <th style={{ ...thStyle, textAlign: 'center', fontSize: 8 }}>WINNER</th>
                  </tr>
                </thead>
                <tbody>
                  {allRishis.map(rishi => {
                    const row = enriched.map((e: any) => ({
                      sym: e.symbol,
                      score: e.scores.find((r: any) => r.full === rishi)?.score ?? 0,
                    }));
                    const maxScore = Math.max(...row.map(r => r.score));
                    const winner = row.find(r => r.score === maxScore);
                    return (
                      <tr
                        key={rishi}
                        style={{ borderBottom: '1px solid rgba(30,41,59,0.4)' }}
                        onMouseEnter={ev => {
                          (ev.currentTarget as HTMLTableRowElement).style.background = 'rgba(212,175,55,0.04)';
                        }}
                        onMouseLeave={ev => {
                          (ev.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                        }}
                      >
                        <td style={{ ...tdStyle, textAlign: 'left', color: '#94A3B8', fontSize: 10, fontFamily: 'sans-serif' }}>{rishi}</td>
                        {row.map((r, i) => (
                          <td key={r.sym} style={{ ...tdStyle, textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: r.score === maxScore && maxScore > 0 ? 'rgba(212,175,55,0.15)' : 'transparent',
                                border: r.score === maxScore && maxScore > 0 ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                                fontWeight: r.score === maxScore ? 800 : 400,
                                color: scoreColor(r.score),
                                fontFamily: 'monospace',
                                fontSize: 11,
                              }}
                            >
                              {r.score === maxScore && maxScore > 0 ? '👑 ' : ''}
                              {r.score}
                            </span>
                          </td>
                        ))}
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#D4AF37', fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{winner?.sym ?? '—'}</td>
                      </tr>
                    );
                  })}

                  {/* CONSENSUS ROW */}
                  <tr style={{ borderTop: '2px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.05)' }}>
                    <td style={{ ...tdStyle, textAlign: 'left', color: '#D4AF37', fontWeight: 700, fontSize: 10 }}>RISHI CONSENSUS</td>
                    {enriched.map((e: any, i: number) => {
                      const maxC = Math.max(...enriched.map((x: any) => x.consensus));
                      return (
                        <td key={e.symbol} style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: 14, color: scoreColor(e.consensus), fontFamily: 'monospace' }}>
                            {e.consensus === maxC ? '🏆 ' : ''}
                            {e.consensus}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#D4AF37', fontWeight: 800, fontSize: 11 }}>
                      {[...enriched].sort((a: any, b: any) => b.consensus - a.consensus)[0]?.symbol ?? '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CONSENSUS VS OUTLIER */}
          <div style={cardStyle}>
            <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>🧠 CONSENSUS vs OUTLIER</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enriched.map((e: any) => (
                <div
                  key={e.symbol}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '10px 14px',
                    background: 'rgba(15,23,42,0.4)',
                    borderRadius: 6,
                    border: `1px solid ${e.tensionSpread < 20 ? 'rgba(34,197,94,0.2)' : e.tensionSpread > 60 ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.15)'}`,
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#D4AF37', minWidth: 80 }}>{e.symbol}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{e.tension}</span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(30,41,59,0.6)', borderRadius: 3, minWidth: 80 }}>
                    <div
                      style={{
                        width: `${Math.min(100, e.tensionSpread)}%`,
                        height: '100%',
                        borderRadius: 3,
                        background: e.tensionSpread < 20 ? '#22C55E' : e.tensionSpread < 50 ? '#D4AF37' : '#EF4444',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: e.tensionSpread > 60 ? '#EF4444' : '#64748B', fontFamily: 'monospace' }}>Spread: {e.tensionSpread}</span>
                  <span style={{ fontSize: 10, color: '#475569' }}>
                    {e.tensionSpread < 20 ? '✅ Unanimous' : e.tensionSpread < 40 ? '🟡 Minor' : e.tensionSpread < 60 ? '🟠 Notable' : '🔴 Sharp'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: HEATMAP (ONLY NON-ZERO METRICS) */}
      {symbols.length > 0 && viewMode === 'heatmap' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>
            🔥 HEATMAP — color intensity = quality
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(212,175,55,0.3)' }}>
                  <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', left: 0, background: '#0B1221' }}>STOCK</th>
                  {['SCORE', 'P/E', 'P/B', 'ROE%', 'ROCE%', 'D/E', 'FCF%'].map(col => (
                    <th key={col} style={thStyle}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map((e: any, i: number) => {
                  const cells: Array<{ val: number; lo: number; hi: number; inv?: boolean }> = [
                    { val: e.consensus, lo: 50, hi: 80 },
                    { val: e.pe, lo: 15, hi: 30, inv: true },
                    { val: e.pb, lo: 1.5, hi: 4, inv: true },
                    { val: e.roe, lo: 12, hi: 25 },
                    { val: e.roce, lo: 15, hi: 28 },
                    { val: e.de, lo: 0, hi: 1, inv: true },
                    { val: e.fcfYield, lo: 2, hi: 6 },
                  ];
                  return (
                    <tr key={e.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.3)' }}>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'left',
                          position: 'sticky',
                          left: 0,
                          background: '#0B1221',
                          fontWeight: 800,
                          color: STOCK_COLORS[i % STOCK_COLORS.length],
                        }}
                      >
                        {e.symbol}
                      </td>
                      {cells.map((c, j) => {
                        const displayVal = c.inv ? Math.max(0, c.hi - c.val + c.lo) : c.val;
                        return (
                          <td
                            key={j}
                            style={{
                              ...tdStyle,
                              background: heatBg(c.inv ? Math.max(0, c.hi - c.val + c.lo) : c.val, c.lo, c.hi),
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: '#E2E8F0',
                            }}
                          >
                            {c.val > 0 ? c.val.toFixed(c.val > 10 ? 0 : 1) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 10, color: '#475569' }}>
            <span>🟥 Low</span>
            <span>🟨 Medium</span>
            <span>🟩 High</span>
            <span style={{ marginLeft: 8 }}>* D/E, P/E, P/B: lower = better</span>
          </div>
        </div>
      )}

      {/* VIEW: RADAR CHART (6 PILLAR OVERLAY) */}
      {symbols.length > 0 && viewMode === 'radar' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 16 }}>
            📡 RADAR CHART — 6 Pillar Scores
          </div>
          <ResponsiveContainer width="100%" height={420}>
            <RadarChart
              data={['Moat', 'Valuation', 'Growth', 'Governance', 'Sentiment', 'Quality'].map(metric => {
                const keyMap: Record<string, string> = {
                  Moat: 'moatScore',
                  Valuation: 'valuationScore',
                  Growth: 'growthScore',
                  Governance: 'governanceScore',
                  Sentiment: 'sentimentScore',
                  Quality: 'qualityScore',
                };
                const row: Record<string, any> = { metric };
                enriched.forEach((e: any) => {
                  row[e.symbol] = e[keyMap[metric]] ?? 0;
                });
                return row;
              })}
            >
              <PolarGrid stroke="rgba(30,41,59,0.8)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748B', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
              {enriched.map((e: any, i: number) => (
                <Radar
                  key={e.symbol}
                  name={e.symbol}
                  dataKey={e.symbol}
                  stroke={STOCK_COLORS[i % STOCK_COLORS.length]}
                  fill={STOCK_COLORS[i % STOCK_COLORS.length]}
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
              ))}
              <Legend formatter={(value: any) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{value}</span>} />
              <Tooltip
                contentStyle={{ background: '#0B1221', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6 }}
                labelStyle={{ color: '#D4AF37' }}
                itemStyle={{ color: '#94A3B8' }}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Pillar table */}
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
                  <th style={{ ...thStyle, textAlign: 'left' }}>STOCK</th>
                  {['Moat', 'Valuation', 'Growth', 'Governance', 'Sentiment', 'Quality'].map(m => (
                    <th key={m} style={thStyle}>
                      {m.toUpperCase()}
                    </th>
                  ))}
                  <th style={thStyle}>AVG</th>
                </tr>
              </thead>
              <tbody>
                {[...enriched]
                  .sort((a: any, b: any) => b.consensus - a.consensus)
                  .map((e: any, i: number) => {
                    const pillars = [e.moatScore, e.valuationScore, e.growthScore, e.governanceScore, e.sentimentScore, e.qualityScore];
                    const avg = Math.round(pillars.reduce((s, v) => s + (v || 0), 0) / pillars.length);
                    return (
                      <tr key={e.symbol} style={{ borderBottom: '1px solid rgba(30,41,59,0.3)' }}>
                        <td style={{ ...tdStyle, textAlign: 'left', color: STOCK_COLORS[enriched.indexOf(e) % STOCK_COLORS.length], fontWeight: 800 }}>{e.symbol}</td>
                        {pillars.map((v, j) => (
                          <td key={j} style={{ ...tdStyle, color: scoreColor(v || 0), fontWeight: 700 }}>
                            {v || 0}
                          </td>
                        ))}
                        <td style={{ ...tdStyle, color: scoreColor(avg), fontWeight: 900 }}>{avg}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: HISTORICAL BATTLE */}
      {symbols.length > 0 && viewMode === 'historical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1 }}>📈 HISTORICAL BATTLE — Normalized Equity Curves</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['1Y', '3Y', '5Y'] as HistoricalTF[]).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setHistTF(tf)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: histTF === tf ? 700 : 400,
                      background: histTF === tf ? 'rgba(212,175,55,0.15)' : 'transparent',
                      border: histTF === tf ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(30,41,59,0.6)',
                      color: histTF === tf ? '#D4AF37' : '#64748B',
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {histLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>⟳ Fetching price history...</div>
            ) : normalizedHistData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>No history data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={normalizedHistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getFullYear() % 100}`;
                    }}
                  />
                  <YAxis tick={{ fill: '#64748B', fontSize: 10 }} label={{ value: 'Normalized (Base=100)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#0B1221', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6 }}
                    labelStyle={{ color: '#D4AF37', fontSize: 11 }}
                    itemStyle={{ color: '#94A3B8', fontSize: 11 }}
                    formatter={(value: any) => value.toFixed(1)}
                  />
                  <Legend formatter={(value: any) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{value}</span>} />
                  {enriched.map((e: any, i: number) => (
                    <Line
                      key={e.symbol}
                      type="monotone"
                      dataKey={e.symbol}
                      stroke={STOCK_COLORS[i % STOCK_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={e.symbol}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Performance summary */}
          {normalizedHistData.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1, marginBottom: 12 }}>🏆 PERFORMANCE SUMMARY ({histTF})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {enriched.map((e: any, i: number) => {
                  const first = (normalizedHistData[0] as any)?.[e.symbol] ?? 100;
                  const last = (normalizedHistData[normalizedHistData.length - 1] as any)?.[e.symbol] ?? 100;
                  const change = ((last - first) / first) * 100;
                  return (
                    <div
                      key={e.symbol}
                      style={{
                        background: 'rgba(15,23,42,0.4)',
                        border: `1px solid ${STOCK_COLORS[i % STOCK_COLORS.length]}44`,
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: 11, color: STOCK_COLORS[i % STOCK_COLORS.length], fontWeight: 800, marginBottom: 4 }}>{e.symbol}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: changeColor(change), fontFamily: 'monospace' }}>
                        {change >= 0 ? '+' : ''}
                        {change.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EPISTEMIC FOOTER */}
      {symbols.length > 1 && (
        <div style={{ ...cardStyle, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#64748B', letterSpacing: 1 }}>DISAGREEMENT INDEX</div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: disagreementIndex > 60 ? '#EF4444' : disagreementIndex > 30 ? '#D4AF37' : '#22C55E' }}>
              {disagreementIndex}
              <span style={{ fontSize: 11, color: '#64748B', marginLeft: 4 }}>/100</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              {disagreementIndex < 20
                ? '✅ Strong consensus — high conviction group.'
                : disagreementIndex < 40
                ? '🟡 Mild disagreement — cross-check fundamentals.'
                : disagreementIndex < 60
                ? '🟠 Moderate disagreement — satellite positions only.'
                : '🔴 Sharp division — extreme caution.'}
            </div>
          </div>
          <button onClick={copyThesis} style={btnGold}>
            📋 Battle Thesis
          </button>
        </div>
      )}
    </div>
  );
}
