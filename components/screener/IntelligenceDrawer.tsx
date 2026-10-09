'use client';

/**
 * <IntelligenceDrawer> (INT-D2) — the per-row intelligence drawer on
 * the screener table. Pre-registration:
 * docs/intelligence/stockIntelligence.md (committed BEFORE any
 * evaluation).
 *
 * The B1 panel pattern verbatim (components/stock/
 * IntelligencePanel.tsx), breadth-adjusted:
 *   - fetches THE ONE intelligence API for the ONE opened subject,
 *     user-initiated on drawer open — the table fetches NOTHING on
 *     render (no per-row fetching for the 896-row universe; no burst-
 *     guard pressure);
 *   - the artifact it renders is the route's A1-VALIDATED response
 *     (the server boundary parse-or-refuses before serving — the A10
 *     pinned contract); the client adds NO second parser and no zod —
 *     re-validating here would ship the full validation graph against
 *     the page budget (C9) for zero security value (the client is the
 *     least-trusted party; it can enforce nothing);
 *   - the composition is the A8 closed set in the A8 order (badges →
 *     provenance → contradiction → evidence → uncertainty); this
 *     component owns NO interpretation;
 *   - every non-200 / network failure / 12 s timeout / contract
 *     mismatch renders the honest unavailable state — never a fake
 *     artifact, never a fallback word, never advice;
 *   - closing the drawer or opening another row ABORTS the in-flight
 *     request (the AbortController below) — the last-opened subject
 *     wins, no setState after abort, no state bleed across subjects
 *     (the mount re-keys the drawer per subject, so each instance
 *     fetches exactly one subject).
 *
 * Honest scope note: capability=thesis is pinned — the deterministic
 * artifact, available for every subject today. The generated-insight
 * upgrade waits for the A4 baseline window (~2026-11-03) and arrives
 * by its own pre-registered change — never silently.
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

type DrawerState =
  | { phase: "loading" }
  | { phase: "unavailable" }
  | { phase: "ready"; view: EvidenceView };

const INTELLIGENCE_TIMEOUT_MS = 12_000;

export function IntelligenceDrawer({
  subject,
  onClose,
}: {
  subject: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<DrawerState>({ phase: "loading" });

  useEffect(() => {
    // One fetch per opened subject, user-initiated. The SAME
    // AbortController carries the bounded wait AND the close/switch
    // abort: `closed` distinguishes them in the catch (the 12 s
    // timeout renders the honest unavailable state; a close/switch
    // unmount aborts silently — no setState after abort, no state
    // bleed across subjects).
    let closed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), INTELLIGENCE_TIMEOUT_MS);
    (async () => {
      try {
        const res = await fetch(
          `/api/intelligence?capability=thesis&subject=${encodeURIComponent(subject)}`,
          {
            headers: { accept: "application/json" },
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          if (!closed) setState({ phase: "unavailable" });
          return;
        }
        const data = (await res.json()) as { ok?: boolean; insight?: unknown } | null;
        if (!data || data.ok !== true || !data.insight) {
          if (!closed) setState({ phase: "unavailable" });
          return;
        }
        if (!closed) {
          setState({ phase: "ready", view: buildEvidenceView(data.insight as RishiInsight) });
        }
      } catch {
        if (!closed) setState({ phase: "unavailable" });
      }
    })();
    return () => {
      closed = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [subject]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
      role="dialog"
      aria-label={`Rishi intelligence for ${subject}`}
      data-intelligence-drawer={state.phase}
      data-intelligence-drawer-subject={subject}
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-gray-700 bg-gray-950 p-5 shadow-2xl sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-mono font-bold tracking-wide text-yellow-500">
              RISHI INTELLIGENCE
            </h2>
            <p className="mt-0.5 font-mono text-xs text-gray-400">{subject}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close intelligence drawer"
            className="rounded border border-gray-700 px-2 py-1 font-mono text-xs text-gray-400 transition hover:border-gray-500 hover:text-gray-200"
          >
            Close
          </button>
        </div>
        {state.phase === "loading" && (
          <p className="insight-surface__empty">Resolving intelligence...</p>
        )}
        {state.phase === "unavailable" && (
          <p className="insight-surface__empty" data-intelligence-drawer="unavailable">
            Intelligence is not available for this subject right now.
          </p>
        )}
        {state.phase === "ready" && (
          <div className="space-y-4" data-intelligence-drawer="ready">
            <InsightBadges badges={state.view.badges} />
            <ProvenanceLine view={state.view} />
            <ContradictionBanner view={state.view} />
            <EvidenceList view={state.view} />
            <UncertaintyBlock view={state.view} />
          </div>
        )}
      </div>
    </div>
  );
}
