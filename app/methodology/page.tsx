import type { Metadata } from 'next';
import Link from 'next/link';

import { listMethodologyDocs } from '@/lib/methodology';

export const metadata: Metadata = {
  title: 'Methodology | Rishi Terminal',
  description:
    'How every Rishi score is computed: inputs, formulas, thresholds, rationale, failure modes and non-applicable sectors.',
};

/**
 * S2-01 (Round 13): the public methodology index. Statically generated
 * from docs/methodology/*.md at build time — the runtime reads nothing.
 */
export default async function MethodologyPage() {
  const docs = await listMethodologyDocs();

  return (
    <main className="page-bg">
      <div className="page-content page-header" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 64 }}>
        <Link href="/" className="back-link">← Back to Rishi Terminal</Link>
        <h1 className="page-title" style={{ color: 'var(--accent-gold)' }}>Methodology</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 12 }}>
          What each Rishi score actually computes: the inputs, the formula, the thresholds, the rationale,
          the known failure modes, and the sectors where the framework does not apply. These documents
          describe what the code does — the panel is an educational simulation inspired by well-known
          investors, not the real people, and not investment advice.
        </p>

        <div className="card-unified" style={{ padding: 20, marginTop: 24 }}>
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/methodology/${doc.slug}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
                padding: '10px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{doc.title}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                /{doc.slug}
              </span>
            </Link>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          {docs.length} documents · generated from the repository at build time.
        </p>
      </div>
    </main>
  );
}
