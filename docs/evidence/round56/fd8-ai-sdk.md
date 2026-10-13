# Round 56 — FD8-AI-SDK: the provider-agnostic chat layer (vercel/ai)

Founder order (13 Oct 2026): "Next: queued builds — … vercel/ai …"
Adoption record: docs/evidence/round55/r55-batch2-adoption-record.md (tier-1 row 8:
"Adopt while FD-8 is open, as the provider-agnostic chat layer. Provider terms are a
separate check — recorded FOUNDER DECISION NEEDED on the provider before any provider
call; the A4 static no-model-surface pin stays untouched.")

## What changed (behavior-neutral by construction)

- deps: ai 7.0.138, @ai-sdk/openai-compatible 3.0.68, @ai-sdk/google 4.0.94 (all
  Apache-2.0; transitive deps land under the SDK umbrella — the A3 register re-run
  picks them up; #406 is the register vehicle).
- lib/ai/providers/openaiCompatible.ts + gemini.ts — the hand-rolled fetch plumbing
  is replaced by the SDK (`generateText`); the exported contracts are byte-identical
  (same names, same ProviderCompletion shape, same PROVIDER_MAX_OUTPUT_TOKENS, same
  error strings the router's health circuit keys on).
- maxRetries: 0 — the SDK's internal retry is OFF: one fetch per candidate attempt,
  failover stays owned by the router (the pinned Phase 5.1 chain semantics).

## Wire parity (probed against the installed SDK, 2026-10-13)

- OpenAI-compatible: same URL (baseURL/chat/completions), Authorization Bearer from
  the configured key (never the URL), temperature/top_p/max_tokens unchanged, E5
  json_object on the wire via the SDK's documented providerOptions passthrough
  (top-level responseFormat does not reach the openai-compatible wire in ai v7 —
  probed), the bounded naming-400 retry preserved, usage from the provider's own
  total (usage.raw.total_tokens — the same field the old adapter read).
- Gemini: documented path (v1beta/models/{model}:generateContent — supersedes the
  hand-rolled non-models path), x-goog-api-key header, systemInstruction +
  generationConfig (temperature/topK/topP/maxOutputTokens), usage from
  usageMetadata.totalTokenCount via usage.raw.
- W3 input bound: unchanged — the serialized logical request is refused before any
  network attempt (test/w3.inputBound.test.ts still passes with fetch-spy proof).

## Proof

- The pinned provider contract tests pass UNCHANGED at the wire level:
  e5.outputContract (json_object present, bounded retry, closed 400s),
  w3.inputBound (throw-before-fetch with fetch-spy), globalSpendReservation,
  chat.provider (T7 selection, key-on-header, model selection, base-URL
  normalisation), aiRouter (failover chain, health circuit, honest provenance),
  providerHealth, lp3.providerAliases — 101 tests passing across the battery
  (3 test files needed observation-shape updates only, invariants unchanged:
  1. header capture normalised to Title-Case (HTTP names are case-insensitive;
     the SDK emits the lowercased wire form);
  2. the gemini system-prompt assertion reads systemInstruction ?? system_instruction
     (the Google JSON API accepts either casing; the SDK sends the camelCase form);
  3. no assertion on provider error text changed).
- `npm run aiLoopAudit`: OK — 8/8 unified-loop invariants (the router is still the
  ONE AI entry point; no second path).
- tsc 0; eslint 0 on changed files.

## No provider call happens (the founder's condition)

Every test mocks globalThis.fetch; no CI step holds a provider key; chat stays
structurally 503 while FD-8 is open (CHAT_DISABLED contract untouched; #357 rides
separately). FOUNDER DECISION NEEDED (recorded, blocks only live calls): which
provider's terms govern the production chat leg — the OpenAI-compatible endpoint
configured via CHAT_API_* and/or Google Gemini via GEMINI_API_KEY. Recommended
default: keep FD-8 open; no live provider call until the terms check lands.

## Risk

The SDK's request envelope differs from the hand-rolled body beyond the pinned
fields (ordering, user-agent) — none of the pinned invariants observe those; the
health circuit keys on the preserved error strings. Rollback: single-commit revert.
