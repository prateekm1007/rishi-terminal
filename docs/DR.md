# Database rollback runbook (E6-09)

The migration chain (`lib/db/migrations/001…N`) is **up-only**: no down
scripts exist, by design — a down-migration that un-does a schema change
can silently destroy data (dropping a column added by a bad migration
also drops whatever was written to it). The rollback story for this repo
is **restore-from-backup, then fix forward**, and the procedure is
drilled and timed (`scripts/drill/rollbackDrill.mjs`, evidence in
`docs/evidence/round15/b7-e6-09-rollback-drill.md`).

## When a migration breaks

1. **Detect.** CI applies every migration to a fresh Postgres 16 on each
   PR (the `Migrations & RLS invariants` job) — a migration that fails to
   apply, or breaks an invariant, is caught BEFORE production. If one
   slips past CI (data-dependent failure), production's canary is the
   post-deploy smoke and `/api/health`.
2. **Stop the bleeding.** Do not deploy further; if the bad migration is
   already deployed and the failure is data-destroying, point production
   at the previous deployment (Vercel rollback promotion) while the
   database is restored.
3. **Restore.** Restore the pre-migration backup (taken immediately
   before every migration batch — see "Backup policy" below). On
   Supabase: the daily backup + PITR (point-in-time recovery to the
   timestamp before the migration ran).
4. **Fix forward.** Correct the migration in a PR, re-apply the chain.
   Never edit an applied migration in place for a silently-divergent
   schema — the fix lands as a new migration or an amended PR before
   first application.

## Backup policy

- **Before every production migration batch**: PITR timestamp noted in
  the PR (the deploy comment records it), so recovery targets are
  explicit.
- The drill below measures the procedure on an empty harness database;
  production timings scale with data volume — re-run on staging when the
  staging project is re-enabled and record the numbers here.

## The drill

```bash
# pg + embedded-postgres are NOT repo dependencies — they live in a
# harness checkout. Point the driver at one:
node scripts/drill/rollbackDrill.mjs --harness /path/to/pgtest
```

What it proves, in order:

1. a pre-migration snapshot can be taken cheaply (template copy on the
   harness; pg_dump/PITR in production);
2. the full chain 001…N applies to a fresh database in order;
3. a failing migration batch is DETECTED and leaves **no partial state**
   (statement-batch atomicity — a mid-file failure does not commit the
   earlier statements);
4. restore-from-snapshot recovers the pre-migration state;
5. the chain re-applies cleanly after the fix (fix-forward).

Timings from the Round-15 drill (harness, empty database — production
numbers TBD when staging is re-enabled): snapshot 0.0 s, apply 25
migrations 0.1 s, restore 0.1 s, re-apply 0.1 s, total 0.8 s.
