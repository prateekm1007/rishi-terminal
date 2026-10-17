/**
 * lib/founderDecisions — the recorded state of the founder decisions that
 * gate product surfaces (round 48).
 *
 * Pattern: the SAME discipline as lib/licensing.ts (round-47 P0-8) — a
 * closed status vocabulary, the state dated and attributed to the founder
 * order that set it (rule 1: no unattributed state), fail-closed access
 * functions (rule 6), and NO environment variable or client-controlled
 * value can move it (rule 7). A decision flips ONLY in the PR that
 * records the founder's written answer — the PR body is the record.
 *
 * Why this exists: the 2026-10-11 round-48 founder directive arrived
 * while PRODUCTION was serving chat 200 with real upstream spend — the
 * env-driven CHAT_DISABLED kill switch was never set on the deployment,
 * and an env control nobody set is not a control (the B-06 class: the
 * failure you did not test is the one that runs in production). The
 * gates below make the founder's standing orders structural.
 */

/** The closed founder-decision state vocabulary. */
export type FounderDecisionStatus = "open" | "decided";

export interface FounderDecision {
  status: FounderDecisionStatus;
  /** The date the CURRENT status was set (IST calendar date). */
  asOf: string;
  /** The founder order that set it, verbatim scope (rule 1). */
  authority: string;
  /** What is being waited on before the status can change. */
  pending: string;
}

/**
 * FD-8 — Chat/LLM vendor + data-retention terms (roadmap FD table; the
 * founder decision that gates the chat surface).
 *
 * Founder directive 2026-10-11 (round-48 order, verbatim): "Keep chat at
 * 503 until FD-8 is decided." FD-8 is OPEN (docs/ROADMAP-STATUS.md: the
 * current chat provider works; vendor terms and retention unreviewed).
 * While open, the chat surface refuses 503 STRUCTURALLY — the env kill
 * switch remains as the operator's faster hand, but chat no longer
 * depends on someone having set it.
 */
export const FD8_CHAT_PROVIDER: FounderDecision = {
  status: "open",
  asOf: "2026-10-11",
  authority:
    'founder directive 2026-10-11: "Keep chat at 503 until FD-8 is decided"',
  pending:
    "the chat/LLM vendor terms and data-retention review (FD-8) recorded as a founder decision",
} as const;

/** The chat surface may serve ONLY when FD-8 is recorded as decided
 * (fail-closed, rule 6: anything other than an explicit "decided"
 * refuses). */
export function fd8ChatProviderApproved(): boolean {
  return FD8_CHAT_PROVIDER.status === "decided";
}
