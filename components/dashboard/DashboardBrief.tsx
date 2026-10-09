'use client';

/**
 * <DashboardBrief> (INT-C1, roadmap item C1) — the SECOND real product
 * surface for the intelligence program: the dashboard fetches THE ONE
 * intelligence API (/api/intelligence?capability=thesis) for the
 * server-resolved Stock-of-the-Day subject and renders the artifact
 * through the A8 primitives — the same discipline the B1 stock-page
 * panel established.
 *
 * Pre-registration: docs/intelligence/dashboardBrief.md (committed
 * BEFORE any evaluation). Pins (enforced by
 * test/intelligenceDashboardBrief.test.ts):
 *   - the brief fetches ONLY /api/intelligence with capability=thesis
 *     (the ONE surface, the ONE deterministic capability — the exact-
 *     surface scan admits exactly two declared consumers);
 *   - the artifact it renders is the route's A1-VALIDATED response:
 *     the server boundary parse-or-refuses before serving (the A10
 *     pinned contract); the client adds NO second parser and no zod —
 *     the B1/C9 bundle discipline;
 *   - no chain import (the A10 single-consumer scan unchanged); the
 *     client invents NO subject — the symbol is the deterministic
 *     IST-date pick resolved on the server (U4-gated) and passed down;
 *   - every non-200 / network / timeout / contract mismatch renders
 *     the honest unavailable state (A8's empty-state discipline) —
 *     never a fake artifact, never a fallback word, never advice;
 *   - when the flag is off or no pick exists, the MOUNT does not
 *     render this component at all (absence is the honest state; the
 *     ranked trio's disabled panel explains why).
 *
 * Honest scope note: capability=insight stays unmounted until the A4
 * baselines make generation triggerable (~2026-11-03); this surface
 * pins capability=thesis.
 */

import { useEffect, useState } from "react";

import type { RishiInsight } from "@/lib/intelligence/types";
import { buildEvidenceView, type EvidenceView } from "@/lib/intelligence/evidence";
import {
  ContradictionBanner,
  EvidenceList,
  InsightBadges,
  ProvenanceLine,
  UncertaintyBlock,
} from "@/components/intelligence";

type BriefState =
  | { phase: "loading" }
  | { phase: "unavailable" }
  | { phase: "ready"; view: EvidenceView };

const INTELLIGENCE_TIMEOUT_MS = 12_000;

// The dashboard's card idiom (the wrapper only — the A8 composition
// inside renders exactly as A8 delivered it, inheriting these basics).
const CARD = {
  marginBottom: "48px",
  background: "linear-gradient(145deg,rgba(17,24,39,0.9) 0%,rgba(10,15,28,0.95) 100%)",
  border: "1px solid rgba(212,175,55,0.15)",
  borderRadius: "16px",
  padding: "22px",
  color: "#F8FAFC",
  fontFamily: "Inter, sans-serif",
} as const;

/** One brief instance per subject: the mount passes the day's pick; the
 *  effect reads one subject per mount. */
export function DashboardBrief({ subject }: { subject: string }) {
  const [state, setState] = useState<BriefState>({ phase: "loading" });

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
        // The A1 parse is the SERVER boundary's job (the route serves
        // only parse-or-refused artifacts — the A10 pinned contract).
        // The client adds NO second parser: the A8 mapping is total
        // over its input — unknowns degrade to the honest em dash and
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
      style={CARD}
      data-dashboard-brief={state.phase}
      data-dashboard-brief-subject={subject}
      aria-label="Rishi brief for today's pick"
    >
      <h2 style={{
        fontFamily: "Cinzel, serif",
        fontSize: "20px",
        fontWeight: 700,
        letterSpacing: "0.01em",
        margin: "0 0 4px 0",
      }}>
        Rishi Intelligence — {subject}
      </h2>
      <p style={{
        fontSize: "12px",
        color: "var(--text-muted)",
        margin: "0 0 16px 0",
      }}>
        Deterministic composition of the observation chain for this subject.
      </p>
      {state.phase === "loading" && (
        <p className="insight-surface__empty">Resolving intelligence...</p>
      )}
      {state.phase === "unavailable" && (
        <p className="insight-surface__empty" data-dashboard-brief="unavailable">
          Intelligence is not available for this subject right now.
        </p>
      )}
      {state.phase === "ready" && (
        <>
          <InsightBadges badges={state.view.badges} />
          <ProvenanceLine view={state.view} />
          <ContradictionBanner view={state.view} />
          <EvidenceList view={state.view} />
          <UncertaintyBlock view={state.view} />
        </>
      )}
    </section>
  );
}
