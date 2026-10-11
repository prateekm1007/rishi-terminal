'use client';

/**
 * SimulatedPersonaChip — the FD-25 per-card persona label (founder order
 * 11 Oct 2026, words verbatim: "Keep Michael Saylor and Vitalik as persona
 * labels." — "Each carries the 'simulated persona' label").
 *
 * Rendered next to the guru name on every asset-side guru card. The P0-7
 * rules still apply: no quotations and no first-person speech as the real
 * person (the quote fields are gone; the framework lines are descriptive
 * reads of public frameworks, never attributed speech).
 */
import { SIMULATED_PERSONA_LABEL } from '@/lib/gurus/heuristic';

export default function SimulatedPersonaChip() {
  return (
    <span
      data-testid="simulated-persona-chip"
      style={{
        display: 'inline-block',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 4,
        padding: '2px 6px',
        marginLeft: 8,
        verticalAlign: 'middle',
      }}
    >
      {SIMULATED_PERSONA_LABEL}
    </span>
  );
}
