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
 * Styling: INLINE (the ScreenerClient control convention — this tree
 * has no utility-CSS pipeline; the overlay/panel geometry must be
 * real, not class-hoped). Colors come from the globals.css design
 * tokens.
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        padding: 24,
      }}
      role="dialog"
      aria-label={`Rishi intelligence for ${subject}`}
      data-intelligence-drawer={state.phase}
      data-intelligence-drawer-subject={subject}
    >
      <div
        style={{
          maxHeight: '85vh',
          overflowY: 'auto',
          width: '100%',
          maxWidth: 640,
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          padding: 20,
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--gold)', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.08em' }}>
              RISHI INTELLIGENCE
            </h2>
            <p style={{ margin: '4px 0 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-secondary)' }}>
              {subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close intelligence drawer"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
        {state.phase === "loading" && (
          <p className="insight-surface__empty" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Resolving intelligence...
          </p>
        )}
        {state.phase === "unavailable" && (
          <p
            className="insight-surface__empty"
            style={{ color: 'var(--text-muted)', fontSize: 13 }}
            data-intelligence-drawer="unavailable"
          >
            Intelligence is not available for this subject right now.
          </p>
        )}
        {state.phase === "ready" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-intelligence-drawer="ready">
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
