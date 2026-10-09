# A10 /api/intelligence — the ONE intelligence API surface (INT-A10, pre-registration)

Roadmap item A10 (`docs/INTELLIGENCE_ROADMAP.md`: "/api/intelligence
(the one intelligence API surface)"; frozen architecture: "one
intelligence API"). Dependencies: A1–A9 (the full substrate: contract,
history, events, materiality, thesis, deltas, change key + cache,
evidence primitives, and the anchored chat loop).

This document is committed BEFORE any evaluation (the A5/A6/A7/A8/A9
precedent). The capability registry, the fail-closed table, the
generation gate, and the no-second-path pins are enforced by test — a
silent change breaks the build.

## What this module is

1. **The ONE surface** product surfaces consume (Phase B–J mount on
   it): `GET /api/intelligence?capability=<id>&subject=<symbol>`.
   Every intelligence response IS a validated A1 `RishiInsight` —
   parsed at the boundary (`parseRishiInsight`, the ONE parser) or the
   response fails closed.
2. **A closed capability registry** (`INTELLIGENCE_CAPABILITIES` in
   `lib/intelligence/capabilities.ts` — the mechanical gate against
   invented capability ids). Phase-A registry:
   - `thesis` — the DETERMINISTIC insight: A2 history → A3 events →
     A4 verdicts → A5 `buildThesisState` → composed into an A1
     artifact (modelStatus `deterministic`, provenance
     `deterministic`, `whatChanged`/`evidence` computed by the chain,
     changeKey from A7's `changeKeyOf` over the event changeIds).
     ZERO AI tokens by construction (no model surface in the path —
     static pin).
   - `insight` — the PERSISTENT insight: resolve the chain → change
     key → A7 cache read. HIT: parse-or-serve. MISS + `aiSpendAllowed`
     (A4 material verdict): generate through the ONE bounded loop —
     the deterministic layer computes evidence/whatChanged/status/
     confidence/materiality/provenance; the model synthesizes ONLY
     summary/whyItMatters/uncertainty/nextInvestigations prose through
     `generateEvidenceGroundedAnswer` (the canonical router, canonical
     evidence package, existing timings/usage) — assemble → parse A1 →
     `writeCachedInsight` → serve. MISS + non-material: 404 honest
     state, ZERO AI spend (the A4 economic gate, direction 11: the
     model never decides importance; A4 alone gates synthesis).
3. **Server-side context resolution**: the chain runner (A2→A3→A4→A5→
   A6→A7) lives in `lib/intelligence/chain.ts` — ONE composition of
   the substrate engines, each invoked exactly once per request;
   caller-injected clock (the A4/A9 purity precedent); no second
   projection/classification/thesis implementation anywhere.
4. **Controls (reuse, never a second stack)**: validation-first
   refusals cost nothing; the generation path reserves/settles/
   releases through the EXISTING `lib/chat/globalSpend` and the
   persistent `checkRateLimit` (rule 12: anything that spends has a
   persistent limit and an atomic counter); identity via the existing
   session/anon machinery (read for audit, not a gate — the founder
   free-access decisions stand; entitlement wiring arrives with its
   own founder decision if ever needed).

## What this module is NOT

- not a second synthesis engine: one router, one evidence package, one
  grounding contract — the generator is a NEW CALLER of the existing
  loop, never a parallel path;
- not a second cache/history/event/materiality implementation (rule 14
  — the chain runner only COMPOSES the one of each);
- not feature breadth: B1+ capabilities are added by their own PRs
  editing the registry (the mechanical rule A1 established for
  features);
- not a clock, not a random source: every timestamp comes from the
  caller-injected clock or the database.

## Contract (pinned)

```
GET /api/intelligence?capability=<id>&subject=<symbol>
  -> 200 { ok: true, capability, subject, insight: <A1 RishiInsight> }
  -> fail-closed (all before any generation or spend):
     400 { error: "Invalid capability" }        — id not in the registry
     400 { error: "Unknown symbol" }            — registry gate refuses
     404 { error: "No generated insight for this subject" }
                                                 — cache miss + non-material
     404 { error: "Insight not available" }     — generation refused/failed
                                                  (never a fabricated artifact)
     503 { error: "Intelligence unavailable" }  — chain/infrastructure errors
```

- Response `insight` fields follow A1's field-provenance rules
  verbatim: `whatChanged` numbers come from the chain's typed facts;
  model-synthesized prose is limited to summary/whyItMatters/
  uncertainty/nextInvestigations; `materiality` is set ONLY by A4's
  verdict mapping; `status`/`confidence` follow A1's derivation rules;
  `provenance` is `deterministic` unless the bounded loop produced the
  prose (then the full trio, or the artifact refuses).
- Determinism: identical chain state → identical `changeKey` → cache
  hit serves the stored artifact (regeneration PRESERVES hit_count —
  A7 semantics).

## Fail-closed table (all named)

| Case | Treatment |
|---|---|
| capability not in the registry | 400, nothing runs |
| subject not registry-resolvable | 400, nothing runs |
| chain read fails (A2/infrastructure) | 503 (honest unavailable) |
| chain yields no events (empty history) | deterministic insight with `status: "unknown"` (the unknown stays unknown) — ZERO AI |
| cache read throws | 503 |
| cache miss + non-material | 404, zero AI spend |
| cache miss + material + generation refused/failed | 404 "Insight not available" (never a fabricated artifact) |
| assembled artifact fails A1 parse | refused (never served, never cached) |
| cache write fails | the artifact still serves (disclosed) but is not persisted; logged |

## No-second-path pins (static, CI)

- `lib/intelligence/chain.ts` imports no provider module and no router
  (the chain is deterministic; only the route's generation step calls
  the router);
- `generateEvidenceGroundedAnswer` is imported ONLY by the chat route
  and the intelligence route (two sanctioned callers, ONE loop);
- `/api/intelligence` is the ONLY route importing the chain runner;
- no `Date.now()`/`Math.random()` in `chain.ts`/`capabilities.ts`
  (caller-injected clock).

## Verification plan

- RED: fail-first import-fail + closed-state pins on the pre-module
  tree (rule 21);
- GREEN: registry/refusal pins, chain-runner determinism + A4
  economic-gate pins (non-material → zero router invocations, proven
  behaviorally and statically), cache write/read cycle through the A7
  functions, A1 boundary validation, single-caller source pins;
  battery + CI;
- production legs on the exact deployed SHA:
  `capability=thesis&subject=RELIANCE` (deterministic insight served,
  zero AI), `capability=insight` honest miss/non-material states, the
  cache-hit path through the labelled verification fixture (written
  and removed via the EXACT A7 path — the liveVerify032/A9 precedent,
  zero residue), refusal legs (invalid capability / unknown symbol),
  latency + provenance capture; UI positive control = the fixture
  route still serves (A8) — product-surface mounting arrives at B1+.
- Honest scope note (recorded now): A4 is fail-closed until ~20-day
  baselines accumulate (~2026-11-03) — until then every verdict is
  non-material, so the generation path is UNTRIGGERABLE in production
  (proven as the honest 404; the generation code path is proven in CI
  with the real router + grounding). This is the A4 design, not an
  A10 gap.
