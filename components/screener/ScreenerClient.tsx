'use client';

// N1 (round 3): the interactive half of /screener. Receives the
// server-generated slim index (free fields only) as RSC props — no
// STOCKS, no engine. Preset filters, stat pills, search and sorting all
// operate on the slim rows; per-Rishi verdicts stay behind the
// tier-gated /api/rishis/[symbol] route.
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { SlimStockRow } from '@/lib/scoring/slimIndex';
import { StockTable } from '@/components/screener/StockTable';
import { useLanguage } from '@/lib/language';
import { SCREENER_PRESETS, applyFilters } from '@/lib/screener/presets';
import SeedDataBanner from '@/components/shared/SeedDataBanner';
import Link from 'next/link';

interface SavedScreen {
  id: string;
  name: string;
  expression: string;
  created_at?: string;
}

interface Props {
  rows: SlimStockRow[];
}

export function ScreenerClient({ rows }: Props) {
  const { t, locale } = useLanguage();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // X3-05: the expression language runs SERVER-SIDE (POST /api/screener/
  // query parses with the hand-written whitelist parser — no eval, no
  // Function) so the client never receives the engine, only rows.
  const [expression, setExpression] = useState('');
  const [exprRows, setExprRows] = useState<SlimStockRow[] | null>(null);
  const [exprCount, setExprCount] = useState<number | null>(null);
  const [exprError, setExprError] = useState<string | null>(null);
  const [exprBusy, setExprBusy] = useState(false);
  const [screens, setScreens] = useState<SavedScreen[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [screensNote, setScreensNote] = useState<string | null>(null);

  // Mounted-signed-in check + list. The inline IIFE keeps every setState
  // behind an await (the react-hooks purity rule rejects a helper whose
  // sync body might setState during the effect pass).
  const loadScreens = useCallback(async () => {
    const res = await fetch('/api/screener/screens');
    if (res.status === 401) {
      setSignedIn(false);
      return;
    }
    if (res.ok) {
      setSignedIn(true);
      const data = await res.json();
      setScreens(data.screens ?? []);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadScreens();
    })();
  }, [loadScreens]);

  async function runExpression() {
    if (!expression.trim() || exprBusy) return;
    setExprBusy(true);
    setExprError(null);
    try {
      const res = await fetch('/api/screener/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExprError(data.detail || data.error || 'query failed');
        setExprRows(null);
        setExprCount(null);
        return;
      }
      setExprRows(data.rows ?? []);
      setExprCount(data.matchedCount ?? 0);
    } catch {
      setExprError('query failed');
    } finally {
      setExprBusy(false);
    }
  }

  async function saveScreen() {
    if (!saveName.trim() || !expression.trim()) return;
    setScreensNote(null);
    const res = await fetch('/api/screener/screens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName.trim(), expression }),
    });
    if (res.status === 401) {
      setScreensNote('Sign in to save screens.');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setScreensNote(data.detail || data.error || 'could not save');
      return;
    }
    setSaveName('');
    await loadScreens();
  }

  async function deleteScreen(id: string) {
    await fetch(`/api/screener/screens?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadScreens();
  }

  function applySaved(screen: SavedScreen) {
    setExpression(screen.expression);
    void runExpressionWith(screen.expression);
  }

  async function runExpressionWith(expr: string) {
    setExprBusy(true);
    setExprError(null);
    try {
      const res = await fetch('/api/screener/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExprError(data.detail || data.error || 'query failed');
        setExprRows(null);
        setExprCount(null);
        return;
      }
      setExprRows(data.rows ?? []);
      setExprCount(data.matchedCount ?? 0);
    } finally {
      setExprBusy(false);
    }
  }

  const filteredStocks = useMemo(() => {
    if (exprRows) return exprRows;
    if (!activePreset) return rows;
    const preset = SCREENER_PRESETS.find(p => p.id === activePreset);
    if (!preset) return rows;
    return applyFilters(rows, preset.filters);
  }, [rows, activePreset, exprRows]);

  const activePresetData = SCREENER_PRESETS.find(p => p.id === activePreset);

  const STAT_PILLS = useMemo(() => {
    // Round-5 audit (finding 1): the "STRONG BUY" pill counted a raw
    // pe>0 && roe>15 proxy — 440 rows (47% of the universe) — which had
    // nothing to do with the engine's verdicts and made the threshold
    // meaningless. It now counts the consensus engine's own buy-side
    // categories (>= 75 = High Conviction / Legendary), and LARGE CAP is
    // the actual definition (top 100 by market cap), both over
    // dataQuality-OK rows only.
    const okRows = rows.filter(s => s.dataQuality === 'OK');
    const largeCapCount = [...okRows]
      .sort((a, b) => b.mktcap - a.mktcap)
      .slice(0, 100)
      .filter(s => s.mktcap > 0).length;
    return [
    { label: t('screener.strongBuy'),  count: okRows.filter(s => s.consensus !== null && s.consensus >= 75).length, color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  title: 'Consensus >= 75 (High Conviction / Legendary bands)' },
    { label: t('screener.valuePlays'), count: okRows.filter(s => s.pe < 20 && s.pe > 0).length,  color: 'var(--accent-gold)',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  title: 'P/E below 20 with positive earnings' },
    { label: t('screener.largeCap'),   count: largeCapCount,       color: '#c084fc',             bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)', title: 'Top 100 by market cap (AMFI definition)' },
    { label: t('screener.highROE'),    count: okRows.filter(s => s.roe > 25).length,              color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  title: 'ROE above 25%' },
    { label: t('screener.debtFree'),   count: okRows.filter(s => s.de < 0.3).length,             color: '#f472b6',             bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)', title: 'Debt-to-equity below 0.3' },
    ];
  }, [t, locale, rows]);

  return (
    <main className="page-bg">

      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          <p className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI</Link>
            <span style={{ margin: '0 8px' }}>&rsaquo;</span>
            <span>SCREENER</span>
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 42, marginBottom: 8 }}>
                {t('screener.title')}
              </h1>
              <p className="page-subtitle" style={{ maxWidth: 520 }}>
                {activePresetData ? (
                  <><strong style={{ color: '#D4AF37' }}>{activePresetData.emoji} {activePresetData.name}:</strong> {activePresetData.description}</>
                ) : (
                  `Filter ${rows.length} Indian stocks by Rishi wisdom — Buffett Mode, Damani Mode, Graham Mode, Short Mode & more`
                )}
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                {activePreset ? 'FILTERED' : 'TOTAL COVERAGE'}
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {filteredStocks.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {activePreset ? 'stocks matching' : 'NSE / BSE stocks'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.12em', marginBottom: 10 }}>
              RISHI SCREENING MODES
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActivePreset(null)}
                style={{
                  padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: !activePreset ? 'rgba(212,175,55,0.12)' : 'rgba(31,41,59,0.6)',
                  outline: !activePreset ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(51,65,85,0.4)',
                  color: !activePreset ? '#D4AF37' : '#64748B',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                }}
              >
                All Stocks
              </button>
              {SCREENER_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id === activePreset ? null : preset.id)}
                  style={{
                    padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: activePreset === preset.id ? 'rgba(212,175,55,0.12)' : 'rgba(31,41,59,0.6)',
                    outline: activePreset === preset.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(51,65,85,0.4)',
                    color: activePreset === preset.id ? '#D4AF37' : '#64748B',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* X3-05: the expression language — parsed and evaluated SERVER-side
              by the whitelist parser (lib/screener/parser.ts). Saved screens
              are per-user (screens table, RLS by auth.uid(), migration 024);
              CSV export replays the same parse over the same rows. */}
          <div style={{ marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.12em', marginBottom: 10 }}>
              EXPRESSION QUERY
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={expression}
                onChange={e => setExpression(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void runExpression(); }}
                placeholder="pe < 15 && roe > 20"
                maxLength={400}
                style={{
                  flex: '1 1 320px', background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                  borderRadius: 8, padding: '9px 12px', color: '#F8FAFC', fontSize: 13, fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => void runExpression()}
                disabled={exprBusy || !expression.trim()}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(212,175,55,0.4)', cursor: exprBusy ? 'wait' : 'pointer',
                  background: 'rgba(212,175,55,0.12)', color: '#D4AF37', fontSize: 12, fontWeight: 700,
                }}
              >
                {exprBusy ? 'RUNNING…' : 'RUN'}
              </button>
              <a
                href={`/api/screener/export?expression=${encodeURIComponent(expression)}`}
                style={{
                  padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(51,65,85,0.8)',
                  color: '#94A3B8', fontSize: 12, textDecoration: 'none',
                }}
              >
                CSV ↓
              </a>
            </div>
            {exprError && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#F87171' }}>
                ⚠ {exprError}
              </div>
            )}
            {exprCount !== null && !exprError && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
                {exprCount} stock{exprCount === 1 ? '' : 's'} match · showing the first {exprRows?.length ?? 0} · <button onClick={() => { setExprRows(null); setExprCount(null); }} style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: 11, padding: 0 }}>clear</button>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder={signedIn ? 'name this screen…' : 'sign in to save screens'}
                maxLength={80}
                disabled={!signedIn}
                style={{
                  flex: '0 1 220px', background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(51,65,85,0.6)',
                  borderRadius: 8, padding: '8px 12px', color: '#F8FAFC', fontSize: 12,
                  outline: 'none', opacity: signedIn ? 1 : 0.5,
                }}
              />
              <button
                onClick={() => void saveScreen()}
                disabled={!signedIn || !saveName.trim() || !expression.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(51,65,85,0.8)', cursor: 'pointer',
                  background: 'rgba(31,41,59,0.6)', color: '#94A3B8', fontSize: 12,
                }}
              >
                SAVE
              </button>
              {screens.length > 0 && screens.map(screen => (
                <span key={screen.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(31,41,59,0.6)', border: '1px solid rgba(51,65,85,0.6)', borderRadius: 8, padding: '6px 10px' }}>
                  <button onClick={() => applySaved(screen)} title={screen.expression} style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                    {screen.name}
                  </button>
                  <button onClick={() => void deleteScreen(screen.id)} title="delete" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                    ×
                  </button>
                </span>
              ))}
              {screensNote && <span style={{ fontSize: 11, color: '#F87171' }}>{screensNote}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {STAT_PILLS.map(stat => (
              <div key={stat.label} title={stat.title} style={{ background: stat.bg, border: '1px solid ' + stat.border, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <SeedDataBanner suffix="all fundamentals on this page are illustrative placeholders" />
        <StockTable stocks={filteredStocks} />
      </div>

    </main>
  );
}
