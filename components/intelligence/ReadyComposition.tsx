'use client';

/**
 * <ReadyComposition> (INT-A8-PRES follow-up, 2026-10-10) — the ONE
 * canonical ready-state composition over the A8 closed set, in the
 * pre-registered six-step order (docs/intelligence/
 * evidencePresentation.md): badges -> summary -> provenance ->
 * contradiction -> evidence -> uncertainty.
 *
 * Rule 14: the composition order is defined ONCE here — the four
 * mounts (fixture route, B1 panel, C1 brief, D2 drawer) render this
 * component instead of repeating the sequence, so no surface can
 * drift into an independent redesign. The three product surfaces
 * mount it via next/dynamic with ssr:false (the C1 bundle pattern
 * the D2 drawer established): the ready state is client-only by
 * construction (it renders only after each surface's fetch
 * resolves), so ssr:false changes zero SSR output while keeping the
 * composition out of every page's first-load JS. The fixture route
 * imports it directly (server-rendered, as its SSR assertions
 * require). This file owns no interpretation and fetches nothing:
 * the mapping's view in, the closed set out.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";
import {
  ContradictionBanner,
  EvidenceList,
  InsightBadges,
  InsightSummary,
  ProvenanceLine,
  UncertaintyBlock,
} from "./index";

export function ReadyComposition({ view }: { view: EvidenceView }) {
  return (
    <>
      <InsightBadges badges={view.badges} />
      <InsightSummary view={view} />
      <ProvenanceLine view={view} />
      <ContradictionBanner view={view} />
      <EvidenceList view={view} />
      <UncertaintyBlock view={view} />
    </>
  );
}
