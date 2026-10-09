# INT-A10 — /api/intelligence: the ONE intelligence API surface

Round 35 (2026-10-09). Roadmap item A10; dependencies A1–A9 (all
closed). Pre-registration: `docs/intelligence/intelligenceApi.md`
(commit `7943966`, BEFORE any evaluation). PRs: #289 (implementation,
merged as `2d5d683`), #290 (production-leg repair, merged as
`08ed558`). Production serves `08ed558c…` = exact main code tip.

## Scope honesty

A10 ships the ONE intelligence API surface: `GET
/api/intelligence?capability=<id>&subject=<symbol>` with a closed
Phase-A capability registry —

- `thesis`: the deterministic composition (A2 history → A3 events → A4
  classify with rows-derived 20-day baselines → A5 thesis → A6 deltas →
  A7 change key) into an A1 artifact. Zero AI by construction (no model
  surface exists in the chain module — static pin).
- `insight`: the persistent insight — chain → change key → A7 cache
  hit parsed-or-served; miss on an A4-material chain → ONE generation
  through the EXISTING bounded loop (fixed server-composed instruction,
  canonical evidence package joined package-first with the chain's
  items via the ONE merge, grounding + claims + uncertainty from the
  router) → pure assembler → A1 parse-or-refuse → ONE A7 writer →
  serve; miss on a non-material chain → honest 404, zero AI spend, and
  the A4 gate runs BEFORE any cache read or spend control (pinned
  order).

Controls are reuses, never a second stack: the closed registry + the
ONE canonical symbol gate first (validation refusals cost zero rpc
traffic — pinned); a persistent per-IP burst guard (`intelligence:ip:*`,
30/60 s, the shared rate-limit family); the generation path passes the
EXISTING global spend reservation/settlement and consumes the SAME
persistent daily quota rpc the chat route consumes (one atomic counter),
refunding before the provider and settling to the reported usage after.
Materiality stays A4's EXCLUSIVE decision (direction 11): the route adds
no spend heuristic.

## Sequence (per PR)

- Branch `feat/int-a10-intelligence-api` from EXACT `origin/main =
  1c89af7` (0 open PRs; the prior session's local A10 branch was lost
  with a sandbox reset and rebuilt verbatim from the surviving
  pre-registration + RED test copies — no rework, a restoration).
- Commit 1 (docs-only pre-registration `7943966`): the contract, the
  fail-closed table, the generation gate, the no-second-path pins.
- Commit 2 (fail-first `bec5e7b`): RED capture — import-fail on
  `@/lib/intelligence/capabilities` (rule 21; output recorded).
- Commit 3 (implementation `d13b483`): `lib/intelligence/capabilities.ts`,
  `lib/intelligence/chain.ts`, `app/api/intelligence/route.ts`; 17
  chain pins + 7 route pins (registry, byte-determinism, honest
  unknown, A4 economic gate + ordering, material handoff, cache
  cycle, assembler refusals incl. the T52 invariant, single-caller
  scans, validation-first zero-rpc refusals, non-material 404 with no
  spend control, full generation path, refund-on-null, cache hit
  zero-spend).

## Gate bites (rule 24 — all recorded, all restored)

- A9's single-consumer pin bit on the second importer of the
  chat-context module (the intelligence route imported
  `mergeInsightEvidence`). Resolution: the helper moved VERBATIM to
  `lib/intelligence/evidenceMerge.ts` (its own home; zero behavior
  change; the A9 merge pins run unchanged against it; the chat route
  imports it from the new home). A9's single-consumer pin and
  no-second-endpoint pin pass unmodified.
- The single-caller scan exposed a THIRD pre-existing caller of
  `generateEvidenceGroundedAnswer`: the secret-gated
  `/api/probe/ai-loop` route (documented in GenerateArgs' probe-seed
  contract). The pin allows exactly the chat route, the intelligence
  route and that pre-existing verification surface — disclosed here
  and in the PR body (the ONE loop is unchanged; the probe is not a
  product synthesis path).
