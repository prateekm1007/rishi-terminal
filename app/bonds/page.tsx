'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BONDS } from '../../data/bonds';
import { useLanguage } from '../../lib/language';

type BondType = 'All' | 'G-Sec' | 'SDL' | 'Corporate' | 'T-Bill';

function typeColor(type: string) {
  if (type === 'G-Sec')     return 'var(--accent-green)';
  if (type === 'SDL')       return '#60a5fa';
  if (type === 'Corporate') return 'var(--accent-gold)';
  return '#c084fc';
}

export default function BondsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<BondType>('All');
  const [sortBy, setSortBy] = useState<'ytm' | 'duration' | 'maturity'>('ytm');

  const bondList = Object.values(BONDS);

  const filtered = typeFilter === 'All'
    ? bondList
    : bondList.filter(b => b.type === typeFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'ytm')      return b.ytm - a.ytm;
    if (sortBy === 'duration') return b.duration - a.duration;
    return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
  });

  const gSecs     = bondList.filter(b => b.type === 'G-Sec');
  const sdls      = bondList.filter(b => b.type === 'SDL');
  const corporate = bondList.filter(b => b.type === 'Corporate');
  const tbills    = bondList.filter(b => b.type === 'T-Bill');

  const avgYTM      = (bondList.reduce((sum, b) => sum + b.ytm, 0) / bondList.length).toFixed(2);
  const avgDuration = (bondList.reduce((sum, b) => sum + b.duration, 0) / bondList.length).toFixed(1);

  const types: BondType[] = ['All', 'G-Sec', 'SDL', 'Corporate', 'T-Bill'];

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            {' > '}
            <span>{t('bonds.breadcrumb')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 36, color: 'var(--accent-gold)', letterSpacing: 2, marginBottom: 8 }}>
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
                {bondList.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {t('bonds.sovereignCorporate')}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: t('bonds.gSecs'),        count: gSecs.length,             color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { label: t('bonds.sdls'),          count: sdls.length,              color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
              { label: t('bonds.corporate'),     count: corporate.length,         color: 'var(--accent-gold)',  bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.2)' },
              { label: t('bonds.tBills'),       count: tbills.length,            color: '#c084fc',             bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
              { label: t('bonds.avgYtm'),       count: avgYTM + '%',             color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { label: t('bonds.avgDuration'), count: avgDuration + 'y',        color: '#f472b6',             bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  border: '1px solid ' + stat.border,
                  borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  fontWeight: typeFilter === t ? 700 : 400,
                  border: typeFilter === t ? 'none' : '1px solid var(--border-primary)',
                  background: typeFilter === t ? typeColor(t === 'All' ? 'G-Sec' : t) + '20' : 'var(--bg-card)',
                  color: typeFilter === t ? typeColor(t === 'All' ? 'G-Sec' : t) : 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', fontFamily: 'monospace' }}>
              {t('bonds.sortBy')}
            </span>
            {['ytm', 'duration', 'maturity'].map(sort => (
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
                {sort === 'ytm' ? t('bonds.sortYtm') : sort === 'duration' ? t('bonds.sortDuration') : t('bonds.sortMaturity')}
              </button>
            ))}
          </div>
        </div>

        {/* Bond Table */}
        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {[t('bonds.bond'), t('bonds.type'), t('bonds.coupon'), t('bonds.ytm'), t('bonds.price'), t('bonds.duration'), t('bonds.rating'), t('bonds.maturity')].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'right',
                      padding: '14px 24px',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      letterSpacing: 1,
                      fontWeight: 600,
                    }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(bond => (
                  <tr
                    key={bond.symbol}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => router.push('/bonds/' + bond.symbol)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {bond.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {bond.symbol}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '4px 10px',
                        borderRadius: 6, background: typeColor(bond.type) + '20',
                        color: typeColor(bond.type), fontFamily: 'monospace',
                      }}>
                        {bond.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {bond.couponRate.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                      {bond.ytm.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {bond.price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {bond.duration.toFixed(1)}y
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {bond.rating}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(bond.maturityDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-primary)' }}>
          {t('bonds.footer')}
        </div>
      </div>

    </main>
  );
}