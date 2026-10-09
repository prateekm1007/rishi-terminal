/**
 * <EvidenceList> (INT-A8) — renders the mapping's evidence rows.
 * Pre-registration: docs/intelligence/evidence.md — thin primitive over
 * the closed states of lib/intelligence/evidence.ts (the ONE mapping;
 * this component owns no interpretation). House pattern (DataValue,
 * P0-06): server-component safe, data-* audit attributes.
 *
 * Empty-evidence state (2026-10-10 repair): says no observations
 * QUALIFIED as material evidence in the window — never that none
 * occurred — and exposes the A4 excluded-verdict breakdown (counts by
 * reason, straight from the artifact; never parsed UI text, never
 * ledger rows).
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

export function EvidenceList({ view }: { view: EvidenceView }) {
  return (
    <section className="insight-surface insight-surface--evidence" aria-label="Evidence">
      <h3 className="insight-surface__title">Evidence</h3>
      {view.evidence.rows.length === 0 ? (
        <div>
          <p className="insight-surface__empty">
            No observations qualified as material evidence in the observation
            window.
          </p>
          {view.excludedVerdicts.length > 0 ? (
            <ul className="insight-surface__excluded" data-insight-excluded-verdicts>
              {view.excludedVerdicts.map((v) => (
                <li
                  key={v.reason}
                  className="insight-surface__excluded-item"
                  data-insight-excluded-reason={v.reason}
                >
                  <span className="insight-surface__excluded-reason">{v.reason}</span>
                  <span className="insight-surface__excluded-count">{v.count}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <ul className="insight-surface__list">
          {view.evidence.rows.map((row) => (
            <li key={row.id} className="insight-surface__item" data-insight-evidence-id={row.id}>
              <p className="insight-surface__text">{row.text}</p>
              {row.facts.length > 0 ? (
                <ul className="insight-surface__facts">
                  {row.facts.map((fact, i) => (
                    <li
                      key={`${row.id}:${fact.field}:${i}`}
                      className="insight-fact"
                      data-insight-fact-field={fact.field}
                      data-insight-fact-source={fact.sourceLabel ?? ""}
                      data-insight-fact-observed-at={fact.observedAtLabel ?? ""}
                    >
                      <span className="insight-fact__value">
                        {fact.field}: {fact.valueDisplay} {fact.unit}
                      </span>
                      {fact.sourceLabel !== null || fact.observedAtLabel !== null ? (
                        <span className="insight-fact__provenance">
                          {[fact.sourceLabel, fact.observedAtLabel ? `observed ${fact.observedAtLabel}` : null]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
