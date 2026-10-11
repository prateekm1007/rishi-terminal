'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BONDS, BOND_ROW_SOURCE, REPO_ROW } from '../../data/bonds';
import { useLanguage } from '../../lib/language';
import { bondMaturityState } from '../../lib/bonds/maturity';
// FD-15 (founder order 2026-10-11, item 3): "take G-secs, T-bills and repo
// from RBI DBIE". The rows are ROUTED to their named sources; until the
// first verified DBIE observation lands (rbi.org.in refuses non-browser
// clients from the sandbox — the licensing review records "first fetches
// founder-side, no unverified loader ships", rule 20), every value renders
// "—". Durations compute from cash flows once a sourced yield exists
// (lib/bonds/duration.ts); ratings have no cleared source — "—".
import {
  wireEntryToRow,
  type MarketRow,
} from '../../lib/markets/sourcedRow';
import {
  MarketValueCell,
  MarketSourceCell,
  MarketAsOfCell,
  MarketStateChip,
} from '../../components/shared/MarketRowCells';
import { ProvenanceChip } from '../../components/shared/ProvenanceChip';

type BondType = 'All' | 'G-Sec' | 'SDL' | 'Corporate' | 'T-Bill' | 'US-Treasury' | 'Repo';

function typeColor(type: string) {
  if (type === 'G-Sec')     return 'var(--accent-green)';
  if (type === 'SDL')       return '#60a5fa';
  if (type === 'Corporate') return 'var(--accent-gold)';
  if (type === 'Repo')      return '#f472b6';
  return '#c084fc';
}

/** One list row: instrument identity + contract rows for the values. */
interface BondListRow {
  symbol: string;
  name: string;
  type: BondType;
  /** Recorded instrument term (not a market observation). '' = not applicable. */
  maturityDate: string;
  maturity: 'active' | 'matured';
  ytmRow: MarketRow;
  durationRow: MarketRow;
  /** FD-15: the rating column shows "—" — no cleared rating source. */
  ratingRow: MarketRow;
  sourceRow: MarketRow;
  clickable: boolean;
}

function bondToRow(symbol: string, name: string, type: Exclude<BondType, 'All'>, maturityDate: string): BondListRow {
  const source = BOND_ROW_SOURCE[type];
  // No sourced observation exists on this page today: the values are null
  // and the state is missing — the named source renders beside them so the
  // routing is visible ("RBI DBIE" for G-secs/T-bills/repo; null → "no
  // source yet" for SDLs, corporates and US rows).
  const valueRow = (unit: string): MarketRow => ({
    value: null, unit, source, asOf: null, state: 'missing',
  });
  return {
    symbol, name, type, maturityDate,
    maturity: maturityDate ? bondMaturityState(maturityDate) : 'active',
    ytmRow: valueRow('%'),
    durationRow: valueRow('y'),
    ratingRow: { value: null, unit: '', source: null, asOf: null, state: 'missing' },
    sourceRow: wireEntryToRow(null, { unit: '' , sourceName: source }),
    clickable: type !== 'Repo',
  };
}

