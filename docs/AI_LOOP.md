# End-to-End AI Loop (Commit L + Commit M reconciliation — ONE unified verified pipeline)

Every AI answer — on a stock surface AND in general `/rishis` chat — flows
through ONE chain. **Commit M closed the last bypass**: the historical
no-evidence path that returned raw unstructured provider text is GONE; a
request without a symbol enters the SAME bounded tool loop (the model may
request canonical tools; a clean claims-free, number-free reply is served
explicitly as unverified context-only text; unsupported financial figures
are discarded, never shown). No component may bypass the pipeline
(enforced by the router being the only AI entry point and by
`npm run aiLoopAudit`).

Commit M additionally: tool arguments are STRICT zod contracts
(`.strict()` — unexpected keys are rejections, not stripped fields); the
evidence assembler and every tool consume the ONE per-request
`CanonicalStockState` observation (same inputs → same resolved state);
score ids/statements carry a closed observation-state vocabulary
(`seed-derived | <asOf> | live-undated | live-mixed-observation |
mixed-provenance`); the implicit provider model default is attested in
`ATTESTED_PROVIDER_MODELS` (lib/registry/providerRegistry.ts) with runtime
verification in `scripts/auditModelIdentity.ts`, failing closed when
unattested.

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
  `getPeers`. Zod argument validation and the ONE canonical registry gate
  (`lib/registry/validateInput`) at the boundary; explicit failure states
  (`unknown-tool | invalid-args | unknown-symbol | no-data | failed`) —
  never a plausible fallback. Since R9-12 the boundary is the canonical
  price registry (not the stock master alone): genuinely unknown symbols
  answer `unknown-symbol`, while a registry instrument without an equity
  security-master record (WTI, USD/INR, BTC, IN10YS…) answers honest
  `no-data` from the stock-only tools and is served by `getPrices`.
- Tools resolve ONLY through the canonical surfaces (registry, resolver,
  consensus engine, price path) — no second source of truth, no AI-side
  score recomputation. Peer figures are typed `seed`.
- Tools are server-only: there is NO HTTP surface and no client- or
  model-supplied tool result can enter the evidence set.
- The loop is bounded (`MAX_TOOL_ITERATIONS = 4`); exhaustion terminates the
  request BLOCKED (`structuredResponse: "blocked"`) with no fabricated answer.

## Server-enforced canonical engagement + bounded final-answer repair (2026-10-02 round 3)

Coder Directions §5: for a detected financial-data ask, the pipeline must not
fall back to `grounded=false / evidence-context` merely because the model
declined to choose a tool. Two server-side contracts close that gap — both in
the ONE canonical loop (`lib/ai/router.ts`), with no second witness path and
no weakening of validation:

- **Reactive canonical engagement** (`lib/ai/financialIntent.ts`
  `intentSeedTool`): when a no-initial-evidence request matches a registry
  symbol AND a closed OBSERVABLE-data term (prices, fundamentals, scores,
  peers) and the model's first completion answers with ZERO tool calls, the
  server executes the canonical tool for the detected ask through the REAL
  executor and re-asks once with the TOOL RESULT in the transcript. A
  well-behaved model that requests tools itself pays zero overhead.
  Advice-shaped asks (buy or sell, target price, ratings, recommendations)
  are never seeded — a tool result must not auto-answer advice; they keep
  the existing intent backstop (BLOCKED on zero engagement).
- **One bounded final-answer repair**: when a final structured reply fails
  the contract (schema/parse, grounding rejection, or a claims-free
  restatement of data the loop already received), the loop re-asks ONCE on
  the SAME transcript, appending the server's rejection reason as a user
  turn (`SERVER VALIDATION FEEDBACK`). The retry runs the same
  parse → zod → grounding validation and the same server-generated
  surfaces. Exhausted repairs fall through to the unchanged fail-closed
  states (`invalid` / blocked / discarded — raw model text is never
  displayed).
- **Words-in-prose hole closed**: a claims-free reply restating a received
  observation in WORDS ("one thousand one hundred …") rode past the numeric
  gate as context-only. For a detected data ask whose tool returned ok, an
  uncited reply is now repaired and, failing that, BLOCKED — the received
  data is never re-served as unverified context.

Contract tests: `test/aiRouter.requestPath.test.ts` (server-enforced
engagement, repair grounds, exhausted repair stays fail-closed, advice and
philosophy untouched, words-hole pinned).
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
| `price:<sym>:<observedAt>` | `price:RELIANCE:2025-10-31T08:40:00.000Z` | `fetchLivePrice` (observation time = upstream's own; `:no-disclosed-observation-time` / `:unavailable` variants when absent/unavailable; STATIC status → seed-typed fact, DERIVED → derived-typed fact). R11: the price fact's UNIT derives from the instrument (FX → the pair's quote currency, bonds → `percent` — the observation is a yield, global commodities/crypto → `usd`, MCX contracts → `inr`, index levels → `points`, equities → `inr`) |
| `fundamental:<sym>:<field>:<asOf>` | `fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z` (seed fields end `:seed`) | `resolveStockMetrics` — per-field `source`/`asOf` preserved verbatim |
| `score:<sym>:<engine>:<asOf>` | `score:RELIANCE:rishi-merit-v1:2026-09-30T10:00:00.000Z` | `getStockScore` — consumed, NEVER recomputed by the AI |
| `peer:<sym>:<peerSym>:seed` | `peer:RELIANCE:TCS:seed` | same-sector registry rows (all figures seed-typed) |
| `instrument:<sym>:non-equity` | `instrument:WTI:non-equity` | R11 (directive 9): non-equity registry instruments — the honest "not an equity security" note that replaces fundamentals/score/peers items in the instrument package |
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

RECONCILED (R11, directive 11 — this section previously said the general
non-symbol path was context-only and the tool loop engaged only on the
evidence-bound path; that described the pre-Commit-M architecture and
contradicted the runtime): EVERY request — with or without initial
symbol evidence — runs the SAME bounded tool loop
(`lib/ai/router.ts`). A no-evidence request whose message matches a
registry symbol plus a closed data term gets reactive canonical tool
seeding (`intentSeedTool`, §"Server-enforced canonical engagement"), and
a detected financial ask that still engages zero tools is repaired then
BLOCKED — never silently downgraded to context-only. The chat route's
`symbol` parameter accepts the full canonical registry since R11
(directive 9): non-equity instruments seed the instrument package
(price observation + non-equity note) instead of the equity package.

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
