'use client';

/**
 * <IntelligenceDossier> (INT-D3, roadmap item D3) — the compiled
 * dossier on the stock page: the generated-insight section mounted
 * directly after the B1 IntelligencePanel. It fetches THE ONE
 * intelligence API (/api/intelligence?capability=insight — the
 * generated-insight capability's FIRST product mount) and renders the
 * artifact through the ONE canonical ReadyComposition (the #304
 * centralization of the pre-registered six-step A8 order).
 *
 * Pre-registration: docs/intelligence/stockDossier.md (PR #296,
 * committed BEFORE any evaluation). Pins (enforced by
 * test/intelligenceStockDossier.test.ts):
 *   - the dossier fetches ONLY /api/intelligence with
 *     capability=insight — no page imports the chain runner (the A10
 *     single-consumer scan), no chain module, no parser, no zod: the
 *     artifact it renders is the route's A1-VALIDATED response (the
 *     server boundary parse-or-refuses before serving; the client adds
 *     NO second parser);
 *   - the ABSENCE DISCIPLINE (the U4 discipline applied to data):
 *     a 404 renders the section ABSENT (data-dossier-insight="absent");
 *     a 5xx / network / timeout / contract mismatch renders "error" —
 *     visually the same nothing, verifiably different; no speculative
 *     copy, no promises, no fabricated summary. Before the
 *     A4 baseline window (~2026-11-03) EVERY subject 404s — absence IS
 *     the honest state; the B1 thesis panel above stays the page's
 *     always-on intelligence;
 *   - the Ask Rishi affordance mounts ONLY when the displayed artifact
 *     carries a changeKey (it cannot anchor — honest absence);
 *   - the dossier only READS: no cache writer, no generation trigger,
 *     no materiality heuristic — generation eligibility remains A4's
 *     EXCLUSIVE call;
 *   - the unlock mechanics (pinned): on/after the window the route's
 *     ONE bounded generation populates the cache and this section
 *     renders — NO code change and NO redeploy at the window: the
 *     surface is pre-built and data-unlocked.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { RishiInsight } from "@/lib/intelligence/types";
import { buildEvidenceView, type EvidenceView } from "@/lib/intelligence/evidence";
import { AskRishi } from "@/components/stock/AskRishi";
// The ONE canonical ready-state composition (the pre-registered six
// steps in order), mounted lazily — the #304 pattern the three product
// surfaces already ride: the ready state is client-only by
// construction, so ssr:false changes zero SSR output while keeping the
// composition out of the page's first-load JS.
const ReadyComposition = dynamic(
  () => import("@/components/intelligence/ReadyComposition").then((m) => m.ReadyComposition),
  { ssr: false },
);

type DossierState =
  | { phase: "loading" }
  | { phase: "absent" }
  | { phase: "error" }
  | { phase: "ready"; view: EvidenceView; artifact: RishiInsight };

const INTELLIGENCE_TIMEOUT_MS = 12_000;

/** A dossier instance per subject: the stock page passes the
 *  server-resolved symbol, so a client navigation between stock pages
 *  REMOUNTS the dossier (the effect reads one subject per mount). */
export function IntelligenceDossier({ symbol }: { symbol: string }) {
  const [state, setState] = useState<DossierState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/intelligence?capability=insight&subject=${encodeURIComponent(symbol)}`,
          {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(INTELLIGENCE_TIMEOUT_MS),
          },
        );
        // The absence discipline: 404 = no artifact exists (the
        // pre-window state — miss + non-material, A4's fail-closed gate).
        // Every OTHER non-OK is an infrastructure/contract failure.
        if (res.status === 404) {
          if (!cancelled) setState({ phase: "absent" });
          return;
        }
        if (!res.ok) {
          if (!cancelled) setState({ phase: "error" });
          return;
        }
        const data = (await res.json()) as { ok?: boolean; insight?: unknown } | null;
        if (!data || data.ok !== true || !data.insight) {
          if (!cancelled) setState({ phase: "error" });
          return;
        }
        // The A1 parse is the SERVER boundary's job (the route serves
        // only parse-or-refused artifacts — the A10 pinned contract).
        // The client adds NO second parser: the A8 mapping is total
        // over its input — unknowns degrade to the honest em dash and
        // empty states, never invented content.
        const artifact = data.insight as RishiInsight;
        if (!cancelled) {
          setState({ phase: "ready", view: buildEvidenceView(artifact), artifact });
        }
      } catch {
        // network failure / timeout — honest error, never a fake artifact
        if (!cancelled) setState({ phase: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // The affordance anchors ONLY on a changeKey-bearing artifact: the
  // A9 reference contract resolves the artifact server-side from the
  // deterministic 64-hex key — without one there is nothing to anchor
  // (honest absence of the affordance, never a disabled guess).
  const changeKey =
    state.phase === "ready" && typeof state.artifact.provenance?.changeKey === "string"
      ? state.artifact.provenance.changeKey
      : null;

  return (
    <section
      data-dossier-insight={state.phase}
      data-dossier-subject={symbol}
      aria-label="Rishi stock dossier"
    >
      {/* absent and error render NOTHING (no speculative copy, no
          promises) — the DOM contract distinguishes them for verification
          only. */}
      {state.phase === "ready" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ReadyComposition view={state.view} />
          {changeKey && <AskRishi changeKey={changeKey} symbol={symbol} />}
        </div>
      )}
    </section>
  );
}