export default function BondsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<BondType>('All');

  const bondRows: BondListRow[] = [
    ...BONDS.map(b => bondToRow(b.symbol, b.name, b.type, b.maturityDate)),
    // The RBI policy repo rate: a policy rate, not a tradable instrument —
    // no detail page, routed to DBIE like the G-secs and T-bills.
    bondToRow(REPO_ROW.symbol, REPO_ROW.name, 'Repo', ''),
  ];

  const filtered = typeFilter === 'All'
    ? bondRows
    : bondRows.filter(b => b.type === typeFilter);

  // Sort by the RECORDED maturity date (an instrument term, not market
  // data). YTM/duration sorts are gone with the values they sorted.
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.maturityDate ? Date.parse(a.maturityDate) : Number.POSITIVE_INFINITY;
    const tb = b.maturityDate ? Date.parse(b.maturityDate) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });

  const gSecs     = bondRows.filter(b => b.type === 'G-Sec');
  const sdls      = bondRows.filter(b => b.type === 'SDL');
  const corporate = bondRows.filter(b => b.type === 'Corporate');
  const tbills    = bondRows.filter(b => b.type === 'T-Bill');
  const ustreas   = bondRows.filter(b => b.type === 'US-Treasury');
  const repo      = bondRows.filter(b => b.type === 'Repo');

  const types: BondType[] = ['All', 'G-Sec', 'SDL', 'Corporate', 'T-Bill', 'US-Treasury', 'Repo'];

  const stats: Array<{
    label: string; count: string; color: string; bg: string; border: string;
    chip?: string; chipState?: 'live' | 'reference'; title?: string;
  }> = [
    { label: t('bonds.gSecs'),        count: String(gSecs.length),     color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: t('bonds.sdls'),          count: String(sdls.length),      color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
    { label: t('bonds.corporate'),     count: String(corporate.length), color: 'var(--accent-gold)',  bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.2)' },
    { label: t('bonds.tBills'),       count: String(tbills.length),    color: '#c084fc',             bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
    { label: t('bonds.usTreasuries'), count: String(ustreas.length),   color: '#34d399',             bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)' },
    {
      // FD-15: averages over unsourced values are "—" — an average over
      // static reference yields presented a current-looking figure.
      label: t('bonds.avgYtm'),
      count: '—',
      color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',
      chip: 'NO SOURCE', chipState: 'reference',
      title: 'G-secs, T-bills and the repo rate are routed to RBI DBIE — values appear once the first verified observation lands',
    },
    {
      label: t('bonds.avgDuration'), count: '—',
      color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)',
      chip: 'NO SOURCE', chipState: 'reference',
      title: 'Durations compute from cash flows once a sourced yield exists (lib/bonds/duration.ts)',
    },
  ];

  return (
    <main className="page-bg">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('bonds.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: 36, color: 'var(--accent-gold)', marginBottom: 8 }}>
                {t('bonds.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('bonds.subtitle')}
              </p>
            </div>

            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
              borderRadius: 12, padding: '16px 24px', minWidth: 160,
            }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                {t('bonds.totalBonds')}
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {bondRows.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {t('bonds.sovereignCorporate')}
              </div>
            </div>
          </div>

          {/* FD-15 honest state notice */}
          <div style={{
            background: 'rgba(100,116,139,0.10)',
            border: '1px solid rgba(100,116,139,0.35)',
            borderRadius: 10,
            padding: '14px 18px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>SOURCES BEING WIRED</span>
            {' — '}
            G-secs, T-bills and the repo rate are routed to <strong>RBI DBIE</strong> (the single macro
            source named in the licensing review); their values show &ldquo;—&rdquo; until the first verified
            observation lands. SDLs, corporate and US rows show &ldquo;—&rdquo; with
            &ldquo;no source yet&rdquo; — no source is cleared for them. Durations will compute from
            cash flows; ratings show &ldquo;—&rdquo; (no cleared rating source — sovereigns are not
            CRA-rated and the corporate ratings in the reference set are unverified).
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 24 }}>
            {stats.map(stat => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  border: '1px solid ' + stat.border,
                  borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1, display: 'flex', alignItems: 'center' }}>
                  <span>{stat.label.toUpperCase()}</span>
                  {stat.chip && stat.chipState && (
                    <ProvenanceChip state={stat.chipState} label={stat.chip} title={stat.title ?? 'No sourced observation yet'} />
                  )}
                </div>
                <div style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: '28px 24px' }}>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {types.map(ty => (
              <button
                key={ty}
                onClick={() => setTypeFilter(ty)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  fontWeight: typeFilter === ty ? 700 : 400,
                  border: typeFilter === ty ? 'none' : '1px solid var(--border-primary)',
                  background: typeFilter === ty ? typeColor(ty === 'All' ? 'G-Sec' : ty) + '20' : 'var(--bg-card)',
                  color: typeFilter === ty ? typeColor(ty === 'All' ? 'G-Sec' : ty) : 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {ty}
              </button>
            ))}
          </div>
        </div>

        {/* Bonds Table — the FD-15 contract columns */}
        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {[
                    t('bonds.name'),
                    t('bonds.type'),
                    'YTM',
                    'MATURITY',
                    'Duration',
                    'RATING',
                    'SOURCE',
                    'AS OF',
                  ].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 || i === 1 ? 'left' : 'right',
                      padding: '14px 24px',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      letterSpacing: 1,
                      fontWeight: 600,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(bond => (
                  <tr
                    key={bond.symbol}
                    role={bond.clickable ? 'link' : undefined}
                    tabIndex={bond.clickable ? 0 : undefined}
                    aria-label={bond.clickable ? `${bond.name} — open details` : `${bond.name} — policy rate, no detail page`}
                    onKeyDown={e => { if (bond.clickable && e.key === 'Enter') router.push(`/bonds/${bond.symbol}`); }}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: bond.clickable ? 'pointer' : 'default', transition: 'background 0.15s', opacity: bond.maturity === 'matured' ? 0.55 : 1 }}
                    onMouseEnter={e => { if (bond.clickable) (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'; }}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      onClick={() => { if (bond.clickable) router.push(`/bonds/${bond.symbol}`); }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, display: 'flex', alignItems: 'center' }}>
                        {bond.name}
                        <MarketStateChip row={bond.ytmRow} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {bond.symbol}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: typeColor(bond.type) + '20',
                        color: typeColor(bond.type),
                        fontFamily: 'monospace',
                      }}>
                        {bond.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 16, fontFamily: 'monospace' }}>
                      <MarketValueCell row={bond.ytmRow} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {bond.maturityDate
                        ? new Date(bond.maturityDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
                        : '—'}
                      {bond.maturity === 'matured' && (
                        <span title="This instrument's recorded maturity date has passed — shown as historical reference. Replacement is a founder data decision (FD-9)." style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, padding: '2px 6px', letterSpacing: 1 }}>MATURED</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace' }}>
                      <MarketValueCell row={bond.durationRow} muted />
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace' }} title="No cleared rating source — the reference set's SOV/AA markers are unverified and never render here">
                      <MarketValueCell row={bond.ratingRow} muted />
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                      <MarketSourceCell row={bond.sourceRow} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                      <MarketAsOfCell row={bond.ytmRow} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
