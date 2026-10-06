# E4 follow-up — warmer SESSION evidence (2026-10-06, mechanism not scheduler)

The founder's directive 9: "Do not claim 'latest prices' until the
production quote-cache mechanism has actual session evidence." Captured
during the live NSE session of Tue 2026-10-06 (session 03:45-10:00 UTC),
while the SCHEDULER decision remains FOUNDER DECISION NEEDED
(e4-scheduler-decision.md — unchanged by this file).

## Scheduled runs in the window (the scheduler question — still broken)

- Main repo quotes-warm: ZERO event=schedule runs today; the in-window
  slots 03:07/03:22/03:37/03:52/... all passed empty (workflow active,
  default branch, valid cron — the same 0-for-history state the decision
  packet records).
- Scheduler repo: the `*/10` echo probe fired ONCE at 02:11:00Z (its
  second-ever fire; ~41 slots elapsed since 2026-10-05 14:55Z with one
  delivery). The `warm` workflow (7-52/15 3-10) has still never fired
  on schedule.

## Mechanism evidence (manual workflow_dispatch, in-session — sanctioned)

Dispatch at 05:43:52Z (run 37419987248, event=workflow_dispatch):
completed success. All six slices HTTP 200 (raw logs in the run).

After the cycle:

```
$ curl -s https://rishi-terminal.vercel.app/api/health
{"status":"degraded","quoteCache":{"equities":{"fresh":750,"total":916,
 "coverage":0.819},...},"reasons":["prices: no ingestion recorded yet",...]}

$ curl -s -X POST .../api/prices/batch -d '{"symbols":["BANKBARODA"]}'
{"prices":{"BANKBARODA":{"price":233.84,"status":"LIVE",
 "observedAt":"2026-10-06T05:49:00.000Z","source":"yahoo-bulk"}},
 "market":{"open":true,"freshness":"live-delayed","sessionDate":"2026-10-06"}}
```

- Upstream refreshes are REAL: BANKBARODA observed 05:49:00Z (upstream's
  own timestamp, not the local clock), status LIVE, in-session.
- Coverage after one cycle + organic traffic: 750/916 = 81.9% fresh in the
  30-minute window — BELOW the 90% acceptance bar (the gap is the honest
  Yahoo-miss set plus window decay between cycles; a 15-minute cadence
  closes most of it, which is exactly what the scheduler decision gates).
- Failure behavior: SANDUMANG-class symbols return explicit UNAVAILABLE
  (honest miss, rendered as em dash) — never a zero or a stale seed price.
- `/api/health` agrees with the served state and stays honestly
  `degraded` while coverage is under its thresholds.

## What this does and does not close

- It closes the MECHANISM question: the endpoint, the batch sweep, the
  shared cache, the health surface, and the honest-miss semantics all
  work during a real session, with upstream observation timestamps.
- It does NOT close the SCHEDULER question (still FOUNDER DECISION
  NEEDED, options + recommended default unchanged in the decision packet)
  and does not satisfy the 3-consecutive-SCHEDULED-runs gate (a manual
  dispatch explicitly does not count, per the packet's own rule).
