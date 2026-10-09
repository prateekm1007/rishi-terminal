# INT-A9 — Ask Rishi: server-resolved insight context for the EXISTING chat

Round 34 (2026-10-09). Roadmap item A9; dependencies A1, A7, A8 and the
existing chat loop. Pre-registration:
`docs/intelligence/chatContext.md` (commit `d7f9e78`, BEFORE any
evaluation). PRs: #286 (implementation, merged as `8979029`),
#287 (production-leg repairs, merged as `87d8b17`).

## Scope honesty

A9 ships the SERVER capability: /api/chat accepts the deterministic A7
change key (`insightRef`, 64-hex), resolves the artifact server-side
through the persistent cache, validates it through the ONE A1 parser,
refuses closed on every bad reference, and anchors the SAME bounded
loop to it (evidence joined package-first; prose rides a labelled
server-composed block; the anchor is disclosed on the wire). No new
endpoint, no second provider/evidence/prompt path — `aiLoopAudit` 8/8.
The Ask Rishi UI affordance mounts on product surfaces at A10+ per the
frozen architecture (`/api/intelligence → product surface → Ask Rishi
→ existing /api/chat`).

## Sequence (per PR)

- Branch `feat/int-a9-ask-rishi` from EXACT `origin/main = 8139411`
  (`check:branch` PASS; zero open PRs; no existing Ask Rishi component
  found — duplicate search clean; the A1 `chat-context` feature id was
  unused and is now the fixture/anchor feature).
- Commit 1 (docs-only pre-registration): the reference rule, the
  fail-closed table (8 named refusals), the rendering rule, the
  no-second-path pins; roadmap section-3 snapshot label repaired
  (direction 5 — the stale "as of 345134c" heading now distinguishes
  the historical baseline from the forward-maintained rows).
- Commit 2 (fail-first, RED captured): 16 route pins + the lib suite
  fail at import / behave as pre-A9: refusal cases rode plain chat
  into the provider, and the grounded claim was discarded with
  `unknown evidence id(s) "price:RELIANCE:window-close"` — the exact
  defect A9 exists to close. Raw: vitest exit 1, 13 failed | 3 passed.
- Commit 3 (implementation): `lib/intelligence/chatContext.ts`
  (reference contract, closed refusal union + HTTP mapping, resolver
  with caller-injected clock, pure deterministic block builder,
  package-first evidence merge), the route wiring (additive; the
  router untouched), the additive wire field
  (`provenance.insightContext`). GREEN 41/41.
- Gate bites (rule 24): (1) staleness-gate removal on a scratch basis
  → the stale/status pin failed; (2) a second-consumer reference
  injected into another lib module → the single-consumer pin failed —
  and the bite EXPOSED A REAL HOLE: the pin matched the module
  specifier only, so a relative `./chatContext` import would have
  escaped; the pin was tightened to ANY `chatContext` reference in the
  same PR (restored to 41/41 after both bites).

## Battery (both merge heads)

tsc 0; eslint 0 errors / 283-warning ratchet holds (one new unused-var
warning caught and fixed before push); vitest 182 files / 2002 tests
ALL PASSING (1998 after the repairs; +61 A9 pins over the A8 baseline
1957); encoding clean; T12 validateStocks clean; scoreParity 0
mismatches / 0 non-finite of 896; build exit 0; ISR manifest gate
PASS; bundle budget OK (max 169.3 kB vs 200 kB, ratchet holds);
aiLoopAudit OK 8/8; provenance regeneration byte-identical (no new
route — the audit re-run left `docs/PROVENANCE.md` unchanged).

## CI + cadence + merges

- #286: all 6 blocking checks SUCCESS on head `f53368e`; merge-guard
  gates 0-6 (pinned head, merge-base == main tip twice, checks green,
  cadence 146.9 min since 36e95b2) → MERGED as `8979029`; merge-commit
  CI ALL 6 SUCCESS.
