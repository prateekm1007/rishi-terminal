# B1 Per-symbol News Evidence — the first real product surface (pre-registration)

Roadmap item B1 ("PHASE B — B1 Per-symbol News Evidence"), the first
Phase-B item: Phase A is proven (A1–A10 CLOSED; the A10 closeout row
ends "the first real product surface mounts at B1"). Dependencies: A1
(contract), A8 (evidence primitives), A10 (the ONE intelligence API) —
all stable. This document is committed BEFORE any evaluation (the
A5–A10 precedent). The matching rule, the stable-id rule, the caps and
the no-new-capability rule are enforced by test — a silent change
breaks the build.

## What exists today (surveyed, reused — nothing rebuilt)

- `/api/news` (app/api/news/route.ts): the market-level RSS aggregator
  (`LiveNewsItem` — headline, summary, source, pubDate, tags, url,
  impact POSITIVE/NEGATIVE/NEUTRAL, region). Market-level: items are
  NOT mapped to symbols.
- `lib/ai/evidence.ts` `buildNewsItems(symbol, news?)`: the evidence
  id class `news:<stable-id>` is DECLARED ("class supported;
  per-symbol wiring pending") and the honest unavailable note is
  emitted today ("market-level feeds are not yet mapped to symbols").
- `components/intelligence/*` (A8): five thin server-safe primitives
  for rendering an A1 artifact — built, founder-scoped as UNMOUNTED
  until a real product surface consumes real intelligence.
- `/api/intelligence` (A10): `capability=thesis` serves the
  deterministic artifact; `capability=insight` honestly 404s until A4
  baselines accumulate (~2026-11-03).

## What B1 is

1. **THE deterministic symbol-match** (`lib/intelligence/newsMatch.ts`):
   `matchNewsForSymbol(symbol, company, items)` — a PURE function.
   A market-level item is evidence for a symbol iff its headline,
   summary or tags (lowercased, word-boundary) contain (a) the
   registry symbol token, or (b) the registry company name (exact,
   case-insensitive). No stemming, no synonyms, no partial tokens, no
   invented semantics; zero matches → an empty list (the honest
   unavailable note stays, never a guessed attribution). The registry
   is the ONE canonical stock registry — no second name list.
2. **The stable evidence id**: the pipeline's own `id` is time-seeded
   (`…-Date.now()`, line 304 of the route) and is therefore NOT
   identity-bearing. The match layer derives `news:` + sha256 over
   `source|link|pubDate|headline` (link `#` → headline carries the
   identity) — same content, same id, deterministic. The pipeline's
   own id field is untouched (its UI keys are not evidence identity).
3. **Evidence wiring** (one deps pass — no second pipeline): the
   evidence assembler's EXISTING `EvidenceDeps.news` slot is fed from
   the matched items (qualitative items: no `facts` array; source and
   pubDate verbatim; the feed's own impact label carried verbatim as
   FEED-provided, never recomputed here). Caps, pinned: at most 8
   items per symbol, ordered pubDate desc (recency), tie-break by
   stable id asc. `buildNewsItems` keeps its contract (matched items
   in → `news:<stable-id>` items; zero matches → the unavailable
   note, byte-identical to today's).
4. **The first real product surface**: the stock page mounts an
   intelligence panel that fetches THE ONE route
   (`/api/intelligence?capability=thesis&subject=<symbol>`) and
   renders the artifact through the A8 primitives — the A8
   unmounted-by-design primitives meet real intelligence for the
   first time. Client-side fetch of the ONE API surface (no page
   imports the chain runner — the A10 single-consumer pin holds; no
   second endpoint; no direct chain consumption from a page).

## What B1 is NOT

- not a new capability: the registry stays `{thesis, insight}` — news
  is EVIDENCE, not a capability (B1+ capabilities arrive by their own
  PRs editing the registry, per the A10 pre-registration);
- not materiality: A4 has no NEWS threshold; news items never enter
  the A2→A7 observation chain, the thesis ledger, or any spend gate
  (the chain runs exactly as A10 shipped it — this PR adds no chain
  input). Insight generation eligibility remains A4's EXCLUSIVE call;
- not an AI path: matching, ids, caps and ordering are pure
  computation (no model selects, steers or labels anything);
- not a second news pipeline: `/api/news` remains the ONE fetcher;
  the match layer consumes its output shape, never re-fetches.

## Fail-closed table (all named)

| Case | Treatment |
|---|---|
| zero matched items for a symbol | the honest unavailable note (byte-identical to today's) |
| an item whose source or headline is empty | refused from matching (no evidence item — never a half-attributed citation) |
| an item matching MANY symbols | attributed to each (the headline names them all — verbatim text, no per-symbol rewriting) |
| > 8 matched items for one symbol | the 8 most recent (pubDate desc, stable-id asc tie-break) |
| the /api/news fetch fails or returns non-JSON | the caller's existing failure semantics (empty deps → unavailable note; never a fabricated item) |
| the intelligence route errors (5xx) | the panel renders the honest unavailable state (A8's empty-state discipline) — never a fake artifact |

## No-second-path pins (static, CI)

- `lib/intelligence/newsMatch.ts` imports no provider module, no
  router, no fetcher; keeps no clock and no randomness;
- the stock-page panel fetches ONLY `/api/intelligence` (the ONE
  surface) — no page imports `runIntelligenceChain` (the A10
  single-consumer scan unchanged);
- `buildNewsItems` remains the ONE news→evidence mapping (the match
  layer feeds it; no parallel mapping exists).

## Verification plan

- RED: fail-first import-fail on `@/lib/intelligence/newsMatch`
  (rule 21), plus route/page pins on the pre-module tree;
- GREEN: match-rule pins (word-boundary, company name, multi-symbol
  attribution, caps, ordering, empty-refusals, stable-id determinism
  over identical content), evidence-mapping pins (id class, verbatim
  source/pubDate, unavailable note byte-identity), panel pins (the
  ONE route fetch, A8 primitive render, honest unavailable state);
  battery + CI;
- production legs on the exact deployed SHA: `/api/news` live →
  matched evidence for a high-coverage symbol through the panel's
  path; the thesis surface unchanged (news adds no chain input — the
  changeKey for identical state stays identical, pinned); the panel
  serving on a baked stock route; refusal + unavailable states;
  latency capture.
