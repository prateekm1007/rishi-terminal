# E4 — quote warmer schedule: diagnosis and external scheduler (zero cost)

Round 18, item E4. Founder premise (verified below): the GitHub schedule
has still never fired — 5 warmer runs, all `workflow_dispatch`, 0
`scheduled`, observed at 10:46 UTC on a weekday, hours after the R16 C4
repair (cron re-registration, PR #181 merged 2026-10-05T06:12:59Z).

## Diagnosis — every documented cause checked, raw

1. **Fork-scheduled-disable excluded.** `GET /repos/prateekm1007/rishi-terminal`
   → `fork: false`, `default_branch: main`, `private: false`,
   `archived: false`. (GitHub disables scheduled workflows by default in
   forks — this repo is not a fork.)
2. **Actions enabled.** `GET .../actions/permissions` →
   `{"enabled": true, "allowed_actions": "all"}`.
3. **Workflow not disabled.** `GET .../actions/workflows` →
   `id=374326500 state=active | .github/workflows/quotes-warm.yml`
   (states like `disabled_manually` / `disabled_inactivity` absent;
   the 60-day-inactivity auto-disable cannot apply — the repo is
   hyperactive).
4. **Workflow file on the default branch with a valid 5-field cron**
   (scheduled workflows only register from the default branch):
   `schedule: - cron: "7-52/15 3-10 * * 1-5"` — minutes 7,22,37,52;
   hours 3-10; days 1-5 (Mon-Fri). Step-in-range syntax is valid POSIX
   cron and documented for Actions.
5. **Run history, whole repo:** `GET .../actions/runs?per_page=100` →
   events `{pull_request: 64, push: 20, deployment_status: 12,
   workflow_dispatch: 4}`; `GET .../actions/runs?event=schedule` →
   `total_count: 0` — **zero scheduled runs in the repo's entire
   history** (497 total runs).
6. **Warmer's own runs:** `GET .../actions/workflows/374326500/runs` →
   `total_count: 5`, events all `workflow_dispatch` (runs 1-5, latest
   2026-10-05T09:13:30Z success) — matches the founder's audit exactly.
7. **Documented delay behaviour:** GitHub documents that the schedule
   event "can be delayed during periods of high load" and to avoid
   `:00/:15/:30/:45`. The R16 C4 repair already moved minutes to
   :07/:22/:37/:52 AND re-registered the schedule (a default-branch
   change to the workflow file — the documented remedy). **22+ weekday
   slots have elapsed since 06:12Z (06:22 … 12:07 UTC), all empty.**
   Months of empty slots on the previous cron are not "delay"; the
   scheduler is not registering this repo's schedule at all.

**Conclusion: GitHub scheduling is conclusively unreliable for this
repository. Per the founder's E4 directive, the fallback applies: a
free external scheduler that calls the authenticated endpoint.**

## External scheduler (implemented, zero cost)

- `prateekm1007/rishi-warmer-scheduler` (private, same account): a
  minimal scheduled workflow, cron `"7-52/15 3-10 * * 1-5"` (the same
  NSE window), that POSTs the authenticated
  `https://rishi-terminal.vercel.app/api/ingest/quotes-warm` with the
  dedicated `QUOTES_WARM_SECRET` (Z2 exclusivity unchanged).
- Why GitHub-and-not-cron-job.org: cron-job.org's free plan requires an
  account with email verification, which this environment cannot
  receive; a second private repo on the SAME account is free (well
  inside the 2000 free Actions-minutes/month; ~7 runs/day at ~10 s),
  needs no new third-party account, and keeps the secret on the exact
  GitHub-Actions secret surface the main repo already uses for the same
  value. No NEW store was created; the deployment record was added to
  the Article VI vault and re-synced to the HF mirror (round-trip
  verified identical, commit `ae84dd0`).
- Secret handling: value registered via the repo's public-key sealed
  box (`PUT .../actions/secrets/QUOTES_WARM_SECRET` → 201); only HTTP
  statuses are logged by the workflow; the secret is never printed.
- **Mechanism proof (dispatch, not a scheduled run):** run 37307410774
  in the scheduler repo, 2026-10-05T12:08Z, conclusion success, job log
  `HTTP 200` from the endpoint.
- The main repo's in-repo schedule stays registered-but-dormant; if
  GitHub ever starts firing it, warming is idempotent (upserts into
  `quote_cache`), so double triggers are harmless.

## Acceptance status

| Gate | Status |
|---|---|
| 3 consecutive scheduled runs inside an NSE session (not dispatches) | **PENDING — first window Tue 2026-10-06 03:07-10:00 UTC** (Monday's session already closed at diagnosis time). Scheduler runs to be captured with run URLs + endpoint statuses appended to this file / the PR. |
| `select count(*) from quote_cache where observed_at > now() - interval '30 minutes'` ≥ 90% of 916 | **PENDING** — same window; coverage SQL to be pasted (the R17-S2 manual-dispatch cycle measured 78.1% fresh at 08:17Z today with ~16% upstream misses, covered by the next cycle — the scheduler's 15-min cadence is designed to clear it) |
| Fresh weekday fetch of `/stock/BANKBARODA` showing price with date, time and market state | **PENDING** — same window |
| Mechanism (auth + endpoint + scheduler) | **PROVEN** — dispatch run 37307410774 → HTTP 200 |

The scheduled-run gates are time-bound to the next NSE session and
cannot be honestly satisfied on a Monday afternoon (the endpoint gates
market hours). No live-acceptance claim is made before the SHA and the
controls agree.
