# INT-A6 ChangeSince — closeout (round 31)

Roadmap item A6 (`docs/INTELLIGENCE_ROADMAP.md`: "ChangeSince
(deterministic deltas)"). PR #276, head
`8053a76a1dd563e59f659d6ae0b01d3ab1640849`, merged as
`5afa7b882f8ca7d857127f4ee00e713bf08f19ae` (2026-10-08).

Implementation: `lib/intelligence/changeSince.ts` (pure deterministic
deltas over A2 rows). Pre-registration: `docs/intelligence/changeSince.md`
(committed BEFORE any evaluation — first commit on the branch). Tests:
`test/intelligenceChangeSince.test.ts` (19).

## 1. Duplicate search and sequence

No A6 branch or PR existed at claim time (roadmap rule: one item, one
PR). Branch `feat/int-a6-changesince` from exact `origin/main`
`2c06a91b65bb27947c01678fd88f34b59ec5b624` (post-A5-closeout). The
pre-registration doc was pushed first as the claim.

## 2. RED — fail-first before the module existed (rule 21)

```
$ npx vitest run test/intelligenceChangeSince.test.ts   (pre-module tree)
 Test Files  1 failed (1)
      Tests  no tests
RED_EXIT:1
```

Import failure — the A3/A4/A5 precedent for a new contract module.

## 3. GREEN + gate-bites (rules 21/24)

```
$ npx vitest run test/intelligenceChangeSince.test.ts   (module landed)
      Tests  19 passed (19)
```

Gate bites (first-hand, scratch, restored): boundary mutation in
`computeChangeSince` (`recordedAt <= since` → `< since`, which would
move the exactly-at-cutoff row from baseline into the window):

```
 Test Files  1 failed (1)
      Tests  6 failed | 13 passed (19)
```

Restore: `Tests 19 passed (19)`; scratch comment count 0.

## 4. Full battery on the branch head

```
npx vitest run (changeSince + thesis + materiality + events + stateLog)
  -> 5 files, 110/110 pass
npx tsc --noEmit          -> exit 0
npx eslint (changed files)-> exit 0, 0 problems
npx eslint .              -> 283 problems (0 errors, 283 warnings) = ratchet baseline
npm run validate:encoding -> pass, no mojibake
```

## 5. CI + cadence (C8 honored, gate bit twice)

First CI run (37841950626) blocked by the C8 cadence gate — last
production-relevant merge (#273, A5 code) was 27.7 min old:

```
deploy-cadence: FAIL — last production-relevant merge landed 27.7 min
ago — earliest safe merge 2026-10-08T21:18:55.000Z
```

Rerun after the window — all six checks green:

```
Lint, typecheck, test, validate                     pass  2m53s
Migrations & RLS invariants (Postgres 16)           pass  38s
Docker Space image (E1)                             pass  1m35s
Lighthouse gate (U3)                                pass  2m44s
Playwright smoke                                    pass  2m37s
Vercel Preview Comments                            pass  0
```

(#275, the A5 docs closeout, was deploy-exempt and cadence-exempt —
correctly not counted by the gate's production-relevance diff.)

## 6. Merge and production verification

merge-guard gates 0–6 (sanctioned path, `GITHUB_PAT` env):

```
[gate 0] GET /pulls/276 -> HTTP 200; mergeable_state=clean
[gate 1] origin/main tip (read #1) = 2c06a91b65bb27947c01678fd88f34b59ec5b624
[gate 2] merge-base == main tip — branch is current with main
[gate 3] check-runs on 8053a76a1dd5: all six completed/success
[gate 4] deployCadence.mjs --pr -> exit 0
[gate 5] origin/main tip (read #2, pre-merge) = 2c06a91b65bb27947c01678fd88f34b59ec5b624
[gate 6] PUT /pulls/276/merge (sha=8053a76a1dd5) -> HTTP 200
[gate 6] {"sha": "5afa7b882f8ca7d857127f4ee00e713bf08f19ae", "merged": true}
MERGE-GUARD: MERGED PR #276 (head 8053a76a1dd5) -> merge commit 5afa7b882f8c
```

Production (2026-10-08 ~21:40Z):

```
GET /api/version  -> sha = 5afa7b882f8ca7d857127f4ee00e713bf08f19ae  (matches merge)
GET /api/health   -> {"status":"ok",...}
post-deploy-smoke on 5afa7b882f8c -> completed success
```

## 7. Closeout

Roadmap A6 row BLOCKED→CLOSED (this docs-only PR). Honest scope note
(A3/A4/A5 precedent): a pure substrate module with no runtime consumer
by design — composition with A2's readers arrives at A10 — so the
production proof is the deployment-identity tuple plus the real
execution of the 19-test battery. No production number is claimed
beyond what is pasted.

Next roadmap item: INT-A7 (Insight cache / deterministic change key),
from exact main `5afa7b882f8ca7d857127f4ee00e713bf08f19ae`.


## Amendment (2026-10-09, round 31 — substrate completion, PR #279)

Stated plainly: PRs #276/#277 raced this work. #276 merged from head
`8053a76` minutes before the substrate commits reached the same branch
(the push was fast-forwarded after the merge head locked), and #277
closed the roadmap row on a delta-engine-only scope. The founder's A6
direction (2026-10-09, verbatim) is: "A6 ChangeSince (includes the
user_visit_state migration + coverage-registry registration)". The
substrate was not in main. PR #279 completes exactly that scope.

What landed in #279 (rebased onto exact `8e3cb09`):

- Pre-registration appended to `docs/intelligence/changeSince.md`
  ("Substrate pre-registration: user_visit_state") BEFORE the migration
  or its tests (commit `d8fdd8d`).
- Fail-first `test/intelligenceVisitState.test.ts` — RED observed 8/8
  failing on the pre-implementation tree (commit `c6eba1a`): registry
  entry absent, migration absent, CI wiring absent.
- Implementation (commit `364af29`): `lib/db/migrations/031_user_visit_state.sql`
  (screens-class RLS, UNIQUE (user_id, symbol) upsert cursor, inline
  `REFERENCES users(id) ON DELETE CASCADE`), `lib/account/coverage.ts`
  registry entry (`cascade-via-users`), `rls_invariants.sql`
  L5_02_EXPECTED + X3-05b behavioral block, `account_deletion_invariants.sql`
  fixture row.

Gate bite (rule 24, first-hand, restored): the cascade clause mutation
(`REFERENCES users(id) ON DELETE CASCADE` → no CASCADE) failed BOTH the
G1 end-state parser (`every deletion claim is backed by a LIVE
mechanism`) and the A6 schema pin:

```
 Test Files  1 failed (2)
      Tests  2 failed | 14 passed (16)
```

Restore: `Tests 16 passed (16)`.

Full battery on `364af29`: tsc 0; eslint 0 errors, ratchet 283 holds;
vitest **178 files / 1932 tests ALL PASSING** (1919 + 8 substrate + 5
from the #272-era counts); encoding green. CI applies 031 in the
Postgres-16 harness and runs the live L5-02 registry-equality, the
X3-05b owner/other-user/anon behavior, and the G1 erasure sweep.

Merge SHA, CI run, production apply (G1 sanctioned migration-apply path,
pre-apply PITR timestamp per DR.md), and read-only production
verification are appended in the final closeout docs update after #279
merges — this file's section 6/7 numbers remain valid for the delta
engine exactly as written.
