# E4 — warmer scheduler: the decision packet (FOUNDER DECISION NEEDED)

Round-18 item E4, consolidated per the founder's 2026-10-05 direction:
"Produce the exact decision packet with: current GitHub scheduler evidence;
external scheduler evidence; operational cost/availability implications;
recommended default; explicit FOUNDER DECISION NEEDED state. Continue all
technically unblocked work while that decision is pending."

Companion diagnostics (never rewritten, per C10):
`e4-warmer-schedule.md` (diagnosis + external scheduler build) and
`e4-scheduler-diagnostic.md` (off-window probes + §3b conclusion). This
file is the DECISION PACKET — everything the founder needs to choose, in
one place, with the evidence inline.

## The requirement being scheduled

The quote warmer must run every ~15 minutes inside the NSE session window
(cron `7-52/15 3-10 * * 1-5` UTC = 08:37–16:22 IST, Mon–Fri), calling
`POST /api/ingest/quotes-warm` with the dedicated `QUOTES_WARM_SECRET`
(Z2), so that `quote_cache` stays ≥90 % fresh (916 equities, 30-minute
window) and `/api/health` reports `ok` during market hours. Off-hours the
endpoint no-ops (`200, skipped: "market closed"`) — zero writes, zero risk.

## 1. Current GitHub scheduler evidence — BROKEN for this cadence

Main repo (`prateekm1007/rishi-terminal`), verified 2026-10-05:

- `0` scheduled runs in the repo's ENTIRE run history (497 runs at audit
  time; events were pull_request/push/dispatch only) — while the schedule
  trigger was registered and active (`quotes-warm.yml`, state=active).
- 22+ consecutive in-window weekday slots elapsed empty after the C4
  cron re-registration (PR #181, merged 06:12Z 2026-10-05).
- ONE anomalous scheduled run finally appeared 2026-10-05T14:56:29Z —
  hours OUTSIDE its own 03–10 UTC window. The founder's direction names
  this correctly: "an execution at 14:56 UTC despite the intended 03–10
  UTC window, which is materially late." It proves the trigger is
  registered but delivery is unusable for a 15-minute intraday cadence.

External-scheduler repo (`prateekm1007/rishi-warmer-scheduler`, private,
same account), verified 2026-10-05 evening:

- One-shot off-window slot `34 14 * * *` committed 14:22Z → **missed**.
- Simplest-possible probe `*/10 * * * *` (pure echo, no secret, no side
  effects) committed 14:55Z → slots 15:00…21:40 ALL missed, then exactly
  ONE fire at **21:56:44Z** (run 37379232556, event=schedule, success,
  https://github.com/prateekm1007/rishi-warmer-scheduler/actions/runs/37379232556).
  ~41 slots elapsed, one delivered: a ~2.4 % delivery rate, 6+ hours late.
  The cron-syntax variable is ELIMINATED (`*/10` is the simplest form that
  exists).
- Conclusion (pre-registered in the diagnostic §3b): **GitHub Actions
  scheduling does not reliably fire for these repositories at all.** The
  external scheduler inherits the same broken scheduler — it is not a
  fallback, it is the same failure mode in a second repo.

## 2. What is actually working

- The ENDPOINT is healthy and battle-tested: every warmer execution that
  was dispatched manually succeeded (5 `workflow_dispatch` runs on the
  main repo, all success; R17-S2 dispatch 09:13Z measured 78.1 % coverage
  at 08:17Z; forced-dispatch acceptance in Round 14 A4).
- The acceptance gates are mechanism-agnostic and already written
  (§4 of the diagnostic): ≥3 consecutive scheduled runs inside a real NSE
  window + SQL ≥90 % coverage + `/api/health` agreement + a fresh
  `/stock/BANKBARODA` price. A manual dispatch does NOT count for the
  3-run gate.
- Tuesday 2026-10-06 window (03:07–10:52 UTC): at packet time the window
  had not started. Zero in-window scheduled runs so far is EXPECTED, not
  new evidence; the `*/10` echo probe remains in the scheduler repo (costs
  ~nothing) so the founder can observe firing behavior directly during
  the window.

## 3. Operational cost/availability implications (all known options)

| Option | Cost | Availability risk | Blocker |
|---|---|---|---|
| (a) Supabase `pg_cron` + `pg_net` HTTP POST on the existing database | $0 (already paid) | Low — same region as the quote cache it warms; 7–28 runs/day, ~10 s each | The bearer secret must live in the job SQL or an edge-function secret — a THIRD secret store, which rule 32 forbids without founder sanction |
| (b) Free cron SaaS (cron-job.org) hosting only the callback URL | $0 | Low-medium — third-party uptime; the endpoint itself fails closed on a bad bearer | Requires an email-verified account this environment cannot receive — founder must provision it (5 minutes) |
| (c) Vercel Hobby cron | $0 | None | At most ONCE PER DAY — the design needs ~7/day intraday. NOT viable without a paid plan (founder money) |
| (d) The running HuggingFace staging Space hosting a scheduler process | $0 | Medium — sleeps on free tier; mixes a staging experiment with a production responsibility | Architecturally opposed to the staging/prod separation E1 established |
| (e) Status quo: manual `workflow_dispatch` + honest degraded label | $0 | Certain degradation — `/api/health` stays `degraded` outside manual warms (current live state: 0/916 fresh, honestly labelled) | None — this IS today's state |

Current live state captured for this packet (2026-10-05T23:51:25 UTC,
market closed, no scheduled runs):

```
$ curl -s https://rishi-terminal.vercel.app/api/health
{"status":"degraded","db":true,"quoteCache":{"equities":{"fresh":0,"total":916,"coverage":0},
 "tiles":{"fresh":0,"total":16,"coverage":0}},"reasons":["prices: no ingestion recorded yet",...]}
```

## 4. Recommended default (in order)

1. **(a) Supabase `pg_cron`** — technically viable today, reversible,
   keeps the warm path in the same infrastructure as the cache it fills,
   and the secret-exposure question is bounded (one bearer, one endpoint,
   revocable by rotation). It requires an explicit rule-32 amendment for
   ONE additional secret store entry (Supabase edge-function secret or
   the database's own secrets table).
2. **(b) cron-job.org** if the founder prefers zero new secret stores —
   the founder provisions the account and pastes the callback URL; the
   secret never leaves GitHub Actions' current store except to the
   endpoint, same as today.
3. **(e) honest degraded state** if neither is acceptable now — the
   product already labels freshness truthfully; this is a product-quality
   cost (stale prices during IST market hours), not an honesty cost.

## 5. Decision state

**FOUNDER DECISION NEEDED: the warmer's scheduler.**

- Choice required: (a) sanction Supabase `pg_cron` + one rule-32
  amendment for the secret store, or (b) provision a cron-job.org account
  and host the callback, or (c) accept the manual-dispatch + degraded
  label until a paid scheduler is chosen.
- Until decided: no speculative scheduler implementation (per the
  founder's standing direction — do not silently replace this with
  another unproven mechanism); technically unblocked work continues
  (C5 closure done this session, E5 AI reliability in flight).
- Whichever mechanism is chosen must pass the §4 acceptance protocol of
  `e4-scheduler-diagnostic.md` in a REAL NSE session (≥3 consecutive
  scheduled runs, ≥90 % coverage, health agreement, live price positive
  control) before the warmer is called healthy. An off-hours
  `200 / market closed` proves nothing about session coverage.
- The `*/10` echo probe in the scheduler repo is deleted after the
  decision is implemented.
