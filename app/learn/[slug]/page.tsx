import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PHILOSOPHIES, philosophyBySlug } from '@/data/learning/philosophies';
import { SCREENER_PRESETS } from '@/lib/screener/presets';

/**
 * R4-07 (Round 16 C7): one philosophy page per registry entry. Static,
 * sourced, no seed data (nothing scored here — no SeedDataBanner owed;
 * the N3 discovery test agrees: this module imports no scoring surface).
 */
export function generateStaticParams() {
  return PHILOSOPHIES.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const p = philosophyBySlug(slug);
    if (!p) return { title: 'Not found | Rishi Terminal' };
    return {
      title: p.title,
      description: p.description,
      alternates: { canonical: `/learn/${p.slug}` },
    };
  });
}

export default async function PhilosophyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = philosophyBySlug(slug);
  if (!p) notFound();

  const preset = SCREENER_PRESETS.find((x) => x.id === p.screenerPreset);

  return (
    <main className="page-bg">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
        <p className="page-breadcrumb">
          <Link href="/" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>RISHI</Link>
          <span style={{ margin: '0 8px' }}>&rsaquo;</span>
          <Link href="/learn" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>LEARN</Link>
          <span style={{ margin: '0 8px' }}>&rsaquo;</span>
          <span>{p.rishiName.toUpperCase()}</span>
        </p>

        <h1 className="page-title" style={{ color: 'var(--accent-gold)' }}>{p.rishiName}</h1>
        <p style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>{p.biography.text}</p>
        <p style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {p.biography.sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && ' · '}
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)' }}>
                {s.label}
              </a>
            </span>
          ))}
        </p>

        <h2 style={{ color: 'var(--text-primary)', marginTop: 36, fontSize: 20 }}>The philosophy, as documented</h2>
        <ol style={{ paddingLeft: 20, display: 'grid', gap: 18, marginTop: 16 }}>
          {p.principles.map((pr, i) => (
            <li key={i} style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>
              {pr.text}
              <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 4 }}>
                {pr.sources.map((s, j) => (
                  <span key={s.url}>
                    {j > 0 && ' · '}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-gold)' }}>
                      {s.label}
                    </a>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <h2 style={{ color: 'var(--text-primary)', marginTop: 40, fontSize: 20 }}>How this terminal scores it</h2>
        <p style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>
          The <code style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{p.howWeScoreIt.scorer}</code> module
          weighs {p.howWeScoreIt.factors.join(', ')}. The full engine, weights and thresholds are documented on
          the <Link href="/methodology" style={{ color: 'var(--accent-gold)' }}>methodology page</Link>. The
          scores are computed from the dataset the terminal currently holds and are labeled for what they are.
        </p>

        {preset && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: 12,
            padding: '16px 20px',
            marginTop: 28,
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace', marginBottom: 6 }}>
              TRY IT LIVE
            </div>
            <div style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
              The <Link href="/screener" style={{ color: 'var(--accent-gold)' }}>screener</Link>&apos;s
              &ldquo;{preset.name}&rdquo; preset applies this philosophy&apos;s quantitative screen
              ({preset.description}).
            </div>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 36, lineHeight: 1.6 }}>
          Educational content, not investment advice. Principles are paraphrased from the linked sources;
          direct quotations are verbatim from the cited page. No claim on this page is a claim about returns.
        </p>
      </div>
    </main>
  );
}
