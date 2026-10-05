# B7 / E6-09 — migrations-in-CI + rollback drill (Round 15)

Roadmap acceptance, verbatim: "migrations apply to a fresh database in CI
in order (`001…N`); a rollback drill on staging is documented with
timings."

## 1. Migrations in CI (already standing, restated)

The `Migrations & RLS invariants (Postgres 16)` job applies
`scripts/ci/pg_harness.sql`, then every `lib/db/migrations/*.sql` in
sorted order, to a fresh Postgres 16 service on every PR — verified
green on this round's PRs (#163–#172) and reproduced by the founder on
their own harness (Round-15 audit, "Postgres 16, CI sequence reproduced
exactly on a clean database").

## 2. The rollback drill — on the harness, with the staging caveat

`BLOCKED on staging specifically: the staging project is suspended`
(quota; `docs/RELEASE.md` Deployment budget #3 — Z1). The drill was run
on the embedded Postgres 16 harness instead — the procedure and its
control points are identical; production timings scale with data volume
and should be re-recorded on staging when it is re-enabled (noted in
`docs/DR.md`).

Driver: `scripts/drill/rollbackDrill.mjs --harness <pgtest checkout>`
(pg + embedded-postgres resolve from the harness, not the repo).

Raw output (2026-10-05 00:09 UTC):

```text
[1] pre-migration snapshot (template copy): 0.0s
[2] applied 25 migrations: 0.1s
[3] bad migration DETECTED: division by zero
[4] restore (drop + recreate + harness): 0.1s
[5] re-applied 25 migrations (fix-forward): 0.1s
── E6-09 drill verdict: PASS (detect, no-leak, restore, fix-forward)
 "total": "0.9s",
 "snapshot": "0.0s",
 "apply": "0.1s",
 "restore": "0.1s",
 "reapply": "0.1s"
```

Phase [3] also proves **no partial state** survives a failed statement
batch (`SELECT to_regclass('public.drill_leak_probe')` is NULL after the
failure) — a mid-file migration failure does not commit its earlier
statements.

## 3. The runbook

`docs/DR.md` (new): detection paths, stop-the-bleeding (Vercel promotion
rollback), restore (PITR timestamp recorded per migration batch),
fix-forward policy (never edit an applied migration), backup policy, and
the drill's documented invocation + timings.
