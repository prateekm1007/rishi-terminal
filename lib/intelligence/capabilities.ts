// lib/intelligence/capabilities.ts (INT-A10, roadmap item A10) — THE CLOSED
// CAPABILITY REGISTRY for /api/intelligence (the ONE intelligence API
// surface).
//
// Pre-registration: docs/intelligence/intelligenceApi.md (committed BEFORE
// any evaluation). The registry set is pinned by test — a silent change
// breaks the build, never drifts.
//
// What this module is:
//   - the mechanical gate against invented capability ids (the A1 rule for
//     feature ids, applied to capabilities): a query parameter that is not
//     in this registry is refused 400 BEFORE anything runs;
//   - Phase-A registry, exactly two capabilities:
//       * "thesis"  — the DETERMINISTIC insight: the chain (A2→A7) composed
//                     into an A1 artifact; zero AI by construction;
//       * "insight" — the PERSISTENT insight: chain → change key → A7 cache
//                     hit (parse-or-serve) or miss + A4-material → one
//                     generation through the ONE bounded loop.
//     B1+ capabilities are added by their own PRs editing THIS registry —
//     never by a second route (rule 14: one intelligence API).
//
// What this module is NOT:
//   - not a router, not a handler, not I/O: pure registry data only;
//   - not a clock, not a random source: no time, no randomness (pinned).
//
// Each capability carries a fixed human-readable description — display and
// documentation copy live next to the gate that enforces the id, so a new
// capability lands with its contract wording in the same diff.

export const INTELLIGENCE_CAPABILITIES = ["thesis", "insight"] as const;

export type IntelligenceCapability = (typeof INTELLIGENCE_CAPABILITIES)[number];

/** Fixed description per capability (closed map over the registry). */
export const INTELLIGENCE_CAPABILITY_DESCRIPTIONS: Readonly<
  Record<IntelligenceCapability, string>
> = {
  thesis:
    "Deterministic composition of the observation chain (A2 history, A3 events, A4 materiality, A5 thesis, A6 deltas, A7 change key) into one A1 artifact. Zero AI by construction.",
  insight:
    "Persistent insight: chain resolution to the A7 change key; a cache hit is parsed and served, a miss on A4-material state generates once through the ONE bounded loop and is cached; a miss on non-material state is an honest 404 with zero AI spend.",
};

/** Total guard over the registry — the route's first refusal (fail closed,
 *  nothing runs for an unknown id). */
export function isIntelligenceCapability(
  value: unknown,
): value is IntelligenceCapability {
  return (
    typeof value === "string" &&
    (INTELLIGENCE_CAPABILITIES as readonly string[]).includes(value)
  );
}
