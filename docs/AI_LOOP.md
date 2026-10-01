# End-to-End AI Loop (T51/T52 destination — implemented)

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
AI PROVIDER ROUTER            (lib/ai/router.ts — approved providers only, failover)
      ↓
STRUCTURED CLAIMS             (model returns {answer, claims[], uncertainties[]})
      ↓
EVIDENCE-ID VALIDATION        (validateGrounding — every id checked, fail closed)
      ↓
GROUNDED / UNGROUNDED STATE   (grounded=true ONLY for fully validated claims)
      ↓
PROVENANCE-AWARE UI           (provider · model · grounding mode · claims with ids)
```

## Evidence package

| Id class | Example | Source surface |
|---|---|---|
| `stock:<sym>:profile` | `stock:RELIANCE:profile` | seed registry (name/sector/status) |
| `price:<sym>:<observedAt>` | `price:RELIANCE:2025-10-31T08:40:00.000Z` | `fetchLivePrice` (observation time = upstream's own; `:no-disclosed-observation-time` / `:unavailable` variants when absent/unavailable) |
| `fundamental:<sym>:<field>:<asOf>` | `fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z` (seed fields end `:seed`) | `resolveStockMetrics` — per-field `source`/`asOf` preserved verbatim |
| `score:<sym>:<engine>:<asOf>` | `score:RELIANCE:rishi-merit-v1:2026-09-30T10:00:00.000Z` | `getStockScore` — consumed, NEVER recomputed by the AI |
| `news:<stable-id>` | `news:et-991` | class supported; per-symbol news surface not wired → explicit `news:<sym>:unavailable` note is emitted instead (no invented headlines) |

Ids are deterministic: the same evidence state yields the same ids, so an
audit can re-derive what the model was allowed to cite.

## Grounding semantics (fail closed)

- `grounded=true, groundingMode="structured-claims"` requires: the model
  replied in the structured contract, AND every claim's every `evidenceId`
  exists in that request's evidence package.
- ONE unknown id fails the whole batch: no claim is served as verified
  (a model that invents one citation cannot be trusted partially); the
  rejection names the offending id in `uncertainties`.
- A reply that ignores the JSON contract degrades honestly to unverified
  text (`evidence-context`) — the answer is still shown, no claims are made.
- Empty claims from the model → `evidence-context`, `grounded=false`.
- Evidence-context injection ALONE (the pre-loop state) never sets
  `grounded=true` — that rule is unchanged from Phase 5.1.

## UI propagation

`/api/chat` returns `provenance: { provider, model, generatedAt, grounded,
groundingMode, claims[] }`. RishiChat and the stock WisdomSidebar retain and
render it: every AI message shows which provider/model produced it, whether
its claims were validated, and — when grounded — each claim with its
evidence ids. Provenance is never hidden behind a bare boolean.

## Honest gaps (current)

- Per-symbol news is not wired (the `/api/news` RSS pipeline is
  market-level); the package emits an explicit unavailable note instead.
- Live fundamentals in the chat evidence path are bounded by a 10 s budget;
  on timeout the package degrades to seed-labelled fields (labelled, not
  fabricated).
- Grounding validates CITATION INTEGRITY (ids exist and support claims as
  labelled). It does not re-verify the semantic truth of the claim text —
  that is the model's burden under the persona contract.
