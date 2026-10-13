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

| 2026-10-07 | 17 production deploys through 20:39Z: `897ec4a` (#229), `a9f55fc` (#232), `cb0de14` (#235), `3ef7237` (#231), `044aef5` (#237), `3a53e12` (#233), `eb2d7f4` (#239), `405e637` (#238), `48667d4` (#242), `05ee441` (#243), `248161d` (#240), `db738c1` (#241), `5da9e80` (#247), `23640d1` (#245), `a286691` (#248), `cf8a4c7` (#249), `8da83ce` (#253) | G/E closure day (G5, G6 live proofs, G7 canonical + driver 1 gate met at P50 5.34s, PA1 + PA2 temporal memory); docs-only #244/#246/#250 deployed nothing by design; C8 cadence held all day (one relevant merge per hour enforced by the PR gate); NS1 (#251) pending its window |

| 2026-10-05 | production READY: `618002b` (CON-B1, 17:05Z) | Constitution v2 ratified (PR #152, docs-only — no deploy owed); PR #153 merge read "Deployment rate limited — retry in 24 hours" (fourth exhaustion, both projects); sanctioned API retry (policy 4) CREATED at 17:03:02Z on the first attempt — the window had already lifted, consistent with the 2026-10-04 lesson that 402 saturation is transient; live controls: `href="/methodology"` present, `Peer Comparison` in /stock/SBIN SSR, "Connecting"/"RANKINGS_ENABLED" absent, /api/version = 618002b (docs/evidence/amendments-2026-10-05/). Process note (amendment-6 discipline in action): the first live probe grepped for "Top Rishi Scores" — a stock-page marker, not a homepage string — returned 0, and was replaced with the CI-pinned markers before any conclusion |

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

## A3 (Round 14) — deployment pacing against the Vercel rate limit

Vercel caps production deploys at 100 per rolling 24 h; the account hit that
cap three times in prior rounds by merging production-relevant PRs as soon
as their CI went green (ten-plus merges in six hours starved later deploys
of budget — the auditor's Round 14 finding).

The discipline from here on, recorded so it survives sessions:

- **At most ONE production-relevant merge per hour** (a merge that deploys:
  app code, migrations, workflow changes). Docs/evidence-only commits do
  not deploy (the `vercel-ignore.sh` build step skips them) and are exempt.
- Related PRs are STACKED and deployed by a single merge: their branches
  build on each other, so the last merge carries all of them to production.
- After the day's batch, `main` is deployed ONCE and the live SHA is
  proven against `origin/main`:
  `curl -s https://rishi-terminal.vercel.app/api/version` must equal the
  main tip — pasted in the round's PR with the raw output.
- All live-acceptance greps from earlier rounds are re-run against THAT
  SHA before the round is reported green. Since B1 (Round 15) the
  `post-deploy-smoke` workflow does this automatically on every Production
  deployment_status (occurrence-counted sections + version SHA + Y4
  null-zero controls; `scripts/ci/postDeploySmoke.mjs`) — a red smoke run
  on the Actions tab means production is serving a page that fails the
  live contract, even though the merge itself was green.

### 2026-10-04 deployment log (Round 14, recorded honestly)

- **The daily deployment quota IS exhausted.** The Vercel API's
  authoritative limit counter (`api-deployments-free-per-day`) reads
  `total=100, remaining=0, reset=2026-10-05T14:28:36Z` — every attempt
  to create a deployment returns HTTP 402:
  `"Resource is limited - try again in 24 hours (more than 100)"`.
  Note the v6 deployment LISTS under-report the count (46 + 8 staging =
  54 visible in the 24h window): the counter evidently includes
  deployment creations the list endpoint does not surface. The 402 is
  the ground truth; the list is not.
- **The morning's starvation was cleared by ~12:30 UTC**; production
  deployed A1 (12:42) and A2 (13:14).
- **Git-integration stall**: A5 merged 13 seconds after A2 (13:14:49
  UTC) and the merges after it (A4 13:46, R4-04 14:03, X3-05 14:17,
  X3-07 14:24) produced NO automatic production deployment objects —
  consistent with the quota having been exhausted mid-afternoon by
  then. Production stays at `47d76c4` (A2) until the reset.
- **Monday protocol (mechanical, after the 14:28 UTC reset)**: (1)
  trigger ONE production deploy of `main` via the Vercel API
  (`scripts/a3-deploy-main.py` — create-then-poll-by-id); (2) prove
  `curl -s https://rishi-terminal.vercel.app/api/version` equals
  `origin/main` (expected `a4a7486` + the A3 merge itself); (3) re-run
  the A1 live greps with their positive controls against that SHA; (4)
  append the raw outputs to `docs/evidence/round14/a3-deploy-proof.md`.
- **Pacing violations this session, recorded not hidden**: A2+A5 merged
  13 s apart; A4/R4-04/X3-05/X3-07 each merged within ~15 minutes of
  their CI turning green rather than held to one-per-hour. This session
  did not exhaust the quota alone (the visible 24h window is dominated
  by the overnight session's burst — 10 creations in the 03:00 UTC hour
  alone), but the one-per-hour rule above is now the standing
  discipline, and this log is the baseline.
- **A4's merge (docs/evidence only) deployed nothing** — the
  `vercel-ignore.sh` docs-only rule skips it, as designed (no quota
  consumed for doc-only ranges either).

### A3 resolution (2026-10-04, evening — supersedes the "Monday protocol" above)

The window drained EARLIER than the counter's reset claim: the sanctioned
API retry (policy 4) CREATED a deployment at 14:48:02Z (HTTP 200,
`dpl_CEjogr5gFhh7gb7hWke5eAwJBitZ`, READY 14:49:57Z) — so the 402s were
transient saturation, not a wall until 2026-10-05T14:28:36Z. Production
deployed the full catch-up (A5/R4-04/X3-05/X3-07) and was verified live the
same afternoon (raw outputs: docs/evidence/round14/rate-limit-catchup.md).
The #150 merge hit the cap a third time (~15:10Z) and #151 merged cleanly
at 15:52:36Z (production READY at `c88bd1d`, proven via /api/version).
Lesson recorded: the counter's `reset` field reports the worst-case expiry
of the oldest event, not the earliest moment a deploy can succeed — retry
sporadically instead of waiting out the claim. The one-merge-per-hour
pacing discipline above remains the standing rule.

### 2026-10-05 session — eighth exhaustion (Round 18, E1-E5)

- 11:52Z: PR #195 (E1) merged cleanly (merge commit `202e139`). Its
  production deployment was **rate limited, not built**: GitHub status
  on `202e139` reads "Deployment rate limited — retry in 24 hours."
  (402-class, `api-deployments-free-per-day`).
- 12:00:34Z and 12:05:53Z: sanctioned single-shot API retries (policy 4,
  POST /v13/deployments, `gitSource` org/repo shape) — both HTTP 402;
  rejected creations consume no quota event. Deploy debt: `202e139`.
  Sporadic retry continues (the window drains on oldest-event expiry).
- The E2/E3 PRs (#197/#198) are docs-only (the ignored build step owes
  them no deployment).

- **13:20:41Z pacing slip, recorded not hidden**: #186 (bundle ratchet)
  merged 27.7 minutes after #197 (E2, 12:52:57Z) — inside the same
  hour window, against C8's one-production-relevant-merge-per-hour.
  Cause: automation wait under-shot the boundary. Consequence: deploy
  debt accrues while the quota window is 402-saturated. Correction:
  remaining queue slots are computed from each merge's actual time
  (#189 ≥ 14:20:41Z, hourly thereafter), and the wait loops now target
  last-merge-time + 61 minutes.
- **13:49:18Z second pacing slip, recorded not hidden**: #189 (smoke
  hardening) merged 28.5 minutes after #186 (13:20:41Z) — the automation
  wait loops under-shot the wall-clock target twice in a row. Process
  fix: merges now go through a cadence guard that refuses to merge
  before last-merge + 61 minutes (automation-side state, ledger remains
  the durable record). Slots recomputed from #189's actual time:
  earliest next production-relevant merge 14:50:18Z.

### 2026-10-05 session (audit closure) — third pacing slip, mine

- 14:07:20Z: sanctioned single-shot API retry succeeded (quota window
  had drained) — production caught up from 243fd99 to d612cfe
  (dpl_CZ1oQ6Ccghw4egcfkxqWRSvGEw83, READY 14:09:58Z), resolving the
  deploy debt of 202e139 / c51e185 / 572562b.
- #179 (cadence merge gate) merged 15:02:56Z — 73.6 min after #189 ✓.
- **16:29:01Z pacing slip, recorded not hidden**: #202 (clean-server
  harness) merged 11.4 min after the parallel session's #182
  (16:17:37Z). Cause: this session's merge command chained
  fetch-tip-print-merge in one shot; the tip HAD moved (b3c52db) but
  the merge was already dispatching — the state check was decoration,
  not a gate. #179's PR-side gate could not catch it (the green check
  predated #182 by ~2 min). Correction: merges now go through
  scripts/merge-guard.py (fetch → required-check-green-on-exact-head →
  main-not-moved → cadence-window-open → merge; refuses otherwise;
  docs-only exempt per C8). The push-time report for 5ca757f printed
  the violation without failing main, exactly as #179 designed.
- 5ca757f deploy did not auto-fire; sanctioned API retry at 16:53Z
  (dpl_7poPsgYLEER3fFmVRiXMgCeCXgmU, READY ~16:56Z, /api/version
  verified). 87deecf (parallel session's #184) auto-deployed after.
- Full record: docs/evidence/round16/deployment-closure.md.

### 2026-10-11 session (round 47) — ninth exhaustion, deploy debt recorded

- **11:48:14Z — PR #342 (P0-5-VERDICT-UNIFORM) MERGED** through
  `scripts/ci/merge-guard.py` (all six gates green on the exact head
  e1b62bfe886d, rebased onto main f3b8ec4 first; merge commit
  71a37a6a3e42). The merge did NOT auto-fire a Vercel deployment (no
  deployment record was created for the SHA at all — the webhook never
  fired; previews from branch pushes WERE still being created).
- **12:04Z — sanctioned single-shot API retry REFUSED by quota**:
  `POST /v13/deployments` → HTTP 402
  `Resource is limited - try again in 24 hours (more than 100, code:
  "api-deployments-free-per-day")`. The B-22 pattern (ninth recorded
  exhaustion). Sandbox egress to NSE is 403-blocked (recorded in the
  P1-LIVE-UNIVERSE PR), so the retry path is the production API only.
- **DEPLOY DEBT: 71a37a6a (PR #342).** Production serves 791c7b6
  (pre-#342). Retry sporadically per B-26 (the counter expires on
  oldest-event age, not a fixed clock); every later merge in this round
  joins the debt queue in order. The cadence ledger below tracks the
  production-relevant merges; C6 "live" legs for each owed merge run
  when the debt clears.
- Merge cadence this round (all through the merge-guard, rebased heads):
  #342 11:48:14Z (window from #341 10:35:39Z honored). Subsequent
  merges hold the one-per-hour C8 window regardless of deploy state —
  the debt is deployment-side, not merge-side.

### 2026-10-11 follow-up (round 48) — the #342 deploy debt CLEARED

The 11:48Z entry above records #342 landing with deploy debt while the
quota window was 402-saturated ("production serves 791c7b6 until the debt
clears"). That present-tense claim is now historical only: #349 merged at
~12:55Z, built FROM THE MAIN TIP (which already contained #342's changes),
and deployed — production serves `4c9f7088` (verified live, first probe,
13:56Z: `GET /api/version` → sha 4c9f7088cb04...; the /stock/RELIANCE
flight carries the #349 licence-hold content). No debt remains; the
retry-sporadically protocol stood down unused.

### 2026-10-12 (round 49) — tenth exhaustion; deploy debt recorded

- #346 (P0-8-LIVE-CLAIMS + the RESP-2 News reversal) merged via the
  merge-guard at 2026-10-12T00:21:27+05:30 (the merge commit's author
  timestamp, read back from origin/main; all six gates green on the
  exact head 00582dc; merge commit 304dc104877b). The merge did NOT auto-fire a
  deployment within the observation window (two v6 list reads, 45 s and
  120 s after the merge).
- **12:00Z-class sanctioned single-shot API retry (policy 4) → HTTP 402
  `api-deployments-free-per-day` (total=100, remaining=0)** — the tenth
  recorded exhaustion (B-22 class).
- **DEPLOY DEBT: 304dc104 (#346) + 6197039 (#353).** Production serves
  16cd0a9 until the debt clears. The founder's RESP-1 order anticipates
  exactly this: "If the deploy quota blocks it, batch the queue into one
  deploy and record it in docs/RELEASE.md" — the queue is batched: the
  debt is deployment-side, not merge-side (C8 cadence continues; later
  merges join the debt in order).
- The sanctioned sporadic retry loop (POST /v13/deployments every 20 min,
  max 20 h) is armed; production catch-up runs the moment the window
  drains, then the round-49 live probes run against the deployed SHA
  (/api/version, the RELIANCE seed-leak probe, the News nav + empty state,
  the FD-22 awaiting panel).

### 2026-10-12 (round 49, continued) — the tenth-exhaustion debt CLEARED by the #372 deployment; #376 landed

- **The debt cleared itself the RESP-1 way (one batched deploy).** The
  #372 merge (7682263, 21:31:11Z) auto-fired a deployment — `post-deploy-
  smoke` (event `deployment_success`) completed SUCCESS at 21:32:45Z, and
  `GET /api/version` served sha `7682263…` when probed at 02:08Z (before
  any later merge). Production therefore went 16cd0a9 → 7682263 in ONE
  deployment carrying the whole debt queue (#346, #353, #354, #359, #360,
  #372, #373, #375): the quota window drained as B-26 predicted (the
  counter expires on oldest-event age, not a fixed clock), and the armed
  sporadic-retry loop was never needed (sandbox background processes do
  not survive tool-call boundaries — the round-45 finding — so no retry
  ever fired; the auto-deploy path did all the work).
- **The #372 merge exposed a smoke flake, fixed as #376.** The push-CI on
  7682263 failed `Playwright smoke` (run 38176708451): a strict-mode
  violation in `test/smoke/b1-panel-removed.spec.ts` — the NO-VERDICT
  record resolved to 2 elements (one in `<main>`, one in React's off-main
  hidden streaming-completion container) on a contended runner. Diagnosis,
  reproduction matrix (~250 local loads, never duplicated) and the
  main-scoped-locator fix: PR #376 + `docs/evidence/round49/
  b1-smoke-streaming-race.md`. #376 merged through the merge-guard at
  02:50Z (all six gates green; cadence 320.1 min honored) → merge commit
  aab1eb1d; deployed (post-deploy-smoke SUCCESS 02:53:06Z); production
  serves aab1eb1d (verified: `GET /api/version` → aab1eb1d…); the push-CI
  on aab1eb1d is ALL GREEN including `Live content smoke (production)`.
- **Merge-queue state at this entry (for the next session):** the round-49
  implementing PRs are rebased onto aab1eb1d and pushed — #369 (FD-23,
  f98c77b), #370 (FD-24, e7d514d), #371 (FD-26, 2d4dd30), #361 (FD-15,
  9ffa540, incl. the #346-pin re-anchor and the ratchet re-measured to
  264 on the union). Their first CI runs aborted at the C8 cadence step
  (pushed inside the 02:50Z window — by design; lint/tsc/tests never
  ran, branch hygiene passed). The pattern per PR: at the open window,
  re-run the failed quality job (the cadence verdict then passes), wait
  for the five checks, merge through the guard, rebase the next PR onto
  the moved tip. One production-relevant merge per window; docs-only
  merges ride free.

### 2026-10-12 (round 50) — RESP-1R: the live claim reconciled; production serves 02eac31

- **The probe and the page agree.** `node scripts/ci/postDeploySmoke.mjs
  --base https://rishi-terminal.vercel.app --expect-sha
  02eac31664013b80d568c55d6d914d86420af357` → PASS, all 22 checks, exit 0
  (version sha match; SBIN/BANKBARODA seed-record trichotomy; RELIANCE
  seedleak: "HIGH Data" 0, "REDUCE" 0, old QVPS badge 0, QVPS-on-seed 0;
  nullzero pins hold). Independent `curl -sI /stock/RELIANCE` → HTTP 200,
  `X-Vercel-Cache: STALE`, `Age: 1318`; body 84,827 bytes with "HIGH Data"
  x 0 ("REDUCE" x 0, "Avoid" x 0). The 7 QVPS mentions are provenance copy
  ("no QVPS are produced on seed data"), not score tiles; Key Metrics x 3
  and Peer Comparison x 2 hold as positive controls. A cache-busted fetch
  (`?cb=02eac31verify`, edge STALE Age 115) also returns "HIGH Data" x 0.
- **Why the ~10:00 IST fetch disagreed.** It coincided with the #380 merge
  (02eac31, 04:29:41Z): the edge served STALE objects through the deploy
  transition. No code path on main can render the observed strings — the
  only "HIGH Data" hit in source is a comment
  (`components/score/RishiScoreDual.tsx:149`), and "REDUCE" occurs 0 times
  under app/components/lib/data/messages. The founder's purge condition
  ("the page still shows HIGH Data") is therefore NOT met from any vantage
  now; no purge ran.
- **Ledger correction (C6):** the "production serves 7682263" (#378 entry)
  and "serves aab1eb1d" entries above are SUPERSEDED — `GET /api/version`
  serves `02eac31664013b80d568c55d6d914d86420af357` = current main tip
  (#380). Next production window opens 05:29:41Z (#380 merge + 60 min).

### 2026-10-12 (round 51) — RESP-1/RESP-4: deploy batch dcd4c06 verified live

- **Version.** `GET /api/version` serves `dcd4c0611482393554d4f0c2f220bd9e606d055f`
  = current main tip (#392 RISHI-21; merged 10:34:03Z, serving within ~8 min —
  the deploy pipeline is healthy, no debt protocol needed).
- **Seed-leak probe.** `node scripts/ci/postDeploySmoke.mjs --base
  https://rishi-terminal.vercel.app --expect-sha dcd4c06…` → PASS, exit 0
  (dual-key script, #384 hardening): RELIANCE seed record (seed=1, missing=0,
  verdict-sections=0/2); "HIGH Data" 0, "REDUCE" 0, old QVPS badge 0,
  QVPS-on-seed 0, on probe key AND bare-cache key; nullzero pins hold
  ("hidden for banks" control ≥ 1). Full output in the session report.
- **Chain since the last entry:** 02eac31 (#380) → eef4ab4 (#381 docs) →
  422cd07 (#384) → 298e5bd (#382 docs) → 5cb830f (#383 docs) → 2f277dd
  (#371 DELIV-2, live-proven on ea7c244) → ea7c244 (#387 docs) → 76f70d4
  (#379 guard) → 7ecafc8 (#369 RULES-2) → a50704c (#385 ENG-1b, live-proven:
  smoke PASS + /methodology/munger serves the null contract) → dcd4c06
  (#392 RISHI-21, live legs owed to this entry — covered above).

### 2026-10-12 (round 50, continued) — RESP-4: #388 merged; deploy debt (Vercel quota exhausted)

- **PR #388 (DELIV-4 copy audit) MERGED 8c004675 at 11:44:29Z** (head
  edab096, CI all five jobs green on the re-run at window open). The merge
  created **NO production deployment** — the Vercel deployment-quota
  response on the sanctioned A3 single-shot retry was
  `402 api-deployments-free-per-day, remaining: 0` (the B-22 pattern:
  100/day rolling window including canceled preview events; today's PR
  rebase pushes consumed the budget). Production still serves dcd4c06.
- **Drain schedule (C8: the counter expires on oldest-event age):** the
  oldest counted event ages out ~12:52:00Z; further slots free at
  ~13:01Z, 13:10Z, 13:30Z, 13:44Z, 13:59Z. Sporadic retries scheduled;
  the debt is expected to clear within the hour. No further
  production-relevant merges until the deploy catches up (C8: check the
  quota against this ledger before merging).
- Live proof for #388's copy changes (grep-zero of the four claim
  families on the served HTML) rides the deploy.

### 2026-10-12 (round 50, third entry) — RESP-4: #395 merged; quota reset decoded (CORRECTION of the drain estimate above)

- **PR #395 (RULES-3 Rishi-count wording) MERGED d659595 at 12:51:55Z**
  (head 37a962d, CI all five jobs green on the window re-run at 12:45:30Z;
  merge-guard base==main verified before the merge). The merge created **NO
  production deployment** (the Git integration did not fire — the #311
  pattern).
- **A3 single-shot retry at 12:53:35Z: `402 api-deployments-free-per-day`,
  remaining 0, `reset: 1791895929520` = 2026-10-13T12:52:09Z.**
- **CORRECTION (C1: the entry above mis-decoded the reset).** The "drain
  within the hour / slots free at 13:01Z…" schedule was wrong: the 402's own
  reset field decodes to **tomorrow** (13 Oct 12:52:09Z), not today 12:52Z.
  The visible team-wide census (78 deployment objects in the trailing 24h:
  67 rishi-terminal + 11 staging, oldest 11 Oct 13:01:54Z) is BELOW the
  100 counted — deleted-branch preview objects stay counted in the quota
  counter while disappearing from the listing, so the visible oldest does
  not bound the counter. Expect no quota until the reset timestamp unless a
  retry succeeds earlier (sporadic retries continue per B-26).
- **Decision (C10 protocol, logged):** the 12 Oct queue merges continue —
  the founder's timeline (22 Oct demo from main) outweighs stacking debt
  that one catch-up deploy clears; each merge's debt is recorded here, and
  the catch-up deploy + live proofs (postDeploySmoke, DELIV-4 grep-zero,
  RULES-3 canonical sentence) run the moment a retry succeeds. Chain so
  far: dcd4c06 → 8c00467 (#388, deploy owed) → d659595 (#395, deploy
  owed). Production still serves dcd4c06.

### 2026-10-12 (round 51) — RESP-1/RESP-4: catch-up deploy 641e37c verified live; the whole round-50/51 chain is deployed

- **Version.** `GET /api/version` serves `641e37cf653efa08abae91423b4ca597f196f080`
  = the main tip at 14:35:42Z. The #389 merge's Git-integration deployment
  **dpl_9diN2o (READY, created 14:01:50Z)** fired successfully — the quota
  window opened between the 13:19Z 402 and 14:01:50Z (the counter drained;
  the "reset 13 Oct" worst case did not materialise). One deploy covered the
  whole chain: dcd4c06 → 8c00467 (#388 DELIV-4) → d659595 (#395 RULES-3) →
  679f449 (#397 docs, no deploy owed) → 641e37c (#389 DELIV-5). Deploy debt:
  **cleared**.
- **postDeploySmoke** (dual-key seed-leak probe, #384 hardening):
  `node scripts/ci/postDeploySmoke.mjs --base https://rishi-terminal.vercel.app
  --expect-sha 641e37c…` → PASS, exit 0 (RELIANCE seed record trichotomy;
  "HIGH Data" 0, "REDUCE" 0, QVPS-on-seed 0, bare-cache key too; nullzero
  pins hold). The post-deploy-smoke workflow also ran green on the
  deployment_status event (run 38260179713).
- **Live proofs per merge (all PASS, cache-busted fetches 14:36–14:37Z).**
  #388 DELIV-4: 'every verdict' / 'WISDOM TIERS' / 'Elite Knowledge Graph' /
  'live prices' = 0 occurrences on /, /pricing, /stock/RELIANCE, /rishis;
  positive controls hold (the stock-page Knowledge Graph view mounts; /pricing
  names the built KG views). #395 RULES-3: the canonical sentence
  "21 Rishis: 20 scored, Jim Chanos chat-only" renders on /stock/RELIANCE (x2)
  and /pricing (x1); "VIEW ALL RISHIS" present, "VIEW ALL 20" = 0. #389
  DELIV-5: /stocks pills Banking/NBFC/Realty/Fintech; raw 'RealEstate' and
  'Finance' sector labels = 0 (the only "Real Estate" text is Indiabulls'
  company name; its sector field reads Realty).
- **Next production-relevant merge window:** 15:01:47Z (#389 merge + 60 min).

### 2026-10-12 (round 53) — the founder's night order: #399 merged+deployed+live-proven; the queue

- **Premise correction (rule 28, recorded for the auditor).** The founder's
  scorecard snapshot (main f9a8494, #391 unmerged) predates 16:07:38Z:
  #391 IS merged (origin/main was e8d2c23 at session start); production was
  641e37c, so e8d2c23 carried deploy debt until this round's first deploy.
  The merge queue is therefore #399 → #400 → #401 → #370 (+ the item-5
  copy PR), each with a bare-URL live proof per the founder's order.
- **#399 (STALE-QUOTE, amended per the founder's item 2).** Branch
  fix/stale-quote-freshness at ff87593 (5 commits, token normalized to
  STALE-QUOTE after a C7 branch-hygiene CI failure — the branch had carried
  both P0-STALE-QUOTE and STALE-QUOTE subjects; all five normalized, guard
  PASS). CI 5/5 green at 17:18Z. **Merged a104ee91 at 17:19:27Z** (GitHub
  auto-merge fired when checks passed — the guard then correctly refused a
  double-merge; auto-merge is OFF on #400/#401/#370, verified).
  **Deployed:** the Git-integration deployment fired (READY 17:19:31Z);
  `/api/version` = a104ee91 — one deploy cleared the e8d2c23 debt and
  shipped #399 together. **Live proof (bare URL, no cache-buster):**
  `age: 0`, `x-vercel-cache: PRERENDER`, "market open|market closed" = 0
  occurrences in the served HTML; the origin-control regen's first byte
  renders `as of Mon 12 Oct, 15:15 IST · stale (server render)` — the
  founder's item-2 acceptance holds with margin (no market status at all in
  the server render). Evidence pasted on the PR thread.
- **Cache diagnosis (item 2, recorded).** `revalidate = 60` holds in code;
  ISR regeneration works (x-nextjs-prerender: 1; the served prerender
  demonstrably regenerated post-deploy). The >50-minute staleness the
  founder measured is DATA-layer: the quote cache's newest observation was
  13:28→15:15 IST (browser-warmed via the client hook — curl fetches run no
  JS and never warm), and the GH Actions warmer fired only ONCE on 12 Oct
  (10:37:46Z, post-close no-op; ~1.4 runs/day since the Oct 5 re-registration
  vs the ~32/weekday the schedule asks — GitHub schedule drops). Every
  regeneration re-baked the same cached quote; the pre-P0 label then granted
  "intraday" by calendar-date match. The probe's new absolute open-session
  rule (item 3) fails on this class during market hours by design — the
  warmer's reliability is a founder-visible ops finding, reported in the
  round summary (options: accept client-hook warming, an external scheduler
  pinging workflow_dispatch, or both).
- **postDeploySmoke (the amended probe, branch head): 52/52 PASS, exit 0**
  against a104ee91 — bare-cache legs first (authoritative) with edge-headers
  lines (age + x-vercel-cache recorded), origin-control legs second,
  RELIANCE seed-leak zeros, CHAT-ONE... CHAT-ONLY marker, nullzero pins.
  Full output pasted in the round report; the probe PR (#400) merges at its
  window with the same proof re-run from main.
- **Quota.** API-created deployments: 402 at 17:25Z (api-deployments-free-per-day
  exhausted; the git-integration deploys are a separate path and still fire,
  as #399's deploy proves). Production deploys this round ride the Git
  integration.
- **Next production-relevant merge window:** 18:19:27Z (#399 merge + 60 min)
  → #400 (probe), then #401, #370, and the item-5 copy PR, one per window.
## Round 53 (2026-10-12, night — session 2) — the queue driven to completion + deploy debt

The founder's order and items 1-6 execution continued from the first
round-53 ledger entry above. This session (Task ID 35 in the multi-agent
worklog) drove the merge queue through the hourly cadence windows.

- **Queue (item 1, one production merge per window):**
  - #399 STALE-QUOTE merged a104ee91 17:19:27Z — deployed + live proof
    recorded in the entry above (C6 complete).
  - #400 PROBE-LIVE (amended: bare URL authoritative, absolute
    open-session >15-min rule, edge-headers recorded) merged 5455fd22 at
    18:27:41Z. **Deploy anomaly:** the git-integration deployment did NOT
    fire (no deployment object 6+ min; #399's had fired in 4 s). Deployed
    via the v13 API instead — which now requires `gitSource.repoId`
    (numeric GitHub repo id); `scripts/trigger-production-deploy.mjs`
    patched. dpl_ECV7n6VAiy READY 18:36:08Z. **Live proof re-run from
    main:** postDeploySmoke `--expect-sha 5455fd22` → **52 PASS / 0 FAIL /
    exit 0**, every bare-cache leg FIRST with its edge-headers line (age +
    x-vercel-cache); output pasted on the PR thread and preserved at
    `docs/evidence/round53/probe-400-live-5455fd2.txt`. Item-3 acceptance
    ("Record age and x-vercel-cache in the output. Paste the output.")
    met.
  - #401 RISHIS-FORMULA (amended: all 16 system-prompt Formula lines
    regenerated to the scorer texts) merged 53be6c56 at 19:36:40Z.
    **Deploy debt** (below). RED captured pre-merge: production /rishis
    carried the drifted "Sentiment (10%)" and Soros 25/25/20/20/10.
  - #370 FD24-RANKED-NAMES merged 4b4b520 at 21:56:51Z — the founder's
    ask-2 confirmation on record ("Top Buy Signals" and "Short Radar" keep
    their names, the P0-6 exception documented). **Deploy debt.**
  - #404 DELIV-4 news title (item 5) merged f5286b8 at 23:16:24Z.
- **Docs merges (cadence-exempt, no deploy owed):** #403 demo-public-run
  evidence (item 6) 8bb839fd; #410 DEMO-APPROACH proposal 05c9660. The
  parallel session merged its own docs/code on the same tips (#407-#409).
- **DEMO-APPROACH delivered (founder ask 1, due 14 Oct):** PR #410 —
  `docs/DEMO-APPROACH.md`: the constraint set, options A-D, the A+B
  recommendation (the real honest path + ONE fictional instrument under an
  unmissable "ILLUSTRATIVE — FICTIONAL COMPANY" banner), the P0-1 `demo`
  record-class amendment scoped for founder sanction, the FD-6
  revive-or-reword rider, the build order inside the freeze window, and
  the fallbacks. No /demo route was built — the standing guardrail holds
  until the founder's written decision.
- **Deploy debt (C6 pending, recorded):** #401 (53be6c56), #408
  (c001b80, parallel session's r55-holidays, production-relevant), #370
  (4b4b520), #404 (f5286b8) — all owed a production deploy at session end.
  **Quota:** the v13 API deploy path 402'd at 19:39Z
  (api-deployments-free-per-day 100/100, remaining 0; the reset field
  decodes to 13 Oct 19:39Z and slides with attempt time — the B-22/B-26
  pattern). The git-integration path fired for #399 (17:19Z) but was
  silent for #400/#401/#370 — its silence coincides with the counter
  filling; deleting deployments does not free it (round-51 census).
  Retries: sporadic per B-22; the realistic catch-up is 13 Oct as the
  12-Oct deployment creations age out of the 24h window. **The deferred
  live proofs** (formula GREEN pair, ranked names on the dashboard, news
  feed wording) run on the first successful catch-up deploy — same
  procedure as the round-51 catch-up.
- **GitHub secondary rate limit incident:** sustained REST 403s from
  ~19:48Z (core quota showed 5000/5000 — abuse detection, not the hourly
  limit; two active sessions + CI polling). Git transport unaffected.
  **Mitigation built:** GraphQL-based monitoring + merge
  (`ghql_status.py`, `ghql_merge.py`) with EVERY merge-guard condition
  replicated and printed before use (required check green on head,
  base==tip via ls-remote, cadence/docs-exemption via the same
  skip-pathspecs as deployCadence.mjs). Used for #410 and #370; the
  REST merge-guard remains the primary path when available.
- **Parallel-session coordination:** the parallel session executed the
  #400 window push at 18:20:02Z (tree-identical to this session's
  fast-gated candidate), ran its own R55 docs/code wave (#405-#409, #411
  ENG-4), and its #408 merge landed between #370's push and merge — both
  merge guards correctly refused (base≠tip); #370 re-rebased and merged at
  the next window (21:46:43Z push, 21:56:51Z merge). No collisions;
  division of labor held (this session: the founder's round-53 queue; the
  parallel session: R55 registers + ENG work).
- **ENG-6 census (item 7 continuation, measured for tomorrow):** 24
  warnings / 0 errors on the demo-path files — 12
  @typescript-eslint/no-explicit-any, 4 no-unused-vars, WisdomChat purity
  (Date.now in handlers) ×2, 1 exhaustive-deps (LivePriceWidget), the
  rest scattered (news page, charts). Ratchet 273 ≤ 278.

### Round-53 session-2 correction (23:30Z): the deploy debt CLEARED itself

The ledger above recorded #401/#408/#370/#404 as deploy-debt pending the
quota drain. Minutes after #404's merge (23:16:24Z), the git-integration
deployment fired for f5286b8 — shipping #401 (53be6c5), #408 (c001b80),
#370 (4b4b520) and #404 together. `/api/version` = f5286b8. **The deferred
live proofs ran immediately, all green (bare URL, no cache-buster):**
- #401 formula: the RED→GREEN pair flipped — "Sentiment (10%)" 1→0,
  "Neutral Base (10%)" 0→1 on /rishis.
- #370 names: "Top Buy Signals" ×2 and "Short Radar" ×2 on the dashboard.
- #404 news: "LIVE RSS" 1→0 in the served payload (dead keys gone); the
  auto-refresh disclosure present.
- Full postDeploySmoke vs f5286b8: **52 PASS / 0 FAIL / exit 0**.
Proofs pasted on PRs #401/#370/#404 (comments 6134584328/6134584503/
6134584669). Every production merge of round 53 is now
merged + deployed + live-proofed (C6 complete).

## Round 54-55 (2026-10-13) — #414 and #415 recorded; the 52/52 claim withdrawn

The round-54 session merged six PRs (23:21Z-07:21Z window) but closed
before its ledger entries landed. Recorded here per the founder's
round-55 order ("Record #414 and #415 in docs/RELEASE.md with SHAs and
the live result, or 'pending' if not reproduced").

- **#414 — fix(PROBE-MKT), the probe's state-vs-IST-clock rule.**
  Merged: `7579fcb` (commit `ad894e3`). Deployed: in production
  `938c1c3` (the #415 deploy carried it). Live result: the served
  `/stock/RELIANCE` HTML carries NO market-state wording (0 occurrences
  of "market open" and "market closed" on the bare-URL fetch — the
  #399/#414 contract holds on the live build); the self-test
  (`node scripts/ci/postDeploySmoke.mjs --self-test`) is 17/17, exit 0,
  on the deployed-identical code. Full C6 evidence:
  `docs/evidence/round55/r55-c6-stockpage-probe.md`.
- **#415 — fix(FD22-AWAITING), the two named awaiting sections.**
  Merged: `938c1c3` (commit `cbc7882`). Deployed: production
  `/api/version` = `938c1c3`. Live result: REPRODUCED — the browser
  capture (2026-10-13T08:17:45Z, headless, production bare URL): the
  dashboard renders `🟢 Top Buy Signals` and `🔴 Short Radar` (both h2,
  visible), each with the honest awaiting copy ("Rankings are on —
  nothing qualifies yet ... no seed-derived ranking is shown");
  `RANKINGS_ENABLED` confirmed true through the vault credential
  (target=production, updated 2026-10-06); the flag-off copy does not
  render. Screenshot + DOM dump in
  `docs/evidence/round55/r55-c6-stockpage-probe.md` §4.
- **THE 52/52 CLAIM IS WITHDRAWN** (the founder's own rule: "If it
  fails, the 52/52 claim is withdrawn"): the 13 Oct 07:56Z live probe
  run — open session, bare URL, production 938c1c3 — FAILED 4 checks
  (48 PASS / 4 FAIL / exit 1): the SBIN and BANKBARODA open-session
  freshness legs on both cache keys, serving 29-minute-old observation
  lines at edge ages 1591/1592 (STALE). Root cause and fix recorded
  below (#422 ISR60). The round-53 52/52 was true for f5286b8 at
  23:35Z 12 Oct; it did not survive the traffic-driven regen gap.
- **In flight at ledger time (round-55 session, owner
  web-8e0cdc75):** #422 fix(ISR60) — the 60-second regeneration (warmer
  minute tick + revalidate + self-ping; migration 030 re-pins pg_cron);
  #423 fix(PROBE-NOSTATE) — the absolute no-state rule + the RELIANCE
  fixtures. Live proofs ride their deploys.
- **CI-corruption report RETRACTED** (founder order): the ci.yml
  "corrupted push trigger" was a tool-rendering artifact, never in the
  repository bytes (`od -c` proof, twice). The retraction is recorded in
  the session worklog.

## Round 56 (2026-10-13) — LIVE-TODAY: the dashboard Today view goes live (#433)

The founder's order (verbatim, 13 Oct): "make the site live. make sure
today page on dashboard is fully working. Also add top 5 losers and top 5
winner stocks on dashboard. use Unofficial data scrapers."

- **#433 — feat(LIVE-TODAY), the live Today view.** Merged: `50180b4`
  (single commit `b09e86a`, all five CI checks green post-C8-window).
  Deployed: production `/api/version` = `50180b4f6499…` (deploy
  `dpl_2yB9EoVXadtAtPkiE9CfEYMhi1mw` READY 16:00:34Z — the manual v13
  trigger fired on sporadic-retry attempt 2 after the 100/day quota 402,
  the B-22 discipline). Live result: REPRODUCED on the bare URL —
  "Today's Top 5 Winners" and "Today's Top 5 Losers" both render with 10
  rows, every row carrying its own `Yahoo Finance (unofficial) · Tue 13
  Oct, 15:XX IST` attribution (FD-15), the derivation line reading
  "computed from this session's cached observations — 827 tracked
  symbols observed", top gainer HATHWAY +15.12% / top loser RBLBANK
  −7.04% (13 Oct session). The force=1 warm from the production egress
  answered 200 with `movers: {path: "computed", 5+5, universeObserved:
  827}` and `isr60: {revalidated: 8, pagesRendered: 8}` (the homepage
  joined the 60-second regeneration contract). postDeploySmoke: PASS vs
  `50180b4f6499`. Full C6 evidence:
  `docs/evidence/round56/r56-live-today.md`.
- **Migration 033** (`market_movers` + `market_movers_meta`, RLS
  deny-all) applied to production Supabase ahead of the deploy (CI's
  Postgres-16 job validated it on the PR).
- **NSE-first path status (honest)**: reachable from the production
  egress (no 403, unlike the dev sandbox — the Akamai block is an
  egress property), but the payload differs from the documented
  nsetools/openchart contract (`{"legends": […]}` with no top-level row
  array; `index=losers` answers "Missing index or key" — NSE's own
  `loosers` spelling suspected). The fail-closed design served the
  computed path with the zod issue + payload head disclosed in the
  warmer response — the schema fix against real bytes is the documented
  one-commit follow-up.
- **C7 conflict recorded**: the parallel session's #432 (DASHBOARD-MOVERS)
  implements the same founder order but ranks only NSE-sourced
  quote-cache rows — production holds ZERO NSE-sourced rows (836
  yahoo-bulk + 12 yahoo, verified 13 Oct), so its panels would render
  empty on the current cache. Escalated on the #432 thread with the
  evidence and a recommended default (merge #433 — done; #432's owner
  closes/rebases; their FD-30/FD-31 licensing record references are
  worth preserving). Founder decision pending.
