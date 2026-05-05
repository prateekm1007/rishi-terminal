import { FOREX_PAIRS } from '../../../data/forex';
import Link from 'next/link';

export const metadata = {
  title: 'Currency Pairs — Rishi Terminal',
  description: 'Detailed analysis of major INR cross rates',
};

export default function ForexPairsPage() {
  const pairList = Object.values(FOREX_PAIRS);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link href="/forex" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>FOREX</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>PAIRS</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            🌍 Currency Pairs
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480 }}>
            Deep analysis of {pairList.length} major INR cross rates
          </p>
        </div>
      </div>

      {/* Pairs Grid */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {pairList.map(pair => {
            const volColor = 
              pair.volatility < 5 ? 'var(--accent-green)' :
              pair.volatility < 7 ? 'var(--accent-gold)' :
              'var(--accent-red)';

            return (
              <div
                key={pair.symbol}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>
                    {pair.symbol}
                  </div>
                  <h3 style={{ fontSize: 28, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 4 }}>
                    {pair.spotRate.toFixed(4)}
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {pair.name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 4 }}>BID</div>
                    <div style={{ fontSize: 16, color: 'var(--accent-green)', fontWeight: 600 }}>{pair.bid.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 4 }}>ASK</div>
                    <div style={{ fontSize: 16, color: 'var(--accent-red)', fontWeight: 600 }}>{pair.ask.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 4 }}>SPREAD</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{pair.spread.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 4 }}>VOLATILITY</div>
                    <div style={{ fontSize: 14, color: volColor, fontWeight: 600 }}>{pair.volatility.toFixed(1)}%</div>
                  </div>
                </div>

                <div style={{ 
                  padding: 16, 
                  background: 'var(--bg-secondary)', 
                  borderRadius: 8,
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 8 }}>
                    FORWARD RATES
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>1M</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pair.forward1M.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>3M</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pair.forward3M.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>6M</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pair.forward6M.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>1Y</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pair.forward1Y.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>PPP Value</div>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{pair.pppValue.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>24h Volume</div>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      ${(pair.volume24h / 1e9).toFixed(1)}B
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </main>
  );
}