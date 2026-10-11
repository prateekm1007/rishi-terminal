import Link from 'next/link';

/**
 * Round-46 P0-1 (founder audit 2026-10-11): a record whose fundamentals
 * are ILLUSTRATIVE SEED INPUTS (dataQuality 'seed') renders NO verdict —
 * no consensus tile, no QVPS gauge, no council, no per-Rishi scores. The
 * founder's order: "Seed rows show no verdict, and the badge reads from
 * that field." This record replaces the page's verdict area and says why,
 * while the honestly-labelled surfaces (prices with provenance, the
 * provenance-labelled metrics panel, peers) keep rendering below it.
 *
 * (A dataQuality 'missing' record — no usable data at all — still gets
 * the whole-page InsufficientDataRecord; this component is the seed
 * state's in-page record.)
 */
export function NoVerdictRecord() {
  return (
    <div className="card-unified" style={{ padding: 24, borderLeft: '3px solid #D4AF37' }}>
      <div style={{ fontSize: 11, letterSpacing: 2, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', marginBottom: 10 }}>
        NO VERDICT — ILLUSTRATIVE SEED DATA
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
        This record&rsquo;s fundamentals are illustrative seed inputs (data quality:{' '}
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>seed</span>) — not
        observations from a live source. Every score, verdict, debate or ranking computed from them would
        present placeholder numbers as analysis, so none is shown: no consensus score, no per-Rishi verdicts,
        no council, no Quality-Value Pillar Score.
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7, margin: '14px 0 0' }}>
        What brings verdicts back: live fundamentals covering every scored field of
        this record. The moment the data quality is <span style={{ fontFamily: 'var(--font-mono)' }}>live</span> or{' '}
        <span style={{ fontFamily: 'var(--font-mono)' }}>delayed</span>, the verdict surfaces render here again.
        Until then the page keeps what is real: prices with their own source and observation time, the
        provenance-labelled metrics below, and the peer table.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <Link
          href="/methodology"
          style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1, color: '#D4AF37', textDecoration: 'none', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 6, padding: '5px 12px', background: 'rgba(255,215,0,0.06)' }}
        >
          How verdicts are produced →
        </Link>
      </div>
    </div>
  );
}
