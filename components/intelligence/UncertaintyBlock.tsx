/**
 * <UncertaintyBlock> (INT-A8) — renders the mapping's uncertainty /
 * invalidators / next-investigations closed states with the honest
 * empty lines. Pre-registration: docs/intelligence/evidence.md.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

function List({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) return <p className="insight-surface__empty">{emptyLabel}</p>;
  return (
    <ul className="insight-surface__list">
      {items.map((item, i) => (
        <li key={`u:${i}`} className="insight-surface__item">
          <p className="insight-surface__text">{item}</p>
        </li>
      ))}
    </ul>
  );
}

export function UncertaintyBlock({ view }: { view: EvidenceView }) {
  return (
    <section className="insight-surface insight-surface--uncertainty" aria-label="Uncertainty">
      <div className="insight-surface__section" data-insight-uncertainty-kind="uncertainty">
        <h3 className="insight-surface__title">What is uncertain</h3>
        <List items={view.uncertainty.items} emptyLabel="No stated uncertainties." />
      </div>
      <div className="insight-surface__section" data-insight-uncertainty-kind="invalidator">
        <h3 className="insight-surface__title">What would invalidate this</h3>
        <List items={view.uncertainty.invalidators} emptyLabel="No stated invalidators." />
      </div>
      <div className="insight-surface__section" data-insight-uncertainty-kind="next-investigation">
        <h3 className="insight-surface__title">What to investigate next</h3>
        <List items={view.uncertainty.nextInvestigations} emptyLabel="No stated investigations." />
      </div>
    </section>
  );
}
