'use client';

import { useLanguage } from '@/lib/language';

/**
 * F&O Strategy Backtester — data unavailable.
 *
 * The previous implementation fabricated P&L, win rates and Sharpe ratios from
 * deterministic pseudo-random functions with no market data. Real backtesting requires
 * licensed NSE derivatives data, which is not available yet, so this page
 * renders an explicit empty state instead of simulated results.
 */
export default function FnoBacktesterPage() {
  const { t } = useLanguage();

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 24px', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, color: 'var(--text-primary)', marginBottom: 8 }}>
            📊 F&amp;O Strategy Backtester
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Strategy backtesting on historical derivatives data
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '420px', flexDirection: 'column', gap: 16,
          background: 'rgba(17,24,39,0.5)', border: '1px solid rgba(30,41,59,0.8)',
          borderRadius: 16, color: '#64748B', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#94A3B8', maxWidth: 560, lineHeight: 1.6 }}>
            F&amp;O analytics require licensed NSE derivatives data and are not available yet.
          </div>
          <div style={{ fontSize: 12, maxWidth: 520, lineHeight: 1.7 }}>
            Historical options backtesting, simulated P&amp;L and performance metrics have been
            removed because they cannot be produced reliably without licensed market data.
            This page will be enabled once a licensed data source is integrated.
          </div>
        </div>

      </div>
    </main>
  );
}
