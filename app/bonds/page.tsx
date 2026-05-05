import { BONDS } from '../../data/bonds';
import Link from 'next/link';

export const metadata = {
  title: 'Bond Market — Rishi Terminal',
  description: 'Government Securities, SDLs, Corporate Bonds analyzed through fixed-income Rishi perspectives',
};

export default function BondsPage() {
  const bondList = Object.values(BONDS);
  const gSecs = bondList.filter(b => b.type === 'G-Sec');
  const sdls = bondList.filter(b => b.type === 'SDL');
  const corporate = bondList.filter(b => b.type === 'Corporate');
  const tbills = bondList.filter(b => b.type === 'T-Bill');

  const avgYTM = (bondList.reduce((sum, b) => sum + b.ytm, 0) / bondList.length).toFixed(2);
  const avgDuration = (bondList.reduce((sum, b) => sum + b.duration, 0) / bondList.length).toFixed(1);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>BOND MARKET</span>
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                🏛️ Bond Market Dashboard
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                G-Secs, SDLs, Corporate Bonds & T-Bills analyzed through fixed-income Rishi wisdom
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>TOTAL BONDS</div>
              <div style={{ fontSize: 48, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {bondList.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Sovereign + Corporate</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'G-Secs', count: gSecs.length, color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { label: 'SDLs', count: sdls.length, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
              { label: 'Corporate', count: corporate.length, color: 'var(--accent-gold)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
              { label: 'T-Bills', count: tbills.length, color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
              { label: 'Avg YTM', count: avgYTM + '%', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { label: 'Avg Duration', count: avgDuration + 'y', color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  border: `1px solid ${stat.border}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono', fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bond Table */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, overflow: 'hidden' }}>
          
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
            <h2 style={{ fontSize: 18, fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', letterSpacing: 1 }}>
              All Bonds
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>BOND</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>TYPE</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>COUPON</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>YTM</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>PRICE</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>DURATION</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>RATING</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>MATURITY</th>
                </tr>
              </thead>
              <tbody>
                {bondList.map(bond => {
                  const typeColor = 
                    bond.type === 'G-Sec' ? 'var(--accent-green)' :
                    bond.type === 'SDL' ? '#60a5fa' :
                    bond.type === 'Corporate' ? 'var(--accent-gold)' :
                    '#c084fc';

                  return (
                    <tr key={bond.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{bond.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{bond.symbol}</div>
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
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {bond.couponRate.toFixed(2)}%
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, color: 'var(--accent-green)' }}>
                        {bond.ytm.toFixed(2)}%
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
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(bond.maturityDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-primary)' }}>
          BOND MARKET DATA · RISHI TERMINAL v4.0 · MULTI-ASSET WISDOM OS
        </div>
      </div>

    </main>
  );
}