- #287: the C8 cadence gate BIT inside CI (the job failed at 57.1 min
  after the #286 merge) — honored, the job re-run at window open via
  `POST /actions/jobs/{id}/rerun` → ALL GREEN. First merge attempt
  refused by gate 2 (stale base: the branch parented on f53368e while
  main's tip was the merge commit) → repaired by rebasing the repair
  commit onto the EXACT main tip (`71a6856`) → all 6 checks SUCCESS →
  gates 0-6 → MERGED as `87d8b17`; merge-commit CI ALL 6 SUCCESS.
- Process note (disclosed): the repair commit was initially made on
  LOCAL main by mistake; origin/main was never touched (the stray push
  was a no-op branch-ref push); the commit was cherry-picked onto the
  item branch and local main reset to origin — C7 restored within the
  same session.

## Production legs (both, sanctioned probes + real requests)

Deployment of `8979029`: /api/version == 8979029 (C6 merged+deployed).
Deployment of `87d8b17`: /api/version == 87d8b17 (exact main tip).
Health ok. `scripts/a9/prodVerifyA9.mjs` (liveVerify032 precedent —
EXACT app paths, self-cleaning, disclosed):

1. Change key via the A7 rule (`c22b9bf3…`, 64 hex).
2. Fixture write via `insight_cache_write` (service role) → hit_count
   0; read via `insight_cache_read_hit` → hit_count 1. The fixture is
   a HONESTLY LABELLED chat-context artifact composed from the seed
   registry values copied VERBATIM from `data/stocks/index.ts`
   (RELIANCE: name, sector, roe 14, promo 50.3; `source: "seed"`;
   summary: "Verification fixture (INT-A9)… not live intelligence");
   provenance synthesisPath deterministic (no model involved).
3. REAL production contextual chat (POST /api/chat, insightRef, no
   symbol): HTTP 200; `provenance.insightContext` EXACT
   (changeKey/feature/subject/ok/deterministic/deterministic); the
   loop ran with the merged evidence (price fetch 83-92 ms,
   fundamentals 795-870 ms, memo hits, 2 completions incl. the bounded
   repair); latency attribution on the wire (wallMs 22.3 s / 21.7 s,
   evidenceMs 875 / 799, validationMs 5); quota/burst/global-spend
   controls all active. On `87d8b17` the answer reports the artifact
   FAITHFULLY ("the RELIANCE verification fixture (INT-A9) is built
   from seed reference data …; it is not live intelligence").
4. Refusals in production: forged shape → 400 "Invalid insight
   reference"; well-formed missing key → 404 "Insight not available"
   (this leg FAILED on the pre-repair deployment — 422 — and is the
   repair below).
5. UI positive control: GET /rishis → 200, chat-surface markers
   present.
6. Cleanup: DELETE → 204, residue rows 0.

## Production-leg finding #1 → repair #287 (reader miss shape)

The deployed `insight_cache_read_hit` returns an ALL-NULL ROW OBJECT
on a miss (`{"id":null,"change_key":null,…}` — the atomic
UPDATE…RETURNING no-match row), not SQL null. A7's reader read it as
a truthy record → null payload → the resolver refused 422
(invalid-payload) where A9's pre-registered table demands 404
(not-found). The A7 pinned contract is "miss → null"; the miss shape
had never been probed through the app path (the A7 live cycle probed
hits only; the unit mocks returned `data: null`). Repair per roadmap
execution rule 7 (fail-first regression + repair, never a silent
replacement): 2 pins on the exact production shape (RED on the
pre-repair reader) → `readCachedInsight` normalizes a null/shapeless
row to null → GREEN; live-verified 404 on `87d8b17`.

## Production-leg finding #2 → block citation instruction (#287)

The first positive leg (on 8979029): the model answered from the LIVE
package facts while attributing them to the artifact, producing no
claims. #287's block now names the artifact's OWN evidence ids with
the citation instruction. On 87d8b17 the model describes the artifact
faithfully and ATTEMPTED artifact-content claims, but composed an
invented id ("artifact: insight:…") — grounding REJECTED it
(`unknown evidence id(s)`) twice → the bounded honest state
(grounded=false, mode evidence-context, structured=valid) was served
with the wire disclosure intact. Honest reading: the grounding
contract held (no invented id can ground; server-owned ids only —
direction 13), the contextual continuation is real (reference
resolved server-side, disclosure exact, the artifact shaped the
answer), and the provider's claim discipline against insight evidence
ids remains a disclosed provider-quality limitation. CI proves the
grounding path for insight-id claims with the REAL validator (the
route test's grounded claim cites `price:RELIANCE:window-close` and
passes); production proves resolution/refusal/controls. No further
prompt iteration in A9 — the synthesis-side claim discipline belongs
to A10's generator scope.

## Definition of Complete (roadmap rule 6)

code ✓ (merged #286 + #287) · fail-first test ✓ (RED captured twice) ·
regression ✓ (182 files / 2002) · CI ✓ (6/6 on both heads + merge
commits) · merged ✓ (8979029, 87d8b17) · deployed ✓ (/api/version ==
87d8b17, exact main tip) · exact SHA ✓ · real production execution ✓
(contextual chat + refusal legs) · real prod UI ✓ (/rishis serves;
the affordance mounts at A10+ by the frozen architecture) · grounding
✓ (server-owned ids enforced live; invented id rejected) · provenance
✓ (wire disclosure exact; timings/toolCalls ride) · latency ✓
(wallMs/evidenceMs/completions captured) · raw evidence ✓ (this file
+ `scripts/a9/prodVerifyA9-output*.txt`) → **A9 CLOSED**.

Standing item (untouched, isolated): #267 health-semantics decision.
