'use client';

// N1 (round 3): the interactive half of /screener. Receives the
// server-generated slim index (free fields only) as RSC props — no
// STOCKS, no engine. Preset filters, stat pills, search and sorting all
// operate on the slim rows; per-Rishi verdicts stay behind the
// tier-gated /api/rishis/[symbol] route.
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ScreenerPickerRow } from '@/lib/transport/slimWire';
import { StockTable } from '@/components/screener/StockTable';
import { ScreenerQueryBar } from '@/components/screener/ScreenerQueryBar';
import { useLanguage } from '@/lib/language';
import { SCREENER_PRESETS, applyFilters } from '@/lib/screener/presets';
import SeedDataBanner from '@/components/shared/SeedDataBanner';
import Link from 'next/link';

// INT-D2: the intelligence drawer rides a dynamic ssr:false chunk (the
// C1 bundle pattern) — the drawer code adds ZERO first-load JS to
// /stocks (the 162.0 kB ratchet). Mounted ONCE below; the badge in the
// table only opens it for the clicked row's SERVER-rendered symbol.
const IntelligenceDrawer = dynamic(
  () => import('@/components/screener/IntelligenceDrawer').then(m => m.IntelligenceDrawer),
  { ssr: false },
);

interface Props {
  rows: ScreenerPickerRow[];
}

export function ScreenerClient({ rows }: Props) {
  const { t, locale } = useLanguage();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  // X3-05: custom-expression results (server-evaluated). Null = the
  // expression mode is off; a custom query takes precedence over the
  // presets until cleared, because the user's explicit query is the
  // most recent intent. The API's rows are a superset of the picker
  // shape (extra fields are ignored at runtime).
  const [queryRows, setQueryRows] = useState<ScreenerPickerRow[] | null>(null);
  // INT-D2: the ONE drawer subject — null = closed. Opening another row
  // re-keys the drawer (the last-opened subject wins, no state bleed);
  // closing nulls it and aborts the in-flight request (the drawer's
  // unmount cleanup).
  const [intelligenceSubject, setIntelligenceSubject] = useState<string | null>(null);

  const filteredStocks = useMemo(() => {
    if (queryRows) return queryRows;
    if (!activePreset) return rows;
    const preset = SCREENER_PRESETS.find(p => p.id === activePreset);
    if (!preset) return rows;
    return applyFilters(rows, preset.filters);
  }, [rows, activePreset, queryRows]);

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
            {/* BCRUMB (founder direction 3, 2026-10-10): the canonical
                route's breadcrumb names the canonical page — /screener
                308-redirects here; the stale SCREENER label belonged to
                the pre-canonical era. Route-crawl pinned by
                test/smoke/breadcrumb.spec.ts. */}
            <span>STOCKS</span>
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
                {activePreset || queryRows ? 'FILTERED' : 'TOTAL COVERAGE'}
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
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 10 }}>
              RISHI SCREENING MODES
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActivePreset(null)}
                style={{
                  padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: !activePreset ? 'rgba(212,175,55,0.12)' : 'rgba(31,41,59,0.6)',
                  outline: !activePreset ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(51,65,85,0.4)',
                  color: !activePreset ? '#D4AF37' : 'var(--text-muted)',
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
                    color: activePreset === preset.id ? '#D4AF37' : 'var(--text-muted)',
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

          <ScreenerQueryBar
            onQueryResult={(resultRows) => {
              setQueryRows(resultRows);
              if (resultRows) setActivePreset(null);
            }}
          />

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
        <StockTable stocks={filteredStocks} onOpenIntelligence={setIntelligenceSubject} />
      </div>

      {intelligenceSubject && (
        <IntelligenceDrawer
          key={intelligenceSubject}
          subject={intelligenceSubject}
          onClose={() => setIntelligenceSubject(null)}
        />
      )}

    </main>
  );
}
