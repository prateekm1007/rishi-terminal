import Link from 'next/link';
import SeedDataBanner from '../shared/SeedDataBanner';
import type { Stock } from '@/lib/types';

/**
 * Round-5 audit (findings 1, 8): a record whose fundamentals are
 * internally inconsistent (e.g. P/E 0 alongside positive net profit, or
 * ROE 0 with positive profit and book value) must not render ANY scored
 * surface — no consensus verdicts, no QVPS panel, no elite-knowledge
 * debate, no technical-edge signals. Pre-fix, KWALITY ranked as a top
 * buy AND its page showed five bullish Rishis at 94-100 with zero bears
 * on numbers that cannot all be true. The rankings gate landed first;
 * this component gates the page itself.
 */
export function InsufficientDataRecord({ stock }: { stock: Stock }) {
  return (
    <main className="page-bg">
      <div className="page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px' }}>
        <Link href="/" className="back-link">← Back to Rishi Terminal</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, marginBottom: 8 }}>
          <div style={{ fontSize: 34 }}>🧘</div>
          <div>
            <h1 className="page-title" style={{ fontSize: 34, color: 'var(--accent-gold)', marginBottom: 2 }}>
              {stock.symbol}
            </h1>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{stock.name}</div>
          </div>
        </div>

        <SeedDataBanner suffix="this record is illustrative placeholder data" />

        <div className="card-unified" style={{ padding: 24, marginTop: 20, borderLeft: '3px solid #D4AF37' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', marginBottom: 10 }}>
            INSUFFICIENT DATA — NO VERDICT IS PRODUCED
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
            This record&rsquo;s fundamentals are internally inconsistent (for example, a P/E of zero
            alongside positive reported profit). When the inputs contradict each other, every score,
            verdict, debate or ranking derived from them would be noise presented as analysis — so
            none is shown. {stock.name} stays listed for completeness of the universe, and the
            record is excluded from Stock of the Day, Top Buys, Short Radar and screener counts.
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7, margin: '14px 0 0' }}>
            What fixes this: a real fundamentals source for {stock.symbol}. The dataset behind this
            page is an illustrative placeholder; live vendor data overrides it where the vendor has
            coverage, and this record currently has none.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <Link
            href="/stocks"
            style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, textDecoration: 'none' }}
          >
            Browse the screener
          </Link>
          <Link
            href="/rishis"
            style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.08)', color: 'var(--accent-gold)', fontSize: 13, textDecoration: 'none' }}
          >
            Chat with the Rishis
          </Link>
        </div>
      </div>
    </main>
  );
}
