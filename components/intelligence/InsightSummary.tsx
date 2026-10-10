/**
 * <InsightSummary> (INT-A8-PRES) — the artifact's prose, rendered
 * verbatim as labelled, deterministic/model-status-appropriate content:
 * the `summary` paragraph (label "Summary"), the `whyItMatters`
 * paragraph (label "Why it matters"), and the `whatChanged[]` list
 * (label "What changed") whose numbers are the deterministic layer's
 * OWN strings — never composed in JSX, never re-formatted.
 *
 * Honesty: the prose is NEVER labelled AI-generated — the provenance
 * line below it is the single honesty carrier. No advice strings (the
 * suite pins the absence). Pre-registration:
 * docs/intelligence/evidencePresentation.md (PR #301, committed BEFORE
 * any evaluation) — the pinned composition grows to SIX steps
 * (InsightBadges → InsightSummary → ProvenanceLine →
 * ContradictionBanner → EvidenceList → UncertaintyBlock). Thin
 * primitive over the closed states of lib/intelligence/evidence.ts —
 * this component owns no interpretation.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

export function InsightSummary({ view }: { view: EvidenceView }) {
  return (
    <section className="insight-surface insight-surface--summary" aria-label="Summary">
      <h3 className="insight-surface__title">Summary</h3>
      <p className="insight-surface__text" data-insight-summary="summary">
        {view.summary}
      </p>
      <h3 className="insight-surface__title">Why it matters</h3>
      <p className="insight-surface__text" data-insight-summary="whyItMatters">
        {view.whyItMatters}
      </p>
      <h3 className="insight-surface__title">What changed</h3>
      {view.whatChanged.length === 0 ? (
        <p className="insight-surface__empty" data-insight-summary="whatChanged-empty">
          No observed transition qualified as material evidence in this window — the ledger records no field change.
        </p>
      ) : (
        <ul className="insight-surface__list" data-insight-summary="whatChanged">
          {view.whatChanged.map((w, i) => (
            <li
              key={`${w.field}:${i}`}
              className="insight-surface__item"
              data-insight-what-changed-field={w.field}
            >
              <p className="insight-surface__text">{`${w.field}: ${w.change}`}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
