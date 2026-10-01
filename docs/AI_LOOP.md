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
| `fundamental:<sym>:<field>:<fragment>` | `fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z` | `resolveStockMetrics` — per-field `source`/`asOf` preserved verbatim. Fragments never collide (Commit D §3): `:seed` = seed data; a disclosed observation time = that time; live WITHOUT a disclosed time = `:no-disclosed-observation-time` (never `:seed`); a pure-seed derivation = `:seed-derived`; a mixed-source derivation (seed price × live BVPS, i.e. PB) = `:no-disclosed-observation-time` with the mixed-source note in the text |
| `score:<sym>:<engine>:<asOf>` | `score:RELIANCE:rishi-merit-v1:2026-09-30T10:00:00.000Z` (`:seed-derived` / `:no-disclosed-observation-time` variants) | `getStockScore` — consumed, NEVER recomputed by the AI |
| `news:<stable-id>` | `news:et-991` | class supported; per-symbol news surface not wired → explicit `news:<sym>:unavailable` note is emitted instead (no invented headlines) |

Ids are deterministic: the same evidence state yields the same ids, so an
audit can re-derive what the model was allowed to cite.

## Grounding semantics (fail closed)

- `grounded=true, groundingMode="structured-claims"` requires: the model
  replied in the structured contract, AND every claim's every `evidenceId`
  exists in that request's evidence package, AND every numeric assertion
  `{field, value, unit}` EXACTLY matches a typed fact on the claim's OWN
  cited items.
- ONE unknown id or ONE unsupported figure fails the whole batch: no claim
  is served as verified (a model that invents one citation cannot be
  trusted partially); the rejection names the offender in
  `provenance.groundingRejections`.
- **Claim-text semantics (Commit D §2A):** every number a numeric claim
  states must be one of its VALIDATED ASSERTION values — a number that
  merely appears in the cited evidence's prose (a date, an id, another
  metric) proves nothing. A unit marker written next to a prose number must
  match the asserted unit (`"ROE is 12x"` is not `roe=12 percent`), and a
  numeric claim may not name a metric it does not assert (`"P/E is 12"`
  with only an `roe` assertion is rejected). The checks are deterministic
  closed tables (unit-marker list, metric-name list) — no fuzzy NLP.
- **Server-generated verified claims (Commit D §2A):** for every numeric
  claim the platform publishes its own canonical statement derived from the
  validated assertions — `roe = 12 percent — verified against
  fundamental:RELIANCE:roe:<asOf> (live)` — instead of the model's
  sentence. Model prose is never the semantically verified surface.
- **Answer floor (Commit D):** numbers in the answer must trace to the
  validated assertions or to TYPED FACTS of the cited items — never to
  evidence prose; the same unit-marker and metric-name rules apply. The old
  `citedTextNumbers` escape route is gone.
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
- Grounding validates assertion semantics against TYPED FACTS with
  deterministic closed tables (unit markers, metric names). A paraphrase the
  tables do not recognise is not caught by the NAME check — but the value
  and unit checks still bind, and the SERVED verified claim is always the
  server-generated canonical statement, so unverifiable model prose is
  never published as verified.
- Fundamentals provenance (Commit D §3): none of today's fundamentals
  parsers captures an upstream-disclosed observation timestamp, so live
  fundamentals currently resolve with `asOf = null` (id fragment
  `no-disclosed-observation-time`) until a vendor surface exposes one. This
  is the honest state; a capture timestamp may only return with a real
  upstream disclosure.
