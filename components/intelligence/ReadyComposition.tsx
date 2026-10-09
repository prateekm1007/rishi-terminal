'use client';

/**
 * <ReadyComposition> (INT-A8, 2026-10-10 repair) — the ONE canonical
 * ready-state composition over the A8 closed set, in the A8 order:
 * badges → provenance → thesis prose → contradiction → evidence →
 * uncertainty. Pre-registration: docs/intelligence/evidence.md (the
 * gap record).
 *
 * The three product surfaces (B1 panel, C1 brief, D2 drawer) mount
 * THIS component via next/dynamic with ssr:false — the C1 bundle
 * pattern the D2 drawer established. The ready state is client-only
 * by construction (it renders only after the surface's fetch
 * resolves), so ssr:false changes zero SSR output while keeping the
 * composition out of every page's first-load JS (the /stock/[symbol]
 * bundle ratchet). This file owns no interpretation and fetches
 * nothing: the mapping's view in, the closed set out.
 */

import type { EvidenceView } from "@/lib/intelligence/evidence";
import {
  ContradictionBanner,
  EvidenceList,
  InsightBadges,
  ProvenanceLine,
  ThesisProse,
  UncertaintyBlock,
} from "./index";

export function ReadyComposition({ view }: { view: EvidenceView }) {
  return (
    <>
      <InsightBadges badges={view.badges} />
      <ProvenanceLine view={view} />
      <ThesisProse view={view} />
      <ContradictionBanner view={view} />
      <EvidenceList view={view} />
      <UncertaintyBlock view={view} />
    </>
  );
}
