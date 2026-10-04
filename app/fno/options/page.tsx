'use client';

/**
 * Options Chain — data unavailable.
 *
 * The previous implementation rendered a synthetic options chain (OI / IV /
 * volume from a seeded random number generator) and a random IV rank with
 * hardcoded expiry dates, presented as live market data. A real chain requires
 * licensed NSE derivatives data, which is not available yet, so this page
 * renders an explicit empty state instead of synthetic numbers.
 */
export default function OptionsChainPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
            📋 Options Chain
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Options chain analytics — pending licensed NSE derivatives data
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '420px', flexDirection: 'column', gap: 16,
          background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(30,41,59,0.8)',
          borderRadius: 16, color: 'var(--text-muted)', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8', maxWidth: 560, lineHeight: 1.6 }}>
            F&amp;O analytics require licensed NSE derivatives data and are not available yet.
          </div>
          <div style={{ fontSize: 12, maxWidth: 520, lineHeight: 1.7 }}>
            The options chain, Open Interest, IV Rank, Max Pain and PCR figures shown here
            previously were synthetic and have been removed. This page will be enabled once
            a licensed derivatives data source is integrated.
          </div>
        </div>

      </div>
    </main>
  );
}
