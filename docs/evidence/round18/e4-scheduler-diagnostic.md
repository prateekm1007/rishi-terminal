# E4 follow-up — scheduler diagnostics before Tuesday's acceptance window

Companion to `e4-warmer-schedule.md` (never rewritten, per C10). This file
records the independent warmer-status check and the two off-window
diagnostics run on 2026-10-05 evening UTC, so the fallback scheduler's
first REAL test does not have to be Tuesday's acceptance window itself.

## 1. Independent status check (2026-10-05 ~14:13 UTC, Monday, market closed)

- Production `/api/health`: `status: degraded`, equities fresh 0/916,
  tiles 0/16 — the honest 30-minute-window decay after the last manual
  warm cycle (R17-S2 dispatch 09:13Z measured 78.1 % at 08:17Z; nothing
  warmed since). No defect: closed market, no scheduled runs yet.
- Scheduler repo `prateekm1007/rishi-warmer-scheduler`: private,
  default branch main, workflow `warm` state active, cron
  `7-52/15 3-10 * * 1-5`, secret `QUOTES_WARM_SECRET` configured, one
  workflow_dispatch run (37307410774, success, HTTP 200). Zero scheduled
  runs — expected: Monday's window (03:07-10:52 UTC) closed before the
  scheduler repo existed (12:06Z).

## 2. Diagnostic 1 — one-shot off-window slot (14:34 UTC): DID NOT FIRE

Purpose: observe whether the scheduler repo's schedule trigger fires at
all, BEFORE betting Tuesday's acceptance on it. A slot `34 14 * * *` was
added to `warm.yml` at 14:22Z (endpoint no-ops off-hours: 200 +
`skipped: "market closed"` — zero writes, zero risk).

Result at 14:50Z (16+ minutes past the slot): **no run created**. The
slot was then reverted (commit in the scheduler repo). Consistent with
the main repo's 0-for-497 schedule history — but a single miss with a
12-minute registration lead is not yet conclusive for THIS repo.

## 3. Diagnostic 2 — simplest-possible cron probe (`*/10 * * * *`): DID NOT FIRE

Isolated the remaining mechanical variable: the cron SYNTAX. A temporary
`.github/workflows/diagnostic.yml` (pure echo, no endpoint call, no
secret, zero side effects) with `*/10 * * * *` was committed to the
scheduler repo at 14:55Z. Slots 15:00, 15:10, 15:20, 15:30, 15:40,
15:50, 16:00 ... ALL passed with zero runs (checked repeatedly through
17:50Z; the repo's only run remains the 12:07Z dispatch). The
simplest-possible cron does not fire either — the syntax variable is
ELIMINATED.

## 3b. Conclusion (mechanical, pre-registered in §3)

**GitHub Actions scheduling does not fire for these repositories at
all.** The evidence set: (a) the main repo's 0-for-497 schedule history
before today; (b) 22+ empty in-window slots after the C4
re-registration; (c) the scheduler repo's one-shot 14:34Z slot missed;
(d) the `*/10` echo probe missed across 15+ consecutive slots; (e) the
single anomalous main-repo scheduled run at 14:56:29Z — hours outside
its own cron window (a delayed delivery, if anything) — which proves
the trigger is registered but the scheduler's delivery is unusable for
a 15-minute intraday cadence.

The external-scheduler fallback (a second GitHub repo, E4) inherits the
same broken scheduler. **The Tuesday acceptance gates (3 consecutive
scheduled runs, NSE timing, ≥90% coverage) cannot be satisfied by this
mechanism.**

Remaining zero-cost options, all blocked or gated:

1. cron-job.org / similar free cron SaaS — requires email-verified
   accounts this environment cannot receive.
2. Vercel Hobby cron — at most once per day; the design needs ~7/day.
3. Supabase `pg_cron` + `pg_net` HTTP POST — technically viable and
   reversible, but the bearer secret would live in the job SQL: a THIRD
   secret store, which rule 32 forbids without founder sanction.
4. The running HuggingFace staging Space (E1) hosting a scheduler
   process — mixes the staging experiment with a production responsibility.

**FOUNDER DECISION NEEDED: the warmer's scheduler.** Recommended
default, in order: (a) sanction the Supabase `pg_cron` job with the
secret held in a Supabase edge-function secret or the DB's own secret
table (an explicit rule-32 amendment for one entry), or (b) provision a
free cron SaaS account yourself (cron-job.org) and host only the
callback URL, or (c) accept a manual-dispatch warmer with an honest
degraded-freshness label in `/api/health` until a paid scheduler is
chosen. Until decided, the `*/10` echo probe stays in the scheduler
repo (it costs ~nothing) so the founder can see the firing behavior
directly; it is deleted after the decision.

The Tuesday protocol in §4 remains the acceptance gate for WHATEVER
mechanism is chosen — it is mechanism-agnostic (runs + coverage +
health agreement + live page proof).

## 4. Tuesday acceptance protocol (unchanged, mechanical)

First NSE window: Tue 2026-10-06 03:07-10:52 UTC. For each scheduled run:
capture the run URL + endpoint status. After ≥3 consecutive scheduled
runs inside the window:

1. `select count(*) from quote_cache where observed_at > now() - interval
   '30 minutes'` ≥ 90 % of 916 (Supabase query API, raw output pasted).
2. `/api/health` `quoteCache.equities.fresh/total` agrees with the SQL
   count (same window).
3. Fresh weekday fetch of `/stock/BANKBARODA` shows a price with date,
   time and market state (positive control, C10).
4. Append everything to this file / the round evidence; a manual
   `workflow_dispatch` does not count for the 3-run gate.
