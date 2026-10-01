/**
 * ProvenanceChip — the field-level data-state label (audit 2026-10-02 P1).
 *
 * Rule 3: LIVE / REFERENCE / UNAVAILABLE must be materially distinguishable
 * on every market surface. Pages mixing live prices with static reference
 * analytics used one page-level "Live" badge (or none) — this chip labels
 * the actual state of the value it sits next to.
 *
 * Variants:
 *   live        — green, from a live upstream observation
 *   reference   — amber, static/reference dataset (illustrative)
 *   unavailable — grey, no data (renders with the value's em dash)
 *   derived     — blue, computed here from the labelled inputs
 */
'use client';

export type ProvenanceState = 'live' | 'reference' | 'unavailable' | 'derived';

const STYLES: Record<ProvenanceState, { bg: string; border: string; color: string; label: string }> = {
  live: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.35)', color: '#22C55E', label: 'LIVE' },
  reference: { bg: 'rgba(212,175,55,0.10)', border: 'rgba(212,175,55,0.35)', color: '#D4AF37', label: 'REFERENCE' },
  unavailable: { bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.35)', color: '#94A3B8', label: 'UNAVAILABLE' },
  derived: { bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.35)', color: '#60A5FA', label: 'DERIVED' },
};

export function ProvenanceChip({ state, label, title }: {
  state: ProvenanceState;
  /** Optional override of the default label text. */
  label?: string;
  /** Optional tooltip explaining the state. */
  title?: string;
}) {
  const s = STYLES[state];
  return (
    <span
      title={title ?? `${s.label}: ${state === 'live'
        ? 'live upstream observation'
        : state === 'reference'
        ? 'static reference dataset — illustrative, not current'
        : state === 'derived'
        ? 'computed here from the labelled inputs'
        : 'no data available'}`}
      style={{
        display: 'inline-block',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1,
        fontFamily: 'monospace',
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 4,
        padding: '1px 6px',
        marginLeft: 8,
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? s.label}
    </span>
  );
}
