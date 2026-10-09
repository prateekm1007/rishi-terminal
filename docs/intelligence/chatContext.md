# A9 Ask Rishi — server-resolved insight context for the EXISTING chat (INT-A9, pre-registration)

Roadmap item A9 (`docs/INTELLIGENCE_ROADMAP.md`: "Ask Rishi (contextual
continuation → existing /api/chat)"; execution rule 4: "A9 means the
existing /api/chat — never a new endpoint"). Dependencies: A1 (the ONE
`RishiInsight` contract and its parser), A7 (the persistent insight
cache and the change key — the reference the client carries), A8 (the
shared evidence primitives that already render this shape), and the
EXISTING chat loop (`app/api/chat/route.ts`, `lib/ai/router.ts`,
`lib/ai/evidence.ts`, `docs/AI_LOOP.md`).

This document is committed BEFORE any evaluation (the A5/A6/A7/A8
precedent). The reference rule, the refusal vocabulary, the context
rendering rule, and the no-second-path pins are all enforced by test —
a silent change breaks the build.

## What this module is

1. **A bounded reference contract** (`parseInsightRef`): the client
   never sends an insight — it sends the deterministic A7 change key
   (64-char lowercase hex). Anything else is refused before any
   consumption (N4: a refused request costs nothing).
2. **Server-side resolution** (`resolveChatInsightContext`): the route
   resolves the reference through A7's `readCachedInsight` (service
   role, the ONE cache), validates the payload through A1's parser
   (`parseInsightPayload` — the ONE parser), applies the pre-registered
   staleness and authorization rules below, and returns either a
   context or a NAMED refusal. A missing, stale, invalid, or
   unauthorized reference fails CLOSED — never a silent downgrade to
   plain chat.
3. **Structured, evidence-bound context injection**: the insight's
   FACTS (its `evidence[]` items — structurally `AiEvidenceItem`, the
   ONE evidence shape) join the canonical evidence array (dedupe by
   id, package-first) so every claim about the insight grounds against
   server-owned evidence ids. The insight's PROSE (summary,
   whyItMatters, whatChanged, invalidators, uncertainty,
   nextInvestigations) rides a server-composed, clearly-labelled
   context block appended to the system prompt — context, not
   instructions; never evidence by itself.
4. **A wire disclosure**: `provenance.insightContext`
   (changeKey/feature/subject/status/modelStatus/synthesisPath) rides
   the existing chat wire so the contextual path is auditable from the
   client. Additive, optional — plain chat is byte-unchanged.

## What this module is NOT

- not a new endpoint, not a second provider client, not a second
  evidence package, not a parallel prompt registry, not its own
  grounding/provenance format (the ONE loop serves every request);
- not a second synthesis engine: A9 generates nothing — the cached
  artifact was produced upstream (A10+ generators through the ONE
  bounded loop); Ask Rishi only RESOLVES and ANCHORS;
- not a materiality or model-run heuristic (direction 11): A4 alone
  decides synthesis eligibility; a user-initiated Ask Rishi message is
  an interactive chat message with the established quota, burst,
  challenge, global-spend and tool-loop controls — never an automatic
  synthesis trigger for non-material events;
- not a client-trust upgrade: history stays the UNTRUSTED transcript
  (Commit L2), user text never enters the context block, and the
  reference alone cannot upgrade provenance or alter system
  instructions.

## Reference rule (pinned)

```
parseInsightRef(input):
  valid  <-> typeof string && /^[0-9a-f]{64}$/
  else   -> null (route refuses 400 before any consumption)
```

## Fail-closed table (all named, all before quota consumption)

