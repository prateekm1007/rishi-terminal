import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * X3-09 (Round 15 B7): the offline page. Prerendered (no dynamic data —
 * Constitution 3: it makes no market claims), precached by the service
 * worker at install, and served by the worker when a navigation fails
 * while offline. Static export-friendly: no client hooks, no fetches.
 */
export const metadata: Metadata = {
  title: 'Offline — Rishi Terminal',
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #0A0F1C)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          textAlign: 'center',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 20,
          padding: '40px 32px',
          background: 'rgba(17,24,39,0.95)',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧘</div>
        <h1
          data-testid="offline-title"
          style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: 22, color: '#D4AF37', margin: '0 0 10px' }}
        >
          You are offline
        </h1>
        <p data-testid="offline-body" style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, margin: '0 0 20px' }}>
          The Rishi is unreachable right now — no internet connection was
          detected. Market data is never served from a stale cache, so
          nothing here would be honest to show. Reconnect and try again.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 22px',
            borderRadius: 10,
            background: 'linear-gradient(135deg,#A88B20,#D4AF37)',
            color: '#0A0F1C',
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Retry
        </Link>
      </div>
    </main>
  );
}
