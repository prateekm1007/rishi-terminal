import { PHILOSOPHIES } from '@/data/learning/philosophies';
import Link from 'next/link';

/**
 * R4-07 (Round 16 C7): the learning-hub index. Every philosophy page
 * carries a unique title/description and sourced content (tested by
 * test/r4-07.learn.test.ts — the founder's copy-audit acceptance).
 */
export const metadata = {
  title: 'Learning Hub — investing philosophies, sourced | Rishi Terminal',
  description:
    'Plain-English explanations of the investing philosophies behind the Rishi Terminal scores, every claim linked to its source, with links into the live methodology and screener.',
  alternates: { canonical: '/learn' },
};

export default function LearnIndexPage() {
  return (
    <main className="page-bg">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <p className="page-breadcrumb">
          <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI</Link>
          <span style={{ margin: '0 8px' }}>&rsaquo;</span>
          <span>LEARN</span>
        </p>
        <h1 className="page-title" style={{ color: 'var(--accent-gold)' }}>Learning Hub</h1>
        <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 32 }}>
          The philosophies behind this terminal&apos;s Rishi scores, explained in plain English.
          Every factual claim links to its source — these are educational pages, not investment
          advice, and they make no claims about returns. The{' '}
          <Link href="/methodology" style={{ color: 'var(--accent-gold)' }}>methodology page</Link>{' '}
          documents exactly how the scores are computed.
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          {PHILOSOPHIES.map((p) => (
            <Link
              key={p.slug}
              href={`/learn/${p.slug}`}
              style={{
                display: 'block',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: '20px 24px',
                textDecoration: 'none',
              }}
            >
              <div style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 18 }}>
                {p.rishiName}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>
                {p.description}
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, marginTop: 10, fontFamily: 'monospace' }}>
                {p.principles.length} sourced principles · try the &ldquo;{p.screenerPreset}&rdquo; screen
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