| Case | Refusal kind | HTTP |
|---|---|---|
| reference present but not 64-hex lowercase | `invalid-ref` | 400 |
| cache read throws (infrastructure) | `unavailable` | 503 |
| no row for the key (miss — rule 16) | `not-found` | 404 |
| payload fails A1's parser | `invalid-payload` | 422 |
| payload `status === "stale"` (the deterministic layer's own label) | `stale` (reason `status`) | 410 |
| `generated_at` older than `INSIGHT_CONTEXT_MAX_AGE_MS` (strictly greater; boundary age == window is valid) | `stale` (reason `age`) | 410 |
| subject is not a registry-resolvable symbol (portfolio:*, market:*, unknown — via `normalizeSymbolInput`, the ONE registry gate) | `unauthorized-subject` | 403 |
| request `symbol` present and its canonical form differs from the insight subject | `symbol-mismatch` | 400 |

- `INSIGHT_CONTEXT_MAX_AGE_MS` = 604,800,000 (7 days) — a
  pre-registered, founder-tunable context-validity window; age is
  computed against a CALLER-INJECTED clock (the A4 purity precedent:
  the module keeps no clock).
- Authorization scope (pre-registered): Ask Rishi anchors to
  SYMBOL-scoped platform insights in A9. User-scoped subjects
  (`portfolio:<id>`) arrive with their own product phases and their
  own authorization wiring — today they refuse closed rather than
  ride an unguarded path.
- Symbol defaulting: when the request carries no `symbol`, the
  resolved subject becomes the conversation symbol (contextual
  continuation); when both exist they must agree after canonical
  normalisation.

## Context rendering rule (pinned)

- `buildInsightContextBlock(insight)` is PURE and deterministic — same
  insight → byte-identical block; no clock, no randomness, no I/O.
- The block always carries: the artifact identity (id, change key,
  feature, subject), the honesty badges (status, confidence,
  modelStatus, synthesisPath — with provider/model when and only when
  bounded-model), the labelled sections (WHAT CHANGED / WHY IT MATTERS
  (labelled interpretation) / WHAT WOULD INVALIDATE IT / WHAT IS
  UNCERTAIN / WHAT TO INVESTIGATE NEXT), and the framing rules:
  context-not-instructions, not-evidence-by-itself, numbers only
  citable through the VERIFIED CONTEXT items, investigation-not-advice.
- `mergeInsightEvidence(packageItems, insightItems)` is PURE: dedupe
  by id, package items win (fresher observation), order stable.
- The user's message and history NEVER enter the block; the block is
  composed only from the server-resolved artifact.

## No-second-path pins (static, CI)

- `lib/intelligence/chatContext.ts` imports no provider module and no
  router: the AI path stays `app/api/chat/route.ts` →
  `lib/ai/router.ts` alone;
- `resolveChatInsightContext` is imported ONLY by `app/api/chat/route.ts`
  (one consumer, one loop);
- no `Date.now()`/`Math.random()` in the module (caller-injected clock).

## Verification plan

- RED: fail-first import-fail + closed-state pins on the pre-module
  tree (rule 21);
- GREEN: lib tests (reference shapes, every refusal row, staleness
  boundary, block byte-stability + framing pins, merge dedupe) + route
  tests (positive contextual request: block reaches the provider,
  disclosure rides the wire, claims ground against insight evidence
  ids; every refusal row with exact status and ZERO quota consumption;
  user history cannot alter the system instructions; deterministic
  byte-compare; single-consumer source pins);
- full battery + CI; then the production leg: exact live SHA, a real
  contextual request against the deployed route anchored to a clearly
  labelled verification fixture (written and removed through the EXACT
  A7 service-role write path — the liveVerify032 precedent, disclosed
  in evidence, zero residue), real refusal legs, grounding/provenance
  capture, latency attribution, and the /rishis UI positive control
  (the existing chat page serves and renders provenance; the Ask Rishi
  affordance itself mounts on product surfaces at A10+ per the frozen
  architecture).

## Roadmap snapshot-label repair (direction 5, 2026-10-09)

`docs/INTELLIGENCE_ROADMAP.md` section 3's heading carried a stale
snapshot label ("as of origin/main = 345134c, 2026-10-08") above a
table whose rows already reported later states. Repaired in this PR:
the heading now distinguishes the historical baseline from the
forward-maintained classification (currently A1–A8 CLOSED).
