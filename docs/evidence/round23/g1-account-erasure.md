# G1 — Account erasure: live CI proof, collision record, static lifecycle gate

One item, one PR (founder round-23 G1). All commands run on 2026-10-07 UTC.

## Round-23 collision record (C7/B-23 — full mapping on PR #230)

Two sessions independently built G1 in parallel. Both found the SAME root
cause fail-first on exact main `25b71ee` — convergent validation:

- **PR #229 (parallel session, MERGED as 897ec4a)**: live CI erasure test
  (`scripts/ci/account_deletion_invariants.sql`) + migration
  `028_chat_usage_erase.sql` (SECURITY DEFINER purge trigger on
  `auth.users` — production-correct: GoTrue deletes as
  `supabase_auth_admin`, which holds no public grants) + wiring pin.
  Verified live on production after merge: trigger `chat_usage_erase_on_user_delete`
  enabled on auth.users, function `purge_chat_usage_on_user_delete`
  SECURITY DEFINER, `chat_usage` FK list empty (015's drop confirmed).
- **PR #230 (this session, CLOSED with mapping note)**: equivalent live
  test + a `public.users` trigger variant. #229's placement is the
  production-safer one; #230 closed, nothing lost — the unique pieces
  below land in this follow-up.

## What this follow-up adds (the gaps left on main after #229)

1. **The static cascade test still passed vacuously**: it matched a
   `REFERENCES ... ON DELETE CASCADE` clause anywhere in the concatenated
   migration SQL, so 015's `ALTER TABLE chat_usage DROP CONSTRAINT
   chat_usage_user_id_fkey` was invisible. The live test caught the
   defect; the static half could not. Rewritten with a lifecycle model
   (adds AND drops, positionally ordered within a file — 002's
   drop-and-readd of `users_id_fkey` and 028's idempotency drop both
   parse correctly).
2. **The registry claim was textually false**: coverage.ts kept
   `deletion: 'cascade-via-auth-users'` for chat_usage while the live FK
   list is empty. Now `trigger-sweep-via-users` (rule 2 — names describe
   behavior).
3. **The delete-route comment** still said "every covered table cascades
   (FK ...)" — updated to describe both mechanisms.
4. **The erasure root was not in the unauthorized ugly path**: the live
   test proved an authenticated session cannot delete other users' rows
   (RLS), but not that it cannot delete `auth.users` AT ALL. New section
   5b (G1-ROOT) asserts the denial for both `authenticated` and `anon`.

## Fail-first (this follow-up, on top of 897ec4a)

`git stash push -- lib/account/coverage.ts` (new tests, main's claim):

```
x every deletion claim is backed by a LIVE mechanism at the END of the migration chain (G1: models DROP CONSTRAINT)
  AssertionError: chat_usage claims cascade-via-auth-users but no FK ... ON DELETE CASCADE
  survives the whole chain (a 015-style DROP CONSTRAINT counts — the original
  CREATE clause is not the end state). ...
x chat_usage erasure is mechanically present (G1 explicit — the 015/028 defect class)
  AssertionError: expected 'cascade-via-auth-users' to be 'trigger-sweep-via-users'
x the LIVE CI Postgres erasure invariant is wired into CI and exercises every registry table (G1)
      Tests  3 failed | 5 passed (8)
```

`git stash pop` + the coverage.ts fix: `8 passed (8)`.

## Live proof (statement-at-a-time driver, embedded Postgres 18)

Driver: `python3 /home/z/my-project/scripts/g1_followup_driver.py <repo> <mode>`
(applies pg_harness + migrations 001-028, then the merged live test with
the new G1-ROOT section; dollar-quote-aware statement splitting — the
file's BEGIN/ROLLBACK pairs rely on psql semantics):

```
clean    -> [driver] final: account_deletion_invariants: PASSED — auth-user erase
            leaves zero rows in every registry table (chat_usage explicit),
            holdings transitive, all ugly paths honest
            [driver] live erasure test PASSED — 52 statements OK   (exit 0)
notrigger-> ERASE FAILED: table chat_usage still holds 1 row(s) of the deleted user (exit 1)
grant    -> G1-ROOT FAILED: an authenticated role could DELETE from auth.users —
            the erasure root is not closed                              (exit 1)
```

- `notrigger` drops #229's purge trigger — the merged live gate bites on
  its own.
- `grant` gives authenticated `USAGE+SELECT+DELETE` on auth.users — the
  NEW G1-ROOT section bites. (Probe note: plain `GRANT DELETE` is not
  enough to open the root — the WHERE reads `id`, which needs SELECT,
  and the delete still denies with 42501. The sabotage grants both,
  the genuine fully-compromised scenario.)

## Full battery on the branch (before push)

```
npx tsc --noEmit                 -> exit 0
npx eslint .                     -> 0 errors (284 warnings)
npm run lint:ratchet             -> Baseline: 284 — Ratchet holds
npx vitest run                   -> Test Files 159 passed (159); Tests 1605 passed (1605)
npm run validate:encoding        -> passed — no mojibake detected
npm run validate:stocks          -> all T12 gates passed (916 symbols)
npm run score:parity             -> 0 mismatches / 0 non-finite of 916
npm run build                    -> Compiled successfully (exit 0)
provenanceAudit + git diff       -> clean (snapshot date regenerated post-commit)
```

## Carried observation (out of G1 scope, reported on #230, unfixed)

`rate_limits` rows keyed `portfolio-import:<user uuid>` (from
`app/api/portfolio/import/route.ts`) survive account deletion — no
user_id column, outside the registry by the founder's definition.
Ephemeral <=1-day abuse-defense state, pruned by `hit_rate_limit`'s
lazy cleanup, no profile data. Founder's call whether to sweep it.
