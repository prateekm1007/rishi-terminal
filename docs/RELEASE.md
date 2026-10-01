# RELEASE — environments & promotion flow (P0-03)

## Environments

| | Development | Staging | Production |
|---|---|---|---|
| Supabase project | local / any scratch | `opnfelgxklfvurzozhms` (the "candidate" project) | `mwkreqcbgpjqcpctwllf` |
| Vercel | `vercel dev` | preview deployments (per-PR) | `rishi-terminal.vercel.app` |
| Payments | none | none until Razorpay staging keys exist | live Razorpay keys |
| Cron | not fired | not fired | `/api/ingest/snapshot` 13:30 UTC Mon–Fri |
| Purpose | iterate freely, seed data is fine | integration + auth testing, no real users | real users, real data |

Rules that hold across all environments:

1. **Migrations are append-only.** New schema lands as `lib/db/migrations/NNN_*.sql`
   and is never edited after it has been applied to any shared database
   (corrections go in a new numbered migration; drift is reconciled like P0-02).
2. **Never sign up on production** except the founder's own real-inbox test —
   the bounce incident (2026-09) came from exactly that. Scratch/staging work
   happens on the candidate project.
3. **Secrets live only in the environment**, never in the repo, chat, or logs.
   `scripts/checkEnv.ts` checks names only, by design.

## Promotion: dev → staging → production

### 1. dev → staging (PR preview)

- Open a PR; Vercel builds a preview deployment.
- Vercel project env for previews points `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` at the
  **candidate** project, plus `CRON_SECRET` + chat keys.
- Gate before promoting the branch:
  ```bash
  npx tsx scripts/checkEnv.ts --env=staging   # → all required present
  npm run lint:ratchet && npx vitest run      # → pass
  curl -s https://<staging-url>/api/health | jq .status   # → ok | degraded (never "down")
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

## Status of this document (updated 2026-10-01, remediation round 3 / N7)

- **Vercel staging project: provisioned and linked.**
  `rishi-terminal-staging` (prj_7B1N3qceJOAh5jVAI32RhF84Zygm) is linked to
  `prateekm1007/rishi-terminal`. Environment variables set (Supabase URL +
  keys, CRON_SECRET, CHAT_API_BASE_URL, CHAT_MODEL, NEXT_PUBLIC_BASE_URL).
  **BLOCKED:** CHAT_API_KEY, FMP_API_KEY and NEXTAUTH_SECRET cannot be
  copied programmatically — Vercel's API returns only encrypted envelopes
  for them, and their plaintexts are not in this session's credentials.
  The founder must enter those three in the staging project's settings
  (Settings → Environment Variables) before `checkEnv --env=staging`
  passes against it.
- **Staging Supabase project: does NOT exist.** An earlier revision of
  this document claimed one was provisioned with migrations 001–008;
  verified against the Supabase Management API on 2026-10-01: exactly ONE
  project exists (the production project). Creating one requires either a
  PAT with project-creation scope (the current PAT returns 403) or the
  dashboard. Production remains the only database; staging deploys
  against it until a staging database is provisioned (acceptable for the
  read-only surfaces, NOT for payment/ingest drills — do those with
  production credentials and cleanup, as the round-2/3 probes did).
