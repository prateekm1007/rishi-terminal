# B3 — database row caps (Round 15)

Evidence for the B3 PR. Fail-first and pass runs on the embedded Postgres
16 harness (the same engine the CI migrations job uses), 2026-10-04
22:46–22:48 UTC. Driver: `/home/z/my-project/pgtest/b3-caps-proof.mjs`
(persisted; applies `scripts/ci/pg_harness.sql` + migrations + the CI
RLS invariants).

## 1. Fail-first (rules 21/24) — the invariants WITHOUT the cap migration

Migrations 001–025 applied, then the CI invariants carrying the new B3
blocks:

```text
$ node b3-caps-proof.mjs --until 025
[1] harness + migrations 001..025
    applied 25 migrations (last: 025_portfolio_import.sql)
[2] RLS invariants (with B3 blocks)
    invariants: FAILED — B3.1 FAILED: the 51st screen insert as authenticated was ACCEPTED
    EXPECTED (fail-first): a B3 block caught the missing cap
DRIVER VERDICT: OK
```

This is the founder's acceptance condition failing on the pre-fix state:
the 51st screen insert as `authenticated` was accepted (the audit's
2,000-screen bulk insert, reproduced).

## 2. The fix — migration 026 (lib/db/migrations/026_user_row_caps.sql)

BEFORE INSERT row triggers that count the owner's rows and RAISE
`check_violation` (23514) at the limit:

- `screens` — at most 50 per user. Upsert nuance: saving an EXISTING
  name at the cap still works (that is an UPDATE at the application
  layer — the same-name EXISTS check lets it through; plain duplicate
  names are still rejected by the UNIQUE constraint).
- `portfolio_imports` — at most 20 per user.
- `portfolio_positions` — at most 500 per import (a 600-row single
  INSERT trips at row 501: rows inserted earlier in the same statement
  are visible to later BEFORE-trigger firings).

Concurrency: `pg_advisory_xact_lock` keyed on the owner (or import)
serializes same-owner inserts, so two parallel writers cannot both pass
a count of N−1. RLS note: the count runs under the calling role — via
the anon-key/authenticated path RLS scopes visible rows to
`auth.uid() = user_id` and the WHERE clause is explicit on the owner, so
the count is correct for every role.

Route mappings (clean 4xx instead of a raw 500): screens save → 409
("delete one first"); import insert → 409 (20-import limit); positions
insert → 413 (route pre-checks 500, the trigger is the
direct-to-database backstop).

## 3. Pass run — the invariants WITH the cap migration

```text
$ node b3-caps-proof.mjs --until 026
[1] harness + migrations 001..026
    applied 26 migrations (last: 026_user_row_caps.sql)
[2] RLS invariants (with B3 blocks)
    invariants: PASS
DRIVER VERDICT: OK
```

All prior invariant blocks (X3-05, X3-07, Q1, …) still pass with 026 in
the chain — the triggers do not over-restrict. The B3 blocks prove, as
`authenticated`:

- 50 screens land, the 51st is rejected (check_violation);
- a same-name save at the cap still updates (1 row);
- user B's insert is unaffected by user A hitting the cap (per-user
  scoping);
- 20 imports land, the 21st is rejected;
- 500 positions in one statement land, the 501st is rejected.

## 4. Tier-1 gates

```text
$ npx tsc --noEmit            -> exit 0
$ npx eslint app/api/screens/route.ts app/api/portfolio/import/route.ts
                               -> 0 errors
$ npx vitest run test/portfolio.importValidation.test.ts test/portfolio.import.test.ts test/rls.portfolio.test.ts
      Tests  28 passed (28)
```

## 5. Flagged follow-up (not silently done — outside B3's scope)

There is no user-facing route to DELETE a portfolio import yet (RLS
grants the delete, but no endpoint exercises it). With the 20-import cap
the only recovery for a maxed-out account is support/DBA. Recommend a
small `DELETE /api/portfolio/import/[id]` route in the next round; the
founder's B6 live verification will show whether it is needed for the
demo account.
