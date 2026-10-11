'use client';

/**
 * GuruHeuristicNote — the FD-23 card label + provenance line (founder
 * order 11 Oct 2026, words verbatim: "Crypto cards score and category
 * back on reference data.").
 *
 * Rendered on EVERY asset-side guru card that shows a heuristic-reference
 * score: the exact label "Heuristic reference — static reference inputs,
 * not a verdict", with the source, its attribution and an as-of time
 * (lib/gurus/heuristic.ts is the ONE wording source — rule 14; do not
 * paraphrase).
 *
 * Non-dismissable, like SeedDataBanner: the disclosure is the contract.
 */
import {
  GURU_HEURISTIC_LABEL,
  guruHeuristicProvenanceLine,
} from '@/lib/gurus/heuristic';

export default function GuruHeuristicNote({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-testid="guru-heuristic-note"
      role="note"
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: '#D4AF37',
        background: 'rgba(212,175,55,0.07)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 6,
        padding: compact ? '3px 8px' : '5px 10px',
      }}
    >
      <div>{GURU_HEURISTIC_LABEL}</div>
      <div
        style={{
          fontWeight: 400,
          color: 'var(--text-muted)',
          fontSize: compact ? 8 : 9,
          marginTop: 3,
          letterSpacing: 0,
          lineHeight: 1.5,
        }}
      >
        {guruHeuristicProvenanceLine()}
      </div>
    </div>
  );
}