- C8 cadence bit the repair PR's CI twice (push at 28 min after #289;
  a premature job re-run at 10:21Z bit again) — honored; the final job
  re-run at window open (10:54:46Z) went ALL GREEN.

## Battery

tsc 0; eslint 0 errors / 283 ratchet holds; vitest 184 files / 2026
tests ALL PASSING (implementation), then 184 files / 2028 (repair, +2
production-shape pins); encoding clean; T12 registry gates passed;
scoreParity 0 mismatches; i18n 100%; build clean (`/api/intelligence`
registered in the route manifest); ISR PASS; bundle budget OK
(169.3 kB max vs 200 kB); aiLoopAudit 8/8; PROVENANCE regeneration
byte-identical. CI on both merge commits: all blocking checks success
(incl. live content smoke).

## Production legs (deployed SHA `08ed558c…` = main tip)

- **Independent change-key reproduction**: 403 live
  observation_state_log change ids read via the service key outside
  the app, the A7 rule applied in-script → `9831f19a4433…` — the
  deployed thesis artifact's `provenance.changeKey` EQUALS it
  (end-to-end substrate identity proven without trusting the app).
- Thesis positive control: 200 `{ok:true}`, `modelStatus:
  "deterministic"`, `synthesisPath: "deterministic"`, NO
  provider/model label, timings disclosed (route wall 1078 ms, chain
  869 ms; client wall 1619 ms).
- Refusal legs: invalid capability → 400 `Invalid capability`;
  unresolvable subject → 400 `Unknown symbol` (validation-first).
- Insight on the live chain: 404 `No generated insight for this
  subject` — the pre-registered production state (A4 fail-closed until
  20-day baselines accumulate, ~2026-11-03): ZERO AI spend, and the
  generation path is proven in CI with the real router + grounding
  seams (the honest 404 is the design, not an A10 gap).
- Cache-hit leg: written via the EXACT A7 path under the live chain
  key, then the deployed GET → the pinned A4-gate-first ordering
  refuses BEFORE the cache read on a non-material chain — the HIT path
  is therefore UNREACHABLE in production until a material chain exists
  (CI-proven through the real A7 reader/writer; liveVerify032 proved
  the rpc pair itself). Fixture removed; zero residue (read-back miss).
- UI positive control: `/evidence-fixtures` 200, noindex, fixture
  contradiction content present (A8 surface intact).
- A9 regression after the import split: a well-formed forged
  `insightRef` on `/api/chat` → 404 `Insight not available` (the A9
  refusal table's well-formed-missing row) — wiring intact, zero spend.

## Production-leg repair (#290, fail-first)

The first thesis leg returned 503 `Intelligence unavailable` — the
fail-closed design WORKING (never a bad artifact): PostgREST emits
`recorded_at` with a `+00:00` offset; the A1 contract's window fields
demand the `Z` form; the deterministic artifact refused and the chain
threw. CI fixtures used `Z` timestamps, so the shape difference never
bit locally — the production leg exists for exactly this class. Repair
(fail-first RED → GREEN): the chain normalizes ONLY its window fields
through the caller clock (an unparseable stamp degrades the window to
the caller clock; evidence `observedAt` stays verbatim per G4B).
Branch `feat/int-a10-prod-repair` from EXACT `2d5d683`; PR #290 merged
as `08ed558`; production legs re-run on the deployed fix: ALL PASS.

## Closeout

Phase A: A1–A10 CLOSED (10/10). The substrate contract is complete:
canonical observation → state → events → materiality → thesis →
deltas → change key + cache → evidence primitives → Ask Rishi → THE
ONE intelligence API. Next per the frozen sequence: B1 (per-symbol
news evidence) mounts the first real product surface on
`/api/intelligence`. Insight generation becomes triggerable in
production when A4's 20-day baselines accumulate (~2026-11-03); until
then every insight miss is the honest 404 with zero AI spend.
Open founder item: #267 health-semantics (untouched, isolated).
