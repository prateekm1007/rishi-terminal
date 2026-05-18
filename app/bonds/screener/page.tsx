'use client';

export const dynamic = 'force-dynamic';

import { BONDS } from '../../../data/bonds';
import Link from 'next/link';

export default function BondScreenerPage() {
  const bondList = Object.values(BONDS).sort((a, b) => b.ytm - a.ytm);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>€º</span>
            <Link href="/bonds" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>BONDS</Link>
            <span style={{ margin: '0 8px' }}>€º</span>
            <span>SCREENER</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            ðŸ“‹ Bond Screener
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480 }}>
            {bondList.length} bonds sorted by yield to maturity
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, overflow: 'hidden' }}>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>BOND</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>TYPE</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>YTM †“</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>COUPON</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>PRICE</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>DURATION</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>RATING</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>SPREAD</th>
                </tr>
              </thead>
              <tbody>
                {bondList.map((bond, i) => {
                  const typeColor = 
                    bond.type === 'G-Sec' ? 'var(--accent-green)' :
                    bond.type === 'SDL' ? '#60a5fa' :
                    bond.type === 'Corporate' ? 'var(--accent-gold)' :
                    '#c084fc';

                  return (
                    <tr key={bond.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 24 }}>#{i + 1}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{bond.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{bond.issuer}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <span style={{ 
                          fontSize: 10, 
                          fontWeight: 700, 
                          padding: '4px 10px', 
                          borderRadius: 6, 
                          background: `${typeColor}20`, 
                          color: typeColor,
                          fontFamily: 'JetBrains Mono'
                        }}>
                          {bond.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, fontSize: 18, color: 'var(--accent-gold)' }}>
                        {bond.ytm.toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {bond.couponRate.toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {bond.price.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {bond.duration.toFixed(1)}y
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {bond.rating}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: bond.spread > 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                        {bond.spread > 0 ? `+${bond.spread}bps` : '€”'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </main>
  );
}