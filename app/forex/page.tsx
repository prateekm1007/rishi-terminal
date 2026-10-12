'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FOREX_PAIRS } from '../../data/forex';
import { ProvenanceChip } from '../../components/shared/ProvenanceChip';
import { useLanguage } from '../../lib/language';
// FD-15 (founder order 2026-10-11): the sourced-rows contract. No live
// fetch runs on this page — no forex source is licensed for display yet,
// so every value renders "—" with the source reading "licence pending"
// until the founder clears one. The static seed rates in data/forex.ts
// never render as data (rules 3/4: the constitution does not allow seed
// numbers to be shown as data).
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

/** Every forex row is licence-pending: value "—", source "licence pending". */
function licencePendingRow(unit: string): MarketRow {
  return wireEntryToRow(null, { unit, licencePending: true });
}

export default function ForexPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const pairList = FOREX_PAIRS;

  return (
    <main className="page-bg">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div className="page-breadcrumb">
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('forex.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                {t('forex.title')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                {t('forex.subtitle')}
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>
                {t('forex.pairs')}
              </div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {pairList.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {t('forex.inrCrossRates')}
              </div>
            </div>
          </div>

          {/* Licence-pending notice — the honest state of this page. The old
              live-clock and live-rate loader lines described a feed that
              is no longer displayed. */}
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10,
            padding: '14px 18px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}>
            <span style={{ color: '#F59E0B', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 1 }}>DATA LICENCE PENDING</span>
            {' — '}
            No currency-pair source is licensed for display yet, so every value on this page shows
            &ldquo;—&rdquo; with its source reading <span style={{ color: '#F59E0B' }}>licence pending</span>.
            Rates will appear, each with its source and observation time, once a source is cleared.
            For live rates use your broker or an official reference (e.g. the RBI/FBIL reference rate).
          </div>
        </div>
      </div>

      {/* Forex Table — the FD-15 contract columns: instrument, value, unit,
          source, as-of, state. No analytics columns render: bid/ask/spread/
          forwards/PPP had no source and never will without one. */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
          {t('forex.currencyPairs')}
        </div>

        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {[
                    { label: t('forex.pair') },
                    { label: t('forex.spot'), tip: 'The pair rate — shows once a licensed source is wired' },
                    { label: '24H CHANGE', tip: 'Shows with the rate once a licensed source is wired' },
                    { label: 'SOURCE' },
                    { label: 'AS OF' },
                    { label: 'STATE' },
                  ].map((h, i) => (
                    <th key={h.label} title={h.tip} style={{
                      textAlign: i === 0 ? 'left' : 'right',
                      padding: '14px 24px',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      letterSpacing: 1,
                      fontWeight: 600,
                    }}>{h.label.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pairList.map(pair => {
                  const rateRow = licencePendingRow(pair.quote === 'INR' ? `INR per ${pair.base}` : `${pair.quote} per ${pair.base}`);
                  return (
                    <tr
                      key={pair.symbol}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => router.push('/forex/' + pair.symbol)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                          <span>{pair.baseCurrency}/{pair.quoteCurrency}</span>
                          <MarketStateChip row={rateRow} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pair.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 18, fontFamily: 'monospace' }}>
                        <MarketValueCell row={rateRow} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        —
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <MarketSourceCell row={rateRow} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <MarketAsOfCell row={rateRow} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <MarketUnitNote row={rateRow} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <ProvenanceChip state="unavailable" title="No forex source is licensed for display yet — values stay — until one is cleared" />
          {' '}
          The unit column states each pair&rsquo;s quotation basis. Pair definitions are reference data;
          no rate, change, spread or forward renders without a licensed source and an observation time.
        </div>
      </div>
    </main>
  );
}
