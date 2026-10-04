# RELEASE — environments & promotion flow (P0-03)

## Environments

| | Development | Staging | Production |
|---|---|---|---|
| Supabase project | local / any scratch | **none** — `BLOCKED: staging Supabase project` (founder dashboard task; see status below) | `mwkreqcbgpjqcpctwllf` |
| Vercel | `vercel dev` | `rishi-terminal-staging` project — **git-created deployments suspended repo-side** (`scripts/ci/vercel-ignore.sh`; see Deployment budget below) | `rishi-terminal.vercel.app` |
| Payments | none | none until Razorpay staging keys exist | live Razorpay keys |
| Cron | not fired | ingest crons remain configured on the staging host (13:30/13:45 UTC weekdays); endpoints fail closed — staging has no Supabase env | `/api/ingest/snapshot` 13:30 UTC Mon–Fri |
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

## Deployment budget (X1 — added 2026-10-03)

The account runs on the **Vercel Hobby plan**. Observed limits and behavior
(all verified on 2026-10-03, raw evidence in the Round-10/12 worklog and
GitHub statuses on `34353d3`, `c3e5e83`, `8a8d9dd`, `362baed`, `66f5835`):

- The plan allows **100 deployment creations per rolling 24-hour window,
  team-wide** (all projects). The v13 API returns
  `402 api-deployments-free-per-day, limit {total: 100, remaining: 0}` when
  exhausted; the GitHub status reads "Deployment rate limited — retry in 24
  hours.".
- The counter counts **every deployment-creation event**: production
  deploys, per-PR previews, the staging project's mirror deploys, and events
  for deployments that were later deleted (verified: `remaining: 0` with
  only 18 visible deployments in the trailing 24h).
- Before X1, every merge to `main` cost up to 4 events (production project
  deploy + staging mirror + 2 per-PR previews), which is what exhausted the
  window repeatedly on 2026-10-02/03.

Policy (X1):

1. **Docs-only changes do not deploy.** `vercel.json` `ignoreCommand`
   (`scripts/ci/vercel-ignore.sh`) skips any deployment whose change set is
   limited to `docs/**`, `*.md` (any depth) or `scripts/ci/**`. The script
   fails safe: if the diff cannot be determined it always builds. Its skip
   rule is unit-pinned in both directions (`test/vercelIgnore.test.ts`).
2. **Consequence (accepted):** after a docs-only merge, production serves
   the previous SHA and `main` sits one or more docs-only commits ahead —
   the code tree is identical. Reconciliation conventions compare code
   trees, not SHAs, for such deltas. A deployment-affecting change
   (including `vercel.json` itself) always builds.
3. **Staging no longer deploys.** The `rishi-terminal-staging` project is
   a quota-only mirror — it has never carried Supabase variables (see
   status below), so its deployments served no integration purpose. Its
   git-created deployments are suspended **repo-side**:
   `scripts/ci/vercel-ignore.sh` skips every deployment whose
   `VERCEL_PROJECT_NAME`/`VERCEL_PROJECT_ID` matches the staging project.
   The Vercel project setting
   `gitProviderOptions.createDeployments: "disabled"` (observed on the
   staging project 2026-10-03T14:38Z) does **not** stop deployment
   creation — verified live: staging still built a preview for the X1
   branch after that setting was in place. Staging therefore freezes at
   its last deployment; its two ingest crons remain configured and fail
   closed (missing env), costing nothing against the deployment budget.
4. **Batch merges.** Documentation/evidence commits accumulate in one
   docs-only PR per round (skipped by rule 1); code changes stay
   one-task-per-PR. Do not create manual deployments from the dashboard;
   the merge to `main` is the deploy trigger, plus the documented API
   retry (`scripts/r9_trigger_deploy_env.py`) only when a merge was
   rate-limited.
5. **FOUNDER DECISION NEEDED:** upgrade the Vercel plan (removes the
   100/day team cap) vs. keep batching under this policy. Until decided,
   this policy is the operating constraint.

### Z1 hardening (Round 13, 2026-10-04) — stop deploy starvation

The quota was exhausted a SECOND time on 2026-10-04: ~12 merges in one day
produced 20 deployment-creation events on the main project alone (raw
count from the v6 API, 2026-10-04T04:5xZ): 8 production, 12 branch/preview
builds, 1 canceled — including 5 builds of the SAME production SHA
(`e0104fc`, one per re-run) and 2 of `6d9de4c`. Production sat
rate-limited for 24 h while main was 4 code commits ahead.

Additions to the policy:

6. **Non-production Vercel builds never run.** `VERCEL_ENV` is
   `preview`/`development` → the ignore command skips unconditionally
   (GitHub CI already gates every branch: build, vitest, Playwright smoke
   against a LOCAL build, Lighthouse against a LOCAL server — no GitHub
   gate reads a Vercel preview). Fail-safe: `VERCEL_ENV` unset falls
   through to the change-set rules (a non-Vercel invocation is not a
   quota event to save). Acceptance evidence: after this change, a PR
   branch produces NO Vercel deployment.
7. **Production diff base is `VERCEL_GIT_PREVIOUS_SHA`** when present and
   reachable, else `HEAD^`. This closes the multi-commit defect: a push
   whose last commit is docs-only no longer hides earlier code commits
   from the gate. An unreachable SHA (force-push, fresh repo) fails safe
   to `HEAD^` and then to "build".
8. **`artifacts/**` joins the skip scope.** PR #115 built because of
   `artifacts/phase6/*.json` evidence files; evidence is not a deployment
   reason. Mixed artifact+code changes still build.
9. **Batch merges:** at most ONE production-relevant merge per hour
   unless urgent (a hotfix or a founder-directed deploy). Re-run triggers
   (`scripts/r9_trigger_deploy_env.py`) stay reserved for a rate-limited
   merge, never for retrying a red gate.
10. **Deployment ledger:** each round records the day's production
    deployments in the table below.

| Date (UTC) | production deploys | noted |
|---|---|---|
| 2026-10-03 | 3 (`d90557e`, `9a3e682`, `4bebbd5`) | X1 evidence day |
| 2026-10-04 | 9 creation events on the main project: `4bebbd5` (00:39), `6b4f27a` canceled (00:44), `e0104fc` x5 (02:59-03:25, same-SHA re-runs), `6d9de4c` x2 (03:42 merge + API redeploy) — then rate-limited: `e18d6a9`/`1628ade` created NO deployment | quota exhausted ~03:55Z; window lifts ~2026-10-05 |
| 2026-10-04 (continued) | production READY: `e6ed222` (A1, 12:42Z), `47d76c4` (A2, 13:14Z); then rate-limited again: `e678e49` (A5), `9baa92a` (A4 evidence-only, would have been skipped anyway), `67f153d` (R4-04), `5fc16c7` (X3-05), `a4a7486` (X3-07) all read "Deployment rate limited — retry in 24 hours" on GitHub; v13 API retry returned `402 api-deployments-free-per-day` at 14:32Z (a rejected creation consumes no event) | second exhaustion 13:14:49Z; main sits 4 code commits ahead (`e678e49`, `67f153d`, `5fc16c7`, `a4a7486`); sanctioned API retry loop (`POST /v13/deployments` every 20 min, max 20 h) started 14:32Z per policy 4 — production catch-up runs the moment the window lifts; both this event and the 03:55Z event were made possible by ~51 visible creation events since 00:00Z (30 canceled previews/ignored steps + 21 builds), so the Z1 rules ARE holding — the volume driver was the day's legitimate merge density (19 merges), not a policy bypass |

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
