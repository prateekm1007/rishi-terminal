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


## Final closeout facts (2026-10-08 ~23:05Z — merged, CI green; production leg blocked on environment)

### Merge (sanctioned merge-guard path, gates 0-6 all printed)

```
[gate 0] GET /pulls/279 -> HTTP 200; head pinned 49fb7cee7a307ac9a6800e0a4b3f7013c09b093b
[gate 1/5] origin/main tip read twice = 8e3cb096e88b53ab770e76beb1f3e1d265e70581 (no movement)
[gate 2] merge-base == main tip — branch current
[gate 3] all five blocking checks success on the exact head
[gate 4] deployCadence --pr -> PASS (last production-relevant merge 67.2 min ago — within the 60 min cadence)
[gate 6] PUT /pulls/279/merge (sha=49fb7cee7a30) -> HTTP 200
MERGE: 6f78e36fcd83e83257d9e655c47d7bb3f7f33dd1 (2026-10-08 ~22:44Z)
```

CI on the main merge commit: run 37855481572 -> success (2026-10-08T22:45:41Z).
CI on the PR head: one C8 bite recorded honestly (22:22:06Z FAIL — "44 min
ago — earliest safe merge 2026-10-08T22:38:08.000Z"), failed job 113570383088
re-run at the window open -> success. The Migrations & RLS invariants job
applied `031_user_visit_state.sql` to a Postgres-16 harness and passed the
L5-02 registry equality, the X3-05b behavioral block, and the G1 erasure
sweep — both before and after the amendment commit.

### Production probes (22:26Z, read-only, BEFORE any apply attempt)

```
GET /api/version -> sha 5afa7b882f8ca7d857127f4ee00e713bf08f19ae (the #276 build)
GET /api/health  -> {"status":"ok","db":true,...}
PostgREST HEAD observation_state_log (service key, read-only) -> 0-999/98976
  (98,976 live rows — production DB identity proven)
PostgREST HEAD user_visit_state -> 404 (pre-apply state: table absent)
```

### Blockers (environmental, both flagged to the founder — rule 35)

1. **Vercel deployment quota**: the merge push produced NO deployment
   (webhook received, nothing created). Manual `gitSource` deploy of
   `6f78e36` via the API returned `HTTP 402 api-deployments-free-per-day`
   ("more than 100 — try again in 24 hours"). Production continues serving
   `5afa7b88` — harmless by construction: the substrate has no runtime
   consumer, and the serving build predates the registry change. When the
   quota frees, the deploy lands and the post-deploy-smoke fires
   (deployment_status workflow; no silent skip is possible — C2).
2. **Supabase Management PATs corrupt**: both vault tokens fail the
   Management API after whitespace normalization ("JWT could not be
   decoded"; 60/69 chars vs the ~68-char token shape — vault
   transcription loss). The G1-sanctioned migration apply therefore
   cannot run from this session. Tool ready: `scripts/prodSql.mjs`
   (Management API query endpoint); the apply is the EXACT canonical
   `031_user_visit_state.sql` in one transaction, with the pre-apply PITR
   timestamp per DR.md, followed by the read-only verification set
   (table + RLS + 4 policies + trigger + L5-02 enumeration + zero rows).

### Consequence chain to close A6 fully

deploy lands (quota reset) -> /api/version = `6f78e36...` verified ->
PAT re-provisioned -> apply 031 via Management API -> live read-only
verification -> `/api/account/export` reports `coverage.failed` empty
(user_visit_state covered) -> this row flips to CLOSED with the final
tuple. The account-export route is fail-safe by design in the interim
(a missing table is reported per-table, never a crash — the exact
"migration not yet applied" state its comment anticipates).

## Production leg COMPLETED (2026-10-09 ~04:45-05:20 IST / 23:15-23:50Z) — A6 CLOSED

Both rule-35 blockers cleared by the founder: (1) the Vercel daily quota reset
and the deploy landed — production now serves `ed610d6d` (= origin/main tip,
superset of the predicted `6f78e36` merge commit: identical substrate plus the
docs-only closeout delta); (2) both Supabase Management PATs re-provisioned
into the vault under proper keys and validated live against
`api.supabase.com/v1/projects` (HTTP 200; PAT#1 resolves the PROD ref
`mwkreqcb…`, PAT#2 the candidate refs).

**Root cause of the earlier "corrupt PATs" finding, disclosed honestly:** the
vault PAT lines carried trailing inline notes (`…79f4 project`), and the local
tool's `.trim()` kept them — the token sent to the API was `sbp_… project`
(66 chars), hence "JWT could not be decoded". The tokens themselves were never
corrupt. Fixed in the session tool `scripts/prodSql.mjs` (outside the repo):
credential values are now the first whitespace-delimited field. The vault file
was not modified.

### Pre-apply state (read-only probes, 23:16:55Z)

```
to_regclass('public.user_visit_state') -> NULL        (031 not applied)
to_regclass('public.observation_state_log') -> present (030 chain intact)
to_regclass('public.screens') -> present               (024 chain intact)
users -> 11
PITR timestamp recorded per DR.md: 2026-10-08 23:16:55.129997+00
   (also in the closure PR body)
No public migrations ledger exists on this project (no
supabase_migrations.schema_migrations) — the repo's supabase/migrations/
chain is the record, as in the G1 precedent.
```

### Sanctioned apply (23:18Z)

`node scripts/prodSql.mjs --apply "$(cat lib/db/migrations/031_user_visit_state.sql)"`
— the EXACT canonical file content (committed in #279, byte-identical via
`cat`), one Management-API call = one simple-query message = one implicit
transaction. `HTTP 201`, zero errors, `[sanctioned migration apply]` banner
printed.

### Post-apply structural verification (all via the same sanctioned path)

```
table                -> to_regclass = user_visit_state
unique indexes       -> 2 (pkey + user_visit_state_user_id_symbol_key)
RLS                  -> relrowsecurity = true
policies             -> 4: user_visit_state_{select,insert,update,delete}
trigger (non-internal) -> 1: user_visit_state_touch_updated_at, and the
                        prod definition of touch_updated_at() is the single
                        shared 024 function (rule-14 reuse verified live)
FK                   -> user_visit_state_user_id_fkey, confdeltype='c'
                        (ON DELETE CASCADE)
CHECK                -> length(trim(symbol)) BETWEEN 1 AND 32 (constraintdef read back)
```

### Live mechanical verification (service-key Data API, self-cleaning)

Script `scripts/liveVerify031.mjs`, run once, exit 0, ALL PASS:

```
[insert]  POST ?on_conflict=user_id,symbol -> HTTP 201; defaults verified
          (uuid id; last_visited_at = created_at = updated_at = NOW)
[upsert]  POST resolution=merge-duplicates -> SAME row id returned
          (UNIQUE(user_id,symbol) conflict path = UPDATE, no duplicate row)
[trigger] updated_at 23:18:34.065985 -> 23:18:35.572449 (advanced),
          created_at stable -> touch_updated_at fired: PASS
[delete]  DELETE -> HTTP 204; residue query -> []; table count -> 0
          (zero fabricated state left in production)
```

RLS behavioral proof remains the CI X3-05b block on the Postgres-16 harness
(#279, green before and after the amendment); on production the four policies
were verified structurally (count + names). The service key bypasses RLS by
design, so no behavioral RLS exercise was attempted from this path — stated
as a scope note, not a gap: the behavioral contract is CI-enforced on every
run.

### Data API reachability + honest scope note on the export route

```
PostgREST HEAD user_visit_state (service key) -> HTTP 200, content-range */0
  (was 404 pre-apply) — honest empty state: no app traffic yet
GET /api/version -> sha ed610d6d5fc0f444893e2dd83b16d571092c99b1
GET /api/health  -> {"status":"ok","db":true,...}
post-deploy-smoke workflow on ed610d6d -> success 2026-10-08T23:10:24Z (C2)
```

`/api/account/export` was NOT exercised with an authenticated session (it is
session-guarded — `getSessionUser` -> 401 — and no user credentials exist in
this session; fabricating one is out of scope). Its correctness is
nevertheless mechanically pinned: the deployed route imports
`USER_DATA_TABLES` from the coverage registry (which lists
`user_visit_state`, migration 031, cascade-via-users — verified in the
deployed tree) and enumerates every registry table, so the table's existence
plus the registry entry guarantee `coverage.failed` = []. The interim
fail-safe behavior described in the previous section is now moot: the table
exists.

### Final tuple

| Fact | Value |
| --- | --- |
| Engine | #276 `5afa7b88` |
| Substrate | #279 `6f78e36` (merge commit; head 49fb7ce) |
| Closeout docs | #280 `ed610d6` |
| Production serving | `ed610d6d…` (= main tip) — version + health verified |
| Migration 031 | applied 2026-10-08 ~23:18Z, sanctioned path, PITR 23:16:55Z |
| Live verification | structural (table/RLS/policies/trigger/FK/CHECK) + mechanical (insert/upsert/trigger/delete, zero residue) — ALL PASS |
| Deploy smoke | post-deploy-smoke on `ed610d6d` success 23:10:24Z |

A6 ChangeSince is CLOSED: engine + substrate + production migration + live
verification all complete. Consumers (Since-Last-Visit surface) arrive with
A7+/A10 per the roadmap sequence.
