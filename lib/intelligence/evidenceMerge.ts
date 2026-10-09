// lib/intelligence/evidenceMerge.ts — THE ONE package-first evidence
// merge (rule 14: one implementation, every consumer imports this).
//
// History (INT-A10, 2026-10-09): this helper lived inside the A9
// chat-context module, where its only consumer was the chat route. A10's
// intelligence route needs the SAME merge for the SAME purpose (the
// chain's evidence items join the canonical package package-first), but
// A9's single-consumer pin — the chat-context resolver has exactly ONE
// consumer — correctly treats ANY reference to that module from another
// file as a review-stopping defect. The function therefore moved here
// verbatim (zero behavior change; the INT-A9 merge pins in
// test/intelligenceChatContext.test.ts run unchanged against this
// module). Both sanctioned callers now import the ONE implementation
// from its own home:
//   - app/api/chat/route.ts        (INT-A9 contextual continuation)
//   - app/api/intelligence/route.ts (INT-A10 generation evidence)
//
// What this module is NOT: a second evidence package (lib/ai/evidence
// builds the canonical package), a second evidence format (the A1/AI
// item shape is reused), or a second context resolver (the chat-context
// module owns that).

import type { AiEvidenceItem } from "@/lib/ai/schemas";

/**
 * Merge the artifact's evidence items into the canonical evidence
 * array. Pure and order-stable: package items keep their positions and
 * win id collisions (the live package observation is the fresher
 * state); unseen insight items append in artifact order. The user's
 * message and history NEVER enter this array — both sides are
 * server-assembled.
 */
export function mergeInsightEvidence(
  packageItems: AiEvidenceItem[],
  insightItems: AiEvidenceItem[],
): AiEvidenceItem[] {
  const seen = new Set<string>();
  const out: AiEvidenceItem[] = [];
  for (const item of packageItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  for (const item of insightItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
