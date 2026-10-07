# G1 — Account erasure: live CI Postgres proof + chat_usage fix

One item, one PR (founder round-23 G1). All commands run on 2026-10-07 UTC.

## Defect (found fail-first, on exact current main `25b71ee`)

Migration `015_anonymous_chat_quota.sql` dropped `chat_usage_user_id_fkey`
(required: anonymous quota identities are uuidv5 of the client IP, not auth
users). Consequence: the account-deletion cascade stopped covering
`chat_usage` — deleted accounts left quota rows behind, while
`lib/account/coverage.ts` still claimed `cascade-via-auth-users` and the
delete route's `cascaded` response still listed the table. The static test
passed vacuously: its regex matched 005's original CREATE clause anywhere in
the concatenated SQL and never modeled 015's `DROP CONSTRAINT`.

## Pre-fix RED — live erasure test on main (real Postgres)

Driver: `python3 /home/z/my-project/scripts/g1_erasure_driver.py /home/z/rishi/g1-main none`
(worktree of exact `origin/main` = `25b71ee`; embedded Postgres 18; applies
`pg_harness.sql` + migrations 001-027, then the new
`scripts/ci/account_erasure_invariants.sql`):

```
[driver] harness + 27 migrations applied (last: 027_alerts_v2.sql)
[driver] G1 erasure test FAILED:
G1 FAILED: chat_usage still holds 1 row(s) for the deleted account (015 dropped the FK; the 028 trigger sweep must erase it)
[driver] exit code: 1 (mode=none, repo=/home/z/rishi/g1-main)
```

Exit code 1. Every earlier section passed (seeding, positive controls,
unauthorized attempts, rollback atomicity) — the failure is exactly the
missing live deletion behavior for `chat_usage`.

## Pre-fix RED — strengthened static test on main

`npx vitest run test/account.delete.test.ts` in the main worktree (new test
against the old tree): `3 failed | 5 passed (8)`:

```
x every deletion claim is backed by a LIVE mechanism at the END of the migration chain (G1: models DROP CONSTRAINT)
  AssertionError: chat_usage claims cascade-via-auth-users but no FK ... ON DELETE CASCADE
  survives the whole chain (a 015-style DROP CONSTRAINT counts — the original
  CREATE clause is not the end state). ...
x chat_usage erasure is mechanically present (G1 explicit — the 015/028 defect class)
  AssertionError: expected 'cascade-via-auth-users' to be 'trigger-sweep-via-users'
x the live CI erasure test exists and is wired into the migrations job (G1)
  AssertionError: the migrations job must run the erasure test
```

## Root fix (smallest, schema-level, keeps anonymous identities)

`lib/db/migrations/028_chat_usage_erasure.sql` — `BEFORE DELETE` trigger on
`public.users` sweeps the account's `chat_usage` rows inside the same
transaction as the cascade. No auth-schema modification (Supabase owns that
surface); anonymous rows (no `public.users` row) untouched; fires on every
deletion path because it lives in the schema, not in application code.
Plus: `coverage.ts` deletion mode `trigger-sweep-via-users` for chat_usage,
route comment updated, static test rewritten to model the constraint and
trigger LIFECYCLE (adds and drops, positionally ordered within a file), CI
step added to the migrations job.

## Post-fix GREEN — live

```
[driver] harness + 28 migrations applied (last: 028_chat_usage_erasure.sql)
[driver] G1 erasure test PASSED in 15 ms
[driver] exit code: 0 (mode=none, repo=/home/z/rishi/rishi-terminal)
```

Re-confirmation after the bite-proof runs: `PASSED in 17 ms`, exit 0.

## Post-fix GREEN — static

`npx vitest run test/account.delete.test.ts` on the branch: `8 passed (8)`.

## Rule-24 bite proofs (each sabotage shown failing, then clean GREEN)

| sabotage | defect class reintroduced | result |
|---|---|---|
| `notrigger` (drop `users_erase_chat_usage`) | the pre-fix chat_usage orphan | exit 1 — `G1 FAILED: chat_usage still holds 1 row(s) for the deleted account` |
| `rogue` (new user_id table, no cascade, auto-seeded) | a future user-owned table escaping coverage (directive-4 invariant) | exit 1 — `G1 FAILED: user-data table g1_rogue_coverage_probe still holds 1 row(s) for the deleted account — erasure is incomplete` |
| `grant` (USAGE+SELECT+DELETE on auth.users to authenticated) | compromised erasure root | exit 1 — `G1 FAILED: an authenticated role DELETED an auth user — the erasure root is not closed` |
| none (clean) | — | exit 0 — `PASSED in 17 ms` |

Note on `grant`: a plain `GRANT DELETE` is not sufficient to make the
delete succeed (the WHERE reads `id`, which needs SELECT — probed
empirically: still 42501). The sabotage grants SELECT+DELETE, which is the
genuine fully-compromised scenario the assertion guards against.

## The test (scripts/ci/account_erasure_invariants.sql)

Creates a disposable auth user (handle_new_user creates the public.users
row), inserts one row into EVERY registry table (16) plus holdings
(transitively user-owned, labelled as such), then:

1. pre-deletion positive controls — every live `user_id` table holds >= 1
   seeded row (no vacuous pass; the swept table set is DERIVED from
   information_schema, no second hand-maintained list);
2. ugly: unauthorized deletion attempts — authenticated/anon on
   `auth.users` (must be denied), cross-user deletes through public tables
   (RLS must scope to 0 rows), victim intact afterwards;
3. ugly: rollback/failure — a sabotage trigger raises mid-cascade; the
   whole deletion rolls back (atomic, retry-safe, C3), all rows still
   present;
4. THE deletion — `DELETE FROM auth.users WHERE id = v_uid`, the SQL-level
   equivalent of the route's `service.auth.admin.deleteUser`;
5. zero rows remain — auth.users, public.users, chat_usage EXPLICITLY,
   holdings, then the dynamic sweep over every live user_id table;
6. ugly: missing row (0 rows affected), repeated delete (0 rows, still
   zero), cleanup.

## Full battery on the branch (before push)

```
npx tsc --noEmit                 -> exit 0
npx eslint .                     -> 0 errors, 284 warnings
npm run lint:ratchet             -> Baseline: 284 — Ratchet holds
npx vitest run                   -> Tests 1605 passed (1605)
npm run validate:encoding        -> passed — no mojibake detected
npm run validate:stocks          -> all T12 gates passed (916 symbols)
npm run score:parity             -> 0 mismatches / 0 non-finite of 916
npm run build                    -> success (route table printed)
git ls-files | grep -E "(^|/)\.env" -> .env.example only
```

## Reported observation (out of G1 scope, not fixed here)

`rate_limits` rows keyed `portfolio-import:<user uuid>` (from
`app/api/portfolio/import/route.ts`) survive account deletion — the table
has no user_id column, so it is outside the registry by the founder's
definition ("every public table with a user_id column"). The rows are
1-hour-window abuse-defense state, pruned after ~1 day by `hit_rate_limit`'s
lazy cleanup, and contain no profile data. Recorded for the founder; no
action taken in this PR.
