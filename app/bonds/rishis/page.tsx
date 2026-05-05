import Link from 'next/link';

export const metadata = {
  title: 'Bond Rishis — Rishi Terminal',
  description: 'Fixed-income wisdom from legendary bond investors',
};

const BOND_RISHIS = [
  {
    name: 'Bill Gross',
    title: 'The Bond King',
    philosophy: 'Total Return Focus',
    origin: 'Global',
    icon: '👑',
    color: 'var(--accent-gold)',
    expertise: 'Macro trends, duration management, credit analysis',
    quote: 'Invest in the best house in a bad neighborhood, not the worst house in a good neighborhood.',
  },
  {
    name: 'Jeffrey Gundlach',
    title: 'The New Bond King',
    philosophy: 'Contrarian Value',
    origin: 'Global',
    icon: '🎯',
    color: '#60a5fa',
    expertise: 'Distressed debt, mortgage-backed securities',
    quote: 'The most important thing is to not lose money. The second most important thing is to not forget the first thing.',
  },
  {
    name: 'Ray Dalio',
    title: 'All Weather Strategist',
    philosophy: 'Risk Parity',
    origin: 'Global',
    icon: '🌊',
    color: 'var(--accent-green)',
    expertise: 'Economic cycles, inflation hedging, sovereign debt',
    quote: 'Cash is trash in an inflationary environment.',
  },
  {
    name: 'Raghuram Rajan',
    title: 'The Institutional Guru',
    philosophy: 'Policy-Aware Investing',
    origin: 'India',
    icon: '🏛️',
    color: '#c084fc',
    expertise: 'Central bank policy, emerging markets, currency risk',
    quote: 'The best time to buy bonds is when interest rates peak.',
  },
];

export default function BondRishisPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          
          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: 2 }}>
            <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI TERMINAL</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link href="/bonds" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>BONDS</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span>RISHIS</span>
          </p>

          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, color: 'var(--text-primary)', letterSpacing: 2, marginBottom: 8 }}>
            💎 Bond Rishis
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 480 }}>
            Fixed-income wisdom from legendary bond investors
          </p>
        </div>
      </div>

      {/* Rishis Grid */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {BOND_RISHIS.map(rishi => (
            <div
              key={rishi.name}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: 24,
                transition: 'all 0.3s ease',
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
            Bond Rishi Scoring Engine
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
            Full bond analysis through these Rishi perspectives coming soon. Each will score bonds based on their unique philosophy.
          </p>
        </div>
      </div>

    </main>
  );
}