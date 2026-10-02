# End-to-End AI Loop (Commit L — implemented: tool loop + verified surface)

Every AI answer on a stock surface now flows through ONE chain. No component
may bypass it (enforced by the router being the only AI entry point —
application code calls `lib/ai/**`, never a provider URL):

```
AUTHORITATIVE DATA            (seed registry + live fundamentals + price path)
      ↓
CANONICAL SNAPSHOT / RESOLVER (resolveStockMetrics() → getStockScore(), lib/scoring)
      ↓
PROVENANCE-AWARE EVIDENCE PACKAGE (buildAiEvidencePackage, lib/ai/evidence.ts)
      ↓
SERVER TOOL LAYER             (lib/ai/tools.ts — getStock/getFinancials/getPrices/
      ↓                        getScore/getPeers; allowlist + zod + security master)
MODEL ⇄ TOOLS (BOUNDED LOOP)  (lib/ai/router.ts — MAX_TOOL_ITERATIONS=4; results
      ↓                        are server-generated TOOL RESULT turns, never
      ↓                        client- or model-supplied)
STRUCTURED CLAIMS             (model returns {answer, claims[], uncertainties[]})
      ↓
SEMANTIC GROUNDING + PROVENANCE VALIDATION
      │                       (validateGrounding — ids, per-claim assertions,
      │                        closed-vocabulary source states, anti-upgrade)
      ↓
SERVER-GENERATED VERIFIED SURFACE
      │                       ('[field] = [value] [unit] — [source state]' per
      │                        matched typed fact — the model's prose is NEVER
      │                        the grounded surface)
      ↓
GROUNDED / UNGROUNDED STATE   (grounded=true ONLY for fully validated claims)
      ↓
PROVENANCE-AWARE UI           (provider · model · grounding mode · toolCalls ·
                               verified surface + labelled unverified commentary)
```

## Tool layer (Commit L1)

- Strict allowlist: `getStock`, `getFinancials`, `getPrices`, `getScore`,
  `getPeers`. Zod argument validation and security-master checks at the
  boundary; explicit failure states (`unknown-tool | invalid-args |
  unknown-symbol | no-data | failed`) — never a plausible fallback.
- Tools resolve ONLY through the canonical surfaces (registry, resolver,
  consensus engine, price path) — no second source of truth, no AI-side
  score recomputation. Peer figures are typed `seed`.
- Tools are server-only: there is NO HTTP surface and no client- or
  model-supplied tool result can enter the evidence set.
- The loop is bounded (`MAX_TOOL_ITERATIONS = 4`); exhaustion terminates the
  request BLOCKED (`structuredResponse: "blocked"`) with no fabricated answer.
  Every tool call rides the wire as `provenance.toolCalls` for audit.

## Server-generated verified surface (Commit L2)

- When grounding succeeds, the wire `text` is built by the SERVER from the
  validated typed facts — one statement per matched fact:
  `roe = 12 percent — live (observed/as-of 2026-09-30)`,
  `mktcap = 890000 inr_crore — seed/reference (may be stale)`,
  `score = 71 points — derived by the platform engine`.
- The model's prose rides separately as `provenance.commentary`, labelled
  "MODEL COMMENTARY · NOT VERIFIED" in the UI. It can never be rendered
  inside the grounded surface — an answer cannot be labelled grounded while
  containing unvalidated text.
- Provenance is part of the grounding contract: each matched fact carries a
  closed source state (`live | live-undated | derived | seed | unavailable`),
  and upgrade wording (seed/derived described as live/current/latest — a
  conservative closed vocabulary, no fuzzy NLP) is a hard failure, in claims
  and in the answer.
- Client-supplied conversation history is an UNTRUSTED transcript: the model
  contract pins its status and grounding validates against server evidence
  only. (A server-owned conversation store remains the follow-up.)

## Evidence package

| Id class | Example | Source surface |
|---|---|---|
| `stock:<sym>:profile` | `stock:RELIANCE:profile` | seed registry (name/sector/status) |
| `price:<sym>:<observedAt>` | `price:RELIANCE:2025-10-31T08:40:00.000Z` | `fetchLivePrice` (observation time = upstream's own; `:no-disclosed-observation-time` / `:unavailable` variants when absent/unavailable; STATIC status → seed-typed fact, DERIVED → derived-typed fact) |
| `fundamental:<sym>:<field>:<asOf>` | `fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z` (seed fields end `:seed`) | `resolveStockMetrics` — per-field `source`/`asOf` preserved verbatim |
| `score:<sym>:<engine>:<asOf>` | `score:RELIANCE:rishi-merit-v1:2026-09-30T10:00:00.000Z` | `getStockScore` — consumed, NEVER recomputed by the AI |
| `peer:<sym>:<peerSym>:seed` | `peer:RELIANCE:TCS:seed` | same-sector registry rows (all figures seed-typed) |
| `news:<stable-id>` | `news:et-991` | class supported; per-symbol news surface not wired → explicit `news:<sym>:unavailable` note is emitted instead (no invented headlines) |

Ids are deterministic: the same evidence state yields the same ids, so an
audit can re-derive what the model was allowed to cite.

## Evaluation (Commit L3)

`npm run eval:chat` runs the deterministic golden set
(`test/fixtures/eval-chat/golden.ts` — 113 questions across the 31 mandated
categories) and prints a contract-state matrix; CI runs the same fixtures
including the route-kind ugly paths (`test/evalChat.golden.test.ts`). Every
case asserts an EXPECTED CONTRACT STATE (grounded / mode /
structuredResponse / tool status / rejection substrings), never textual
similarity.

## Honest gaps (current)

- Per-symbol news is not wired (the `/api/news` RSS pipeline is
  market-level); the package emits an explicit unavailable note instead.
- Live fundamentals in the chat evidence path are bounded by a 10 s budget;
  on timeout the package degrades to seed-labelled fields (labelled, not
  fabricated) — the same degradation applies to the `getFinancials` tool.
- Conversation history remains client-supplied (validated shape, untrusted
  by contract); a server-owned conversation store is the follow-up
  architecture.
- The general (non-symbol) chat path is context-only by design pending
  FD-10; the tool loop engages only on the evidence-bound path.

## Canonical tool-state consistency (Commit M7)

The L1 defect this closed: `getFinancials` fetched live fundamentals
before resolving metrics, but `getStock`/`getScore`/`getPeers` called
`resolveStockMetrics(symbol)` with no live overlay — two tools in one AI
loop could answer from different data states for the same symbol (the
package and `getFinancials` live-capable; `getScore`/`getStock` seed
baseline).

The fix is structural, not duplicated logic: `lib/ai/evidence.ts` now
exports `createCanonicalStockState()` — a per-request,
per-symbol-memoized observation state (ONE bounded live-fundamentals
fetch, ONE price observation, ONE resolver application). The chat route
creates exactly one state per request and threads it through BOTH
`buildAiEvidencePackage()` and `generateEvidenceGroundedAnswer()` →
`executeAiTool()`. Within a request, the same symbol always yields the
same observation, so the initial evidence score and `getScore`'s score
fact are byte-identical (id + typed facts + text) by construction.
The price observation's raw promise is memoized: the package catches a
throwing surface and renders the honest unavailable item, while the
`getPrices` tool propagates it to the explicit `failed` state — one
observation, two consumption contracts.

Tool arguments are now STRICT (zod `.strict()`): an unexpected argument
is an `invalid-args` failure, never a silently stripped key — a forged
`result` member or smuggled instruction cannot ride the args through.
Fail-first evidence: `test/aiToolState.test.ts` (7 failing on the pre-M7
tree: state-consistency ×4, strict-args ×2, forged-result ×1).

## Model identity (Commit M7)

`DEFAULT_OPENAI_MODEL = "agnes-2.5-flash"` is INDEPENDENTLY ESTABLISHED
from configuration and provider evidence (Rule 1):
`docs/evidence/commit-m/model-identity-audit.json` — production env sets
`CHAT_MODEL=agnes-2.5-flash` on `https://apihub.agnes-ai.com/v1`
(registry-APPROVED as chat-api); the provider's own `/models` list
contains the id and completions echo `model: "agnes-2.5-flash"`.
Re-run: `tsx scripts/auditModelIdentity.ts` with the production chat env.
The registry entry now names the ACTUAL provider (agnes-ai.com), not
OpenAI; FD-8 (vendor terms review) remains OPEN. The /rishis model label
no longer hardcodes a vendor fallback — it says "model: not yet
reported" until a reply's provenance supplies one.
