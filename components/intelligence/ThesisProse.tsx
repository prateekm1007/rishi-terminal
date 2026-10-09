/**
 * <ThesisProse> (INT-A8, 2026-10-10 repair) — renders the A1 prose
 * (summary, whyItMatters, whatChanged) VERBATIM as labelled content.
 * Pre-registration: docs/intelligence/evidence.md (the gap record).
 *
 * The deterministic artifact's own words finally reach the screen:
 * no composed numbers in JSX, no invented explanations, and NEVER an
 * "AI-generated" label on deterministic prose — the provenance line
 * (rendered separately by the shared composition) owns that honesty
 * coupling. This component owns no interpretation: the mapping hands
 * it strings, it renders them under fixed labels. ONE component for
 * all three prose families (the bundle ratchet pinned the size — the
 * /stock/[symbol] first-load may not grow beyond its +2 kB
 * allowance).
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

export function ThesisProse({ view }: { view: EvidenceView }) {
  return (
    <section className="insight-surface insight-surface--thesis" aria-label="Thesis prose">
      {view.summary.length > 0 ? (
        <div className="insight-surface__section">
          <h3 className="insight-surface__title">What changed</h3>
          <p className="insight-surface__summary" data-insight-summary>
            {view.summary}
          </p>
        </div>
      ) : null}
      {view.whyItMatters.length > 0 ? (
        <div className="insight-surface__section">
          <h3 className="insight-surface__title">Why it matters</h3>
          <p className="insight-surface__why" data-insight-why-it-matters>
            {view.whyItMatters}
          </p>
        </div>
      ) : null}
      <div className="insight-surface__section">
        <h3 className="insight-surface__title">Field-level changes</h3>
        {view.whatChanged.length === 0 ? (
          <p className="insight-surface__empty">No field-level changes recorded.</p>
        ) : (
          <ul className="insight-surface__what-changed">
            {view.whatChanged.map((w, i) => (
              <li
                key={`${w.field}:${i}`}
                className="insight-surface__what-changed-item"
                data-insight-what-changed-field={w.field}
              >
                <span className="insight-surface__what-changed-field">{w.field}</span>
                <span className="insight-surface__what-changed-change">{w.change}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
