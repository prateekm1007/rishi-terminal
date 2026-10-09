/**
 * <ContradictionBanner> (INT-A8) — renders the mapping's contradiction
 * state. Banner false OR refused -> renders NOTHING (the honest
 * absence — the mapping owns both decisions; this component owns
 * none). Pre-registration: docs/intelligence/evidence.md.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

export function ContradictionBanner({ view }: { view: EvidenceView }) {
  if (!view.contradiction.banner || view.contradiction.refused) return null;
  return (
    <section className="insight-surface insight-surface--contradictions" aria-label="Contradictions">
      <h3 className="insight-surface__title">Contradictions</h3>
      <ul className="insight-surface__list">
        {view.contradiction.items.map((item, i) => (
          <li key={`${item.field}:${i}`} className="insight-surface__item" data-insight-contradiction-field={item.field}>
            <p className="insight-surface__text">{item.description}</p>
            <ul className="insight-surface__facts">
              {item.sides.map((side) => (
                <li key={side.id} className="insight-fact" data-insight-contradiction-item={side.id}>
                  <span className="insight-fact__value">{side.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
