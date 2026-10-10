'use client';

/**
 * <IntelligencePanel> (INT-B1, roadmap item B1) — the FIRST REAL
 * PRODUCT SURFACE for the intelligence program: the stock page fetches
 * THE ONE intelligence API (/api/intelligence?capability=thesis) and
 * renders the artifact through the A8 primitives — the A8
 * unmounted-by-design primitives meet real intelligence here.
 *
 * Pre-registration: docs/intelligence/newsEvidence.md (committed BEFORE
 * any evaluation). Pins (enforced by test/intelligenceNewsWiring.test.ts):
 *   - the panel fetches ONLY /api/intelligence (the ONE surface) — no
 *     page imports the chain runner (the A10 single-consumer scan);
 *   - the artifact it renders is the route's A1-VALIDATED response: the
 *     server boundary parse-or-refuses before serving (the A10 pinned
 *     contract); the client adds NO second parser and no zod —
 *     re-validating here would ship ~90 kB gzip against the fatal
 *     200 kB page budget (C9) for zero security value;
 *   - the composition is the A8 closed set exactly as the fixture route
 *     renders it (badges → provenance → contradiction → evidence →
 *     uncertainty); this component owns NO interpretation;
 *   - every non-200 / network / contract mismatch renders the honest
 *     unavailable state (A8's empty-state discipline) — never a fake
 *     artifact, never a fallback word, never advice.
 *
 * Honest scope note: capability=insight is a later surface (the A4
 * gate keeps generation untriggerable until baselines accumulate,
 * ~2026-11-03); this panel pins capability=thesis.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { RishiInsight } from "@/lib/intelligence/types";
import { buildEvidenceView, type EvidenceView } from "@/lib/intelligence/evidence";
// The ONE canonical ready-state composition (the pre-registered six
// steps in order), mounted lazily — the C1 bundle pattern: the ready
// state is client-only by construction, so ssr:false changes zero SSR
// output while keeping the composition out of the page's first-load JS.
const ReadyComposition = dynamic(
  () => import("@/components/intelligence/ReadyComposition").then((m) => m.ReadyComposition),
  { ssr: false },
);

type PanelState =
  | { phase: "loading" }
  | { phase: "unavailable" }
  | { phase: "ready"; view: EvidenceView };

const INTELLIGENCE_TIMEOUT_MS = 12_000;

/** One panel instance per subject: the stock page passes `key={subject}`
 *  so a client navigation between stock pages REMOUNTS the panel (the
 *  effect reads one subject per mount — no synchronous reset needed). */
export function IntelligencePanel({ subject }: { subject: string }) {
  const [state, setState] = useState<PanelState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/intelligence?capability=thesis&subject=${encodeURIComponent(subject)}`,
          {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(INTELLIGENCE_TIMEOUT_MS),
          },
        );
        if (!res.ok) {
          if (!cancelled) setState({ phase: "unavailable" });
          return;
        }
        const data = (await res.json()) as { ok?: boolean; insight?: unknown } | null;
        if (!data || data.ok !== true || !data.insight) {
          if (!cancelled) setState({ phase: "unavailable" });
          return;
        }
        // The A1 parse is the SERVER boundary's job (the route serves only
        // parse-or-refused artifacts — the A10 pinned contract). The client
        // adds NO second parser: re-validating here would ship the full zod
        // graph to the browser (~90 kB gzip against the fatal 200 kB page
        // budget — C9) for zero security value (the client is the
        // least-trusted party; it can enforce nothing). The A8 mapping is
        // total over its input: unknowns degrade to the honest em-dash and
        // empty states, never invented content.
        if (!cancelled) {
          setState({ phase: "ready", view: buildEvidenceView(data.insight as RishiInsight) });
        }
      } catch {
        if (!cancelled) setState({ phase: "unavailable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subject]);

  return (
    <section
      className="stock-intelligence-panel"
      data-intelligence-panel={state.phase}
      data-intelligence-subject={subject}
      aria-label="Rishi intelligence"
    >
      <h2 className="stock-intelligence-panel__title">Rishi Intelligence</h2>
      {state.phase === "loading" && (
        <p className="insight-surface__empty">Resolving intelligence...</p>
      )}
      {state.phase === "unavailable" && (
        <p className="insight-surface__empty" data-intelligence-unavailable>
          Intelligence is not available for this subject right now.
        </p>
      )}
      {state.phase === "ready" && (
        <ReadyComposition view={state.view} />
      )}
    </section>
  );
}
