'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FOREX_PAIRS } from '../../data/forex';
import { useLanguage } from '../../lib/language';

export default function ForexPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const pairList = Object.values(FOREX_PAIRS);

  const avgVol = (pairList.reduce((sum, p) => sum + p.volatility, 0) / pairList.length).toFixed(1);
  const totalVolume = pairList.reduce((sum, p) => sum + p.volume24h, 0);

  const volColor = (vol: number) =>
    vol < 5 ? 'var(--accent-green)' : vol < 7 ? 'var(--accent-gold)' : 'var(--accent-red)';

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
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

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: t('forex.avgVolatility'), value: avgVol + '%',                                      color: 'var(--accent-gold)',  bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
              { label: t('forex.volume24h'),      value: '$' + (totalVolume / 1e9).toFixed(1) + 'B',       color: 'var(--accent-green)', bg: 'rgba(0,186,124,0.08)', border: 'rgba(0,186,124,0.2)' },
              { label: t('forex.usdInrSpot'),    value: FOREX_PAIRS.USDINR.spotRate.toFixed(2),          color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
              { label: t('forex.eurInrSpot'),    value: FOREX_PAIRS.EURINR.spotRate.toFixed(2),          color: '#c084fc',             bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
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
                <div style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forex Table */}
      <div className="content-wrapper" style={{ padding: '28px 24px' }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 16, fontFamily: 'monospace' }}>
          {t('forex.currencyPairs')}
        </div>

        <div className="card-sacred" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  {[t('forex.pair'), t('forex.spot'), t('forex.bid'), t('forex.ask'), t('forex.spread'), t('forex.forward1m'), t('forex.volatility'), t('forex.ppp')].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'right',
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
                {pairList.map(pair => (
                  <tr
                    key={pair.symbol}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => router.push('/forex/' + pair.symbol)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, marginBottom: 4 }}>
                        {pair.baseCurrency}/{pair.quoteCurrency}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pair.name}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, fontSize: 18, color: 'var(--accent-gold)', fontFamily: 'monospace' }}>
                      {pair.spotRate.toFixed(pair.baseCurrency === 'JPY' ? 4 : 2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--accent-green)', fontFamily: 'monospace' }}>
                      {pair.bid.toFixed(pair.baseCurrency === 'JPY' ? 4 : 2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--accent-red)', fontFamily: 'monospace' }}>
                      {pair.ask.toFixed(pair.baseCurrency === 'JPY' ? 4 : 2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                      {((pair as any).spread || (pair.ask - pair.bid)).toFixed(4)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {((pair as any).forward1M || pair.forward3M).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: volColor(pair.volatility) + '20',
                        color: volColor(pair.volatility),
                        fontFamily: 'monospace',
                      }}>
                        {pair.volatility.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {pair.pppValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-primary)' }}>
          {t('forex.footer')}
        </div>
      </div>

    </main>
  );
}