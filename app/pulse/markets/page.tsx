'use client';

import Link from 'next/link';
import { WorldMarketsGrid } from '../../../components/markets/WorldMarketsGrid';

export default function WorldMarketsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/pulse" style={{
            fontSize: 11,
            color: 'var(--gold)',
            textDecoration: 'none',
            letterSpacing: 1
          }}>
            ← ECONOMY PLUS
          </Link>

          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            marginTop: 16,
            marginBottom: 8
          }}>
            World Markets Command Center
          </h1>

          <p style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            maxWidth: 600
          }}>
            Real-time global market intelligence — capital flows, regime detection, and cross-market signals
          </p>
        </div>

        <WorldMarketsGrid />

      </div>
    </div>
  );
}