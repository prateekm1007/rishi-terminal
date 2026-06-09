import Link from 'next/link';

export const metadata = {
  title: 'Forex Rishis — Rishi Terminal',
  description: 'Currency trading wisdom from legendary macro investors',
};

const FOREX_RISHIS = [
  {
    name: 'George Soros',
    title: 'The Man Who Broke the Bank of England',
    philosophy: 'Reflexivity Theory',
    origin: 'Global',
    icon: '🦅',
    color: 'var(--accent-gold)',
    expertise: 'Central bank psychology, currency crises, macro trends',
    quote: 'Markets are constantly in a state of uncertainty and flux, and money is made by discounting the obvious and betting on the unexpected.',
  },
  {
    name: 'Stanley Druckenmiller',
    title: 'Macro Master',
    philosophy: 'Top-Down Analysis',
    origin: 'Global',
    icon: '🎯',
    color: '#60a5fa',
    expertise: 'Regime change detection, position sizing, trend following',
    quote: 'The way to build long-term returns is through preservation of capital and home runs.',
  },
  {
    name: 'Paul Tudor Jones',
    title: 'Defensive Trader',
    philosophy: 'Risk-First Approach',
    origin: 'Global',
    icon: '🛡️',
    color: 'var(--accent-green)',
    expertise: 'Technical analysis, macro overlays, volatility trading',
    quote: 'Where you want to be is always in control, never wishing, always trading, and always, first and foremost protecting your butt.',
  },
  {
    name: 'Raghuram Rajan',
    title: 'The Institutional Thinker',
    philosophy: 'Policy-Aware Macro',
    origin: 'India',
    icon: '🏛️',
    color: '#c084fc',
    expertise: 'Emerging markets, central bank actions, capital flows',
    quote: 'The rupee finds its level based on fundamentals, not speculation.',
  },
];

export default function ForexRishisPage() {
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
            <span>RISHIS</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            🗿 Forex Rishis
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480 }}>
            Currency wisdom from legendary macro investors
          </p>
        </div>
      </div>

      {/* Rishis Grid */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {FOREX_RISHIS.map(rishi => (
            <div
              key={rishi.name}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ 
                  fontSize: 48, 
                  width: 72, 
                  height: 72, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: `${rishi.color}20`,
                  borderRadius: 12,
                }}>
                  {rishi.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {rishi.name}
                  </h3>
                  <div style={{ fontSize: 11, color: rishi.color, fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>
                    {rishi.title}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>
                  PHILOSOPHY
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {rishi.philosophy}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1 }}>
                  EXPERTISE
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {rishi.expertise}
                </div>
              </div>

              <div style={{ 
                padding: 16, 
                background: 'var(--bg-secondary)', 
                borderRadius: 8, 
                borderLeft: `3px solid ${rishi.color}`,
                fontStyle: 'italic',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}>
                "{rishi.quote}"
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <span style={{ 
                  fontSize: 10, 
                  padding: '4px 10px', 
                  background: `${rishi.color}20`, 
                  color: rishi.color, 
                  borderRadius: 6,
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 600,
                }}>
                  {rishi.origin}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div style={{ 
          marginTop: 48, 
          padding: 32, 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-primary)', 
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <h3 style={{ fontSize: 18, fontFamily: 'Cinzel, serif', color: 'var(--text-primary)', marginBottom: 8 }}>
            Forex Rishi Scoring Engine
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
            Full currency analysis through these Rishi perspectives coming soon. Each will analyze pairs based on their unique macro philosophy.
          </p>
        </div>
      </div>

    </main>
  );
}