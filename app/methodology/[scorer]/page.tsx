import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { listMethodologyDocs, getMethodologyDoc, METHODOLOGY_REQUIRED_HEADINGS } from '@/lib/methodology';
import { parseInline } from '@/lib/methodology/markdown';
import { SITE_URL } from "@/lib/seo/site";

export const revalidate = 3600;

interface Props {
  params: Promise<{ scorer: string }>;
}

/** Statically pre-render every methodology doc at build time. */
export async function generateStaticParams() {
  const docs = await listMethodologyDocs();
  return docs.map((d) => ({ scorer: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { scorer } = await params;
  const doc = await getMethodologyDoc(scorer);
  // WP1: the doc URL names itself — the canonical was the site root and
  // og inherited the generic defaults.
  const canonicalUrl = `${SITE_URL}/methodology/${scorer}`;
  const title = doc ? `${doc.title} | Rishi Terminal Methodology` : 'Methodology | Rishi Terminal';
  const description = doc
    ? `${doc.title} — the inputs, formula, thresholds and known failure modes of the Rishi score.`
    : 'How every Rishi score is computed.';
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl, type: 'article' },
  };
}

/** Inline spans — text nodes only, never raw HTML. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((span, i) =>
        span.kind === 'strong' ? (
          <strong key={i}>{span.text}</strong>
        ) : span.kind === 'code' ? (
          <code key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92em', color: 'var(--accent-gold)' }}>
            {span.text}
          </code>
        ) : (
          <span key={i}>{span.text}</span>
        ),
      )}
    </>
  );
}

export default async function MethodologyDocPage({ params }: Props) {
  const { scorer } = await params;
  const doc = await getMethodologyDoc(scorer);
  if (!doc) notFound();

  const covered = METHODOLOGY_REQUIRED_HEADINGS.filter((h) => doc.headings.includes(h));

  return (
    <main className="page-bg">
      <div className="page-content page-header" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 64 }}>
        <Link href="/methodology" className="back-link">← All methodology</Link>
        <div className="card-unified" style={{ padding: 28, marginTop: 20 }}>
          {doc.blocks.map((block, i) => {
            if (block.type === 'h1') {
              return (
                <h1 key={i} style={{ fontSize: 22, color: 'var(--accent-gold)', marginBottom: 8 }}>{block.text}</h1>
              );
            }
            if (block.type === 'h2') {
              return (
                <h2 key={i} style={{ fontSize: 16, color: 'var(--accent-gold)', margin: '22px 0 8px' }}>{block.text}</h2>
              );
            }
            if (block.type === 'h3') {
              return (
                <h3 key={i} style={{ fontSize: 14, color: 'var(--text-primary)', margin: '16px 0 6px' }}>{block.text}</h3>
              );
            }
            if (block.type === 'ul') {
              return (
                <ul key={i} style={{ margin: '8px 0', paddingLeft: 20, listStyle: 'disc' }}>
                  {block.items.map((item, j) => (
                    <li key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      <Inline text={item} />
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === 'code') {
              return (
                <pre
                  key={i}
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: 12,
                    overflowX: 'auto',
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {block.text}
                </pre>
              );
            }
            return (
              <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: '8px 0' }}>
                <Inline text={block.text} />
              </p>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, fontFamily: 'var(--font-mono)' }}>
          required sections present: {covered.length}/{METHODOLOGY_REQUIRED_HEADINGS.length}
          {covered.length === METHODOLOGY_REQUIRED_HEADINGS.length ? ' ✓' : ''} · source: docs/methodology/{doc.slug}.md
        </p>
      </div>
    </main>
  );
}
