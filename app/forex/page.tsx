import { FOREX_PAIRS } from '../../data/forex';
import Link from 'next/link';

export const metadata = {
  title: 'Forex Dashboard — Rishi Terminal',
  description: 'Currency pairs analyzed through macro-economic Rishi wisdom',
};

export default function ForexPage() {
  const pairList = Object.values(FOREX_PAIRS);
  
  const avgVol = (pairList.reduce((sum, p) => sum + p.volatility, 0) / pairList.length).toFixed(1);
  const totalVolume = pairList.reduce((sum, p) => sum + p.volume24h, 0);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>FOREX</span>
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                💱 Forex Dashboard
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.6 }}>
                Major currency pairs analyzed through macro-economic Rishi perspectives
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, padding: '16px 24px', minWidth: 160 }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 2, marginBottom: 8 }}>PAIRS</div>
              <div style={{ fontSize: 48, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-gold)', lineHeight: 1 }}>
                {pairList.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>INR Cross Rates</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'Avg Volatility', value: avgVol + '%', color: 'var(--accent-gold)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
              { label: '24h Volume', value: '$' + (totalVolume / 1e9).toFixed(1) + 'B', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { label: 'USD/INR Spot', value: '' + FOREX_PAIRS.USDINR.spotRate.toFixed(2), color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
              { label: 'EUR/INR Spot', value: '' + FOREX_PAIRS.EURINR.spotRate.toFixed(2), color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
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
                <div style={{ fontSize: 24, fontFamily: 'JetBrains Mono', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forex Table */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12, overflow: 'hidden' }}>
          
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)' }}>
            <h2 style={{ fontSize: 18, fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', letterSpacing: 1 }}>
              Currency Pairs
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>PAIR</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>SPOT</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>BID</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>ASK</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>SPREAD</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>1M FWD</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>VOL %</th>
                  <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', letterSpacing: 1 }}>PPP</th>
                </tr>
              </thead>
              <tbody>
                {pairList.map(pair => {
                  const volColor = 
                    pair.volatility < 5 ? 'var(--accent-green)' :
                    pair.volatility < 7 ? 'var(--accent-gold)' :
                    'var(--accent-red)';

                  return (
                    <tr key={pair.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16, marginBottom: 4 }}>
                          {pair.baseCurrency}/{pair.quoteCurrency}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pair.name}</div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontWeight: 700, fontSize: 18, color: 'var(--accent-gold)' }}>
                        {pair.spotRate.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--accent-green)' }}>
                        {pair.bid.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--accent-red)' }}>
                        {pair.ask.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {pair.spread.toFixed(4)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {pair.forward1M.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          padding: '4px 10px', 
                          borderRadius: 6, 
                          background: `${volColor}20`, 
                          color: volColor,
                          fontFamily: 'JetBrains Mono'
                        }}>
                          {pair.volatility.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {pair.pppValue.toFixed(2)}
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
          FOREX MARKET DATA · RISHI TERMINAL v4.0 · MULTI-ASSET WISDOM OS
        </div>
      </div>

    </main>
  );
}