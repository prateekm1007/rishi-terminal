/**
 * <ProvenanceLine> (INT-A8) — renders the mapping's provenance
 * disclosure (the honesty coupling, display-side: deterministic ->
 * "no model involved"; bounded-model -> the full trio or the refusal
 * state — the mapping already refused a partial trio). Pre-
 * registration: docs/intelligence/evidence.md.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";

export function ProvenanceLine({ view }: { view: EvidenceView }) {
  return (
    <p className="insight-surface__provenance" data-insight-provenance={view.provenance.modelInvolved ? "bounded-model" : "deterministic"}>
      {view.provenance.label}
    </p>
  );
}
