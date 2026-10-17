import Link from 'next/link';

import { listMethodologyDocs } from '@/lib/methodology';
import { trackingLineFor, trackingStatusFor } from '@/lib/demoState'; // DEMO-2 + TODAY-VERDICTS: the honest tracking line (one wording source; the STATE is the verdicts ledger's)
import { readTrackingState } from '@/lib/verdicts/store'; // TODAY-VERDICTS: the calibration track's state (one state source, shared with the Today panel)
import { isBuildPhase } from '@/lib/dashboardSnapshot'; // the build bakes the honest not-started state — no reads, hermetic prerender
import { routeMetadata } from "@/lib/seo/routeMetadata";

export const metadata = routeMetadata({
  path: "/methodology",
  title: "Methodology | Rishi Terminal",
  description: "How every Rishi score is computed: inputs, formulas, thresholds, rationale, failure modes and non-applicable sectors.",
});

// TODAY-VERDICTS: this page was fully static (build-time) while its
// tracking line claimed a state that could change at runtime. The
// calibration track's state now derives from the verdicts ledger
// (migration 036), so the page regenerates hourly to carry the SAME
// line the Today panel renders (rule 14: one state source) — never a
// build-baked "not started" that outlives the first recorded baseline.
export const revalidate = 3600;

/**
 * S2-01 (Round 13): the public methodology index. Statically generated
 * from docs/methodology/*.md at build time — the runtime reads nothing
 * (TODAY-VERDICTS exception: the ONE tracking-state read above, a
 * cheap ledger read, never a vendor fetch).
 */
export default async function MethodologyPage() {
  const docs = await listMethodologyDocs();
  const tracking = isBuildPhase() ? null : await readTrackingState();

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

        <div
          data-methodology-tracking
          style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '10px 14px', marginTop: 16, border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12 }}
        >
          Forward-return tracking: <strong style={{ color: 'var(--text-primary)' }}>{trackingStatusFor(tracking)}</strong> ({trackingLineFor(tracking)}) — the
          S2-03/S2-04 calibration track&apos;s day-0 baselines are recorded alongside each produced verdict on live fundamentals (the verdicts ledger);
          forward-return measurements begin after the next session close.
        </div>

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

            </Link>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>
          {docs.length} documents · one per framework.
        </p>
      </div>
    </main>
  );
}
