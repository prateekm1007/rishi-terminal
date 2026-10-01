# RELEASE — environments & promotion flow (P0-03)

## Environments

| | Development | Staging | Production |
|---|---|---|---|
| Supabase project | local / any scratch | **none** — `BLOCKED: staging Supabase project` (founder dashboard task; see status below) | `mwkreqcbgpjqcpctwllf` |
| Vercel | `vercel dev` | `rishi-terminal-staging` project + per-PR previews, both behind Deployment Protection | `rishi-terminal.vercel.app` |
| Payments | none | none until Razorpay staging keys exist | live Razorpay keys |
| Cron | not fired | not fired | `/api/ingest/snapshot` 13:30 UTC Mon–Fri |
| Purpose | iterate freely, seed data is fine | integration + auth testing, no real users, **no database until the staging Supabase project exists** | real users, real data |

Rules that hold across all environments:

1. **Migrations are append-only.** New schema lands as `lib/db/migrations/NNN_*.sql`
   and is never edited after it has been applied to any shared database
   (corrections go in a new numbered migration; drift is reconciled like P0-02).
2. **Never sign up on production** except the founder's own real-inbox test —
   the bounce incident (2026-09) came from exactly that. Scratch/staging work
   happens on the candidate project.
3. **Secrets live only in the environment**, never in the repo, chat, or logs.
   `scripts/checkEnv.ts` checks names only, by design.
4. **No role can TRUNCATE a public table** (audit round 4, Q1 — migration
   013). Row-level triggers do not fire on TRUNCATE and RLS never applies to
   it, so append-only tables (`rishi_snapshots`, …) are guarded by
   `REVOKE TRUNCATE` for anon/authenticated/service_role plus a
   `BEFORE TRUNCATE` statement trigger that raises for any remaining holder
   of the privilege (e.g. the table owner). Residual, documented honestly:
   the table owner and superusers can still disable triggers (e.g.
   `SET session_replication_role = replica`); PITR backups are the backstop
   for that path, and the restore drill is part of L5-05. The CI invariants
   (`scripts/ci/rls_invariants.sql`, checks Q1.1/Q1.2) fail the build if any
   public table becomes TRUNCATE-able again.

## Promotion: dev → staging → production

### 1. dev → staging (PR preview)

- Open a PR; Vercel builds a preview deployment (behind Deployment
  Protection — unreviewed code is never publicly reachable).
- **Previews and the staging project carry NO Supabase variables** until a
  staging Supabase project exists (audit round 4, Q2). While staging runs
  database-less, `/api/health` reports `down`; that is the sanctioned state,
  not a defect to work around.
- Gate before promoting the branch:
  ```bash
  npx tsx scripts/checkEnv.ts --env=staging --assert-distinct-project   # → exit 0 (never the production DB project)
  npm run lint:ratchet && npx vitest run      # → pass
  ```

### 2. staging → production (merge to main)

- Merge the PR (one task per PR, `feat(<ID>):` / `fix(<ID>):`).
- Schema first, code second — always in that order, so new code never runs
  against a missing table:
  1. Apply any new migrations to the **production** Supabase project
     (Dashboard SQL editor with the migration file, or Management API).
  2. Verify: `npx tsx scripts/pipelineStatus.ts` shows no TABLE-MISSING.
  3. Promote the Vercel deployment (prod env points at the production
     project).
- Post-deploy check:
  ```bash
  curl -s https://rishi-terminal.vercel.app/api/health | jq .
  ```

### Rollback

- **Code:** Vercel instant rollback to the previous deployment.
- **Schema:** migrations are append-only and additive; rollbacks do not
  revert DDL. A schema bug is fixed forward with a new migration.

## Environment variables

Canonical list: `.env.example` (the template `scripts/checkEnv.ts` checks
against). The required-per-environment matrix lives in that script and is
PROPOSED until the founder confirms it (E6-09 / FD-7).

## Status of this document (updated 2026-10-01, audit round 4 / Q2)

- **Deployment Protection re-enabled on staging** (audit round 4, Q2.1).
  `rishi-terminal-staging` (`prj_7B1N3qceJOAh5jVAI32RhF84Zygm`) now has
  Vercel Authentication set to **all deployments**. Verified live:
  `curl -sI https://rishi-terminal-staging.vercel.app/api/health | head -1`
  → `HTTP/2 302` ("Protected by Vercel Authentication"), was `HTTP/2 200`
  before the fix. Preview deployments of `rishi-terminal` were verified
  protected as well (302 on a live preview URL).
- **Production Supabase variables removed from staging and previews**
  (Q2.2). `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` were deleted from the staging project's
  environment and from the preview target of `rishi-terminal` (production
  target untouched). Until the founder creates a staging Supabase project,
  staging runs database-less: `/api/health` reports `down` there, which is
  the sanctioned state per this document's promotion gate.
- **Production drills stopped** (Q2.3). Payment and ingest drills are no
  longer run against production, with or without cleanup. They stay stopped
  until a staging Supabase project exists.
  `BLOCKED: staging Supabase project` — creating one needs the dashboard
  (the Management PAT returns 403 on project creation, Hobby plan). The
  founder checklist carries the task.
- **`scripts/checkEnv.ts --assert-distinct-project`** (Q2.5) exits 1 when
  the target environment's Supabase host equals production's, and 0 when a
  distinct host — or no host at all — is wired. It was verified to fail
  against the pre-fix staging environment (which held the production URL)
  before the variables were removed.
- Earlier revision of this status block (round 3) claimed "Vercel staging
  project: provisioned and linked … `/api/health` 200 db:true" — that
  `200 db:true` was exactly the defect: staging was publicly reachable AND
  wired to the production database. Corrected here rather than deleted so
  the incident is greppable (Constitution art. 1).
- **Staging Supabase project: does NOT exist.** Verified against the
  Supabase Management API on 2026-10-01: exactly ONE project exists (the
  production project, `mwkreqcbgpjqcpctwllf`). The environments table above
  previously listed `opnfelgxklfvurzozhms` as staging — that project has
  never existed in this account; the table was wrong and is fixed above
  (Constitution art. 1).
