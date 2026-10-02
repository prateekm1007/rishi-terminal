# Commit O — raw provider diagnostics (2026-10-02, pre-fix)

Probe: /home/z/my-project/scripts/rawProviderProbe.mjs (outside repo; Rule 32-37 — no credentials in repo).
Reproduction of the exact two-turn conversation `lib/ai/router.ts` builds for the
canary question "What is the latest price of RELIANCE?" (anonymous, no initial
evidence, persona damani, router-exact sampling temperature=0.9 top_p=0.95 max_tokens=2048).

## Finding 1 — model emits the WRONG claims shape (deterministic, blocks the grounded canary)

Turn 1 (correct): model requests `{"tool": "getPrices", "args": {"symbol": "RELIANCE"}}`.
Turn 2 (after real TOOL RESULT), the model replies:

```json
{"answer":"The latest observed price for RELIANCE is 1167.7 INR, with a change of 0 percent as of October 1, 2026.","claims":["price:RELIANCE:2026-10-01T09:45:00.000Z"],"uncertainties":[]}
```

`claims` carries raw EVIDENCE-ID STRINGS. `StructuredModelOutputSchema` requires
claim OBJECTS: `[{claim, evidenceIds, assertions}]`. zod rejects the whole reply
→ structuredResponse="invalid" → fail-closed honest response, grounded=false.
Verified on the local production build (next start, real provider): 4/4 attempts
200 + structuredResponse=invalid + toolCalls=[getPrices:ok].

## Finding 2 — empty completion (provider/model quirk)

At temperature 0.2 the same turn-2 request returned content:"" (raw). The provider
client throws `openai-compatible empty completion` → failover chain exhausted →
route 502 + quota refund. Matches the production 502 signature.

## Finding 3 — Agnes free-tier rate limiting (production 502 burst cause)

```
429 {"error":{"message":"You've reached the API rate limit for free users. Upgrade to a Token Plan...","type":"AgnesAI_error"}}
```

Rapid successive chat calls (matrix + canary retries + manual curls) hit the
free-tier rate limit; callOpenAiCompatible throws HTTP 429 → failover exhausted
→ 502 "Chat service error". The canary must pace attempts and the operator must
expect 429-driven 502s on bursts.

## Finding 4 — model fabricates tool narratives in prose (contained, but recorded)

Turn 1 at temperature 0.9 once returned the tool request JSON followed by an
INVENTED tool run: fake timestamps (2026-07-20), invented prices (2996.8 / 3005.6
"NSE"), fabricated provenance ("service":"price-feed","source":"nse"). The router's
strict structural extraction consumes ONLY the leading {"tool","args"} JSON and
the real server tool result replaces the narrative — containment held. Recorded
as evidence that the verified-surface contract must stay strict.

## Production probes at ce5fbcbc6be83ff4354b74247e92a81da864ad40 (2026-10-02T06:03-06:12Z)

- POST /api/chat price question → 502 {"error":"Chat service error"} (0.8-1.3s; 429/empty upstream, logged server-side only)
- POST /api/chat philosophy question → 200 (context-only, provider healthy between bursts)
- POST /api/prices/batch ["RELIANCE"] → 200 in 2.1s cold / 0.5s warm; price=1167.7 yahoo-bulk; change=0 changePercent24h=0 (Rule-16 defect visible on the wire — missing upstream change coerced to 0)
- prodFreeAccessMatrix.mjs → 36/36 PASS (raw: docs/evidence/commit-n/production-free-access-matrix.json regenerated at this SHA)
- prodGroundedCanary.mjs → FAIL (attempt 1: grounded=false fail-closed; attempts 2-3: 502) — the tool-execution proof exists but the end-to-end grounded loop does not close at this SHA
