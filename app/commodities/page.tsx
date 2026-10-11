'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COMMODITIES } from '../../data/markets';
import { useLanguage } from '../../lib/language';
import { ProvenanceChip } from '../../components/shared/ProvenanceChip';
// FD-15 (founder order 2026-10-11, item 5): forex and commodity values
// wait for the founder's source decision — every value renders "—" with
// the source reading "licence pending". MCX rows quote in ₹ (their units
// say so); global rows keep their $ units; grains and cotton show theirs.
// The static reference prices in data/markets.ts never render as data.
import {
  wireEntryToRow,
  type MarketRow,
} from '../../lib/markets/sourcedRow';
import {
  MarketValueCell,
  MarketSourceCell,
  MarketAsOfCell,
  MarketStateChip,
  MarketUnitNote,
} from '../../components/shared/MarketRowCells';

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--accent-green)';
  if (score >= 55) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

export default function CommoditiesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [category, setCategory] = useState('All');

  // R3 (round 2) + Commit M3 (free access): the average on each card is
  // computed SERVER-SIDE (/api/gurus?kind=commodity); every detail page
  // serves the full per-guru verdicts to every caller. These are the FD-12
  // REFERENCE heuristics — labelled as such, never market data.
  const [guruTeasers, setGuruTeasers] = useState<Record<string, { avg: number | null; gurus: Array<{ id: string; initials: string; score: number | null }> }>>({});
  useEffect(() => {
    let cancelled = false;
    fetch('/api/gurus?kind=commodity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !Array.isArray(d?.commodities)) return;
        const map: typeof guruTeasers = {};
        for (const c of d.commodities) map[c.symbol] = { avg: c.avg, gurus: c.gurus ?? [] };
        setGuruTeasers(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // FD-15: every commodity row is licence-pending — value "—", source
  // "licence pending". No live fetch runs on this page.
  const pendingRow = (unit: string): MarketRow =>
    wireEntryToRow(null, { unit, licencePending: true });

  const categories = ['All', ...Array.from(new Set(COMMODITIES.map(c => c.category)))];
  const filtered = category === 'All'
    ? COMMODITIES
    : COMMODITIES.filter(c => c.category === category);

  return (
    <main className="page-bg">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('commodities.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 32, color: 'var(--accent-gold)' }}>
                {t('commodities.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
                {t('commodities.subtitle')}
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                COMMODITIES
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {COMMODITIES.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center' }}>
                <span>Global Markets</span>
                <ProvenanceChip
                  state="unavailable"
                  title="No commodity source is licensed for display yet — every value shows — until one is cleared"
                  label="LICENCE PENDING"
                />
              </div>
            </div>
          </div>

          {/* FD-15 honest state notice */}
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10,
            padding: '14px 18px',
            marginTop: 24,
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: '#F59E0B', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>DATA LICENCE PENDING</span>
            {' — '}
            No commodity price source is licensed for display yet, so every value shows
            &ldquo;—&rdquo; with its source reading <span style={{ color: '#F59E0B' }}>licence pending</span>.
            Each row still states its quotation unit — MCX rows in ₹ (₹/10g, ₹/kg, ₹/bbl), global
            rows in $/oz, $/bbl, $/ton, grains in $/bu and cotton in $/lb. Prices will appear,
            each with its source and observation time, once a source is cleared.
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="content-wrapper" style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid ' + (category === cat ? 'var(--accent-gold)' : 'var(--border-primary)'),
                background: category === cat ? 'rgba(255,215,0,0.1)' : 'transparent',
                color: category === cat ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontSize: 11,
                fontFamily: 'monospace',
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Commodities Grid — the FD-15 contract per card */}
      <div className="content-wrapper" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(commodity => {
            const priceRow = pendingRow(commodity.unit);
            // R3: server-computed average (null = insufficient data, T11;
            // P1 audit 2026-10-02: null renders '—', never a fabricated 0)
            const teaser = guruTeasers[commodity.symbol];
            const avgScore: number | null = teaser?.avg ?? null;
            const rishiScores = (teaser?.gurus ?? []).map(g => ({ id: g.id, tag: g.initials, result: { score: g.score } }));

            return (
              <div
                key={commodity.symbol}
                className="card-sacred"
                role="link"
                tabIndex={0}
                aria-label={`${commodity.name} — open details`}
                onKeyDown={e => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  router.push('/commodities/' + commodity.symbol);
                }}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => {
                  router.push('/commodities/' + commodity.symbol);
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 32 }}>{commodity.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                        {commodity.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {commodity.symbol} • {commodity.category}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 6,
                    background: (avgScore === null ? '#64748B' : scoreColor(avgScore)) + '20',
                    color: avgScore === null ? 'var(--text-muted)' : scoreColor(avgScore),
                    fontFamily: 'monospace',
                  }}>
                    {avgScore === null ? '—' : avgScore}
                  </div>
                </div>

                {/* FD-15 value row: gated value + unit, source, as-of, state */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <MarketValueCell row={priceRow} />
                    <MarketStateChip row={priceRow} />
                  </div>
                  <MarketUnitNote row={priceRow} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <MarketSourceCell row={priceRow} />
                  <MarketAsOfCell row={priceRow} />
                </div>

                {/* Rishi heuristic scores (FD-12 reference — labelled) */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {rishiScores.map(r => (
                    <div key={r.id} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 3 }}>{r.tag}</div>
                      <div style={{ height: 3, borderRadius: 2, background: (r.result.score === null ? '#64748B' : scoreColor(r.result.score)) + '40' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: (r.result.score === null ? 0 : r.result.score) + '%', background: r.result.score === null ? '#64748B' : scoreColor(r.result.score) }} />
                      </div>
                      <div style={{ fontSize: 9, fontFamily: 'monospace', color: r.result.score === null ? 'var(--text-muted)' : scoreColor(r.result.score), marginTop: 2 }}>
                        {r.result.score === null ? '\u2014' : r.result.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <ProvenanceChip state="unavailable" title="FD-12: the per-guru numbers are the labelled reference heuristics, not market data" label="REFERENCE" />
          {' '}
          Card scores are the FD-12 heuristic reference (labelled, never the canonical consensus
          engine). Prices, changes and ranges render only when a licensed source with an
          observation time exists — none is cleared yet.
        </div>
      </div>
    </main>
  );
}
