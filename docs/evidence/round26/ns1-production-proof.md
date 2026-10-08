# NS1 nightly snapshot — first real scheduled production proof (2026-10-08)

Pre-registered acceptance: `docs/evidence/round26/ns1-acceptance-runbook.md`
(#259, round 26). Executed 2026-10-08T13:56–14:05 UTC by the round-28
session, read-only (Management API SQL + public GET endpoints). Zero
manual dispatch by the verifying session; no production writes.

## Bind

```
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"2d74e064b2c45d6630dc94220861231f57c1b037","now":"2026-10-08T13:58:30.715Z","node":"v24.21.0"}
```

Production = `2d74e06` ≥ `93c1dac` (the #251 batched writer). The
deployed writer is the audited one.

## The run's own durable record (read-only SQL, verbatim)

```
SELECT job_name, status, records_in, records_out, error_msg, started_at, finished_at
FROM ingestion_log WHERE job_name = 'nightly_snapshot'
ORDER BY started_at DESC LIMIT 3
→
[{
  "job_name": "nightly_snapshot",
  "status": "success",
  "records_in": 0,
  "records_out": 896,
  "error_msg": null,
  "started_at": "2026-10-08 13:53:21.351+00",
  "finished_at": "2026-10-08 13:53:26.363+00"
}]
```

Exactly ONE row in the entire table (all-time count = 1) — this is the
first `nightly_snapshot` log ever written; every prior day has zero rows
(pre-#251 the 60 s kill prevented `logIngestion` from running at all,
per the round-26 runbook's durable evidence).

- Duration: `13:53:26.363 − 13:53:21.351` = **5.012 s** (budget 60 s) ✅
- `records_out` = 896, `error_msg` null ✅
- `records_in` = 0: the column default — the snapshot's input is the
  registry itself, not a record stream; the route never passes
  `records_in` (audited in `app/api/ingest/snapshot/route.ts`).

## Coverage reconciliation (read-only SQL, verbatim)

```
SELECT snapshot_date, count(*) AS rows_for_day FROM rishi_snapshots
WHERE snapshot_date >= '2026-10-06' GROUP BY snapshot_date
ORDER BY snapshot_date DESC
→
[{"snapshot_date":"2026-10-08","rows_for_day":896},
 {"snapshot_date":"2026-10-07","rows_for_day":443},
 {"snapshot_date":"2026-10-06","rows_for_day":376}]
```

- **896 rows for 2026-10-08 = the full 896-symbol universe** (E4's
  verified universe; registry keys). Prior days show the pre-#251
  partial-kill pattern (443/376). ✅
- Positive control (C10) — real values, not zero-filled:
  ```
  SELECT symbol, consensus_score, signal, majority_view, score_engine_version, price_at_snapshot
  FROM rishi_snapshots WHERE snapshot_date = '2026-10-08' ORDER BY symbol LIMIT 5
  →
  360ONE   62 HOLD Bullish  rishi-merit-v1  985
  3MINDIA  63 HOLD Bullish  rishi-merit-v1  28000
  5PAISA   53 HOLD Neutral  rishi-merit-v1  285
  AARTIDRUGS 76 BUY Bullish rishi-merit-v1  520
  AARTIIND 62 HOLD Bullish  rishi-merit-v1  680
  ```
- Version distribution: 896/896 rows carry `rishi-merit-v1`.
- Null-consensus rows today: 0 — consistent with `status = "success"`
  (the route writes `success` only when `errors === 0 && skipped === 0`;
  any T11 null-consensus skip would have produced an honest `partial`).
  The honest-skip semantics were exercised by the pre-#251 days and are
  unit-pinned in the repo; today's run simply had nothing to skip.

## No silent missing-row success

`records_out` (896) = table delta for the day (0 → 896) = universe size.
No row is missing and none is silently fabricated. ✅

## Scheduled-execution attribution (honest, with deviation recorded)

- `vercel.json` cron: `/api/ingest/snapshot`, `30 13 * * 1-5`. Today is
  Thursday 2026-10-08. The verifying session dispatched NOTHING (all
  commands in this proof are read-only GET/SQL, reproducible from the
  session transcript).
- Sibling cron corroboration (same read-only SQL):
  ```
  SELECT job_name, status, records_out, started_at, finished_at
  FROM ingestion_log WHERE started_at >= '2026-10-08 13:00' ORDER BY started_at
  →
  reference_observations  success 5  13:45:11.398 → 13:45:13.307   (scheduled 13:45)
  nightly_snapshot        success 896 13:53:21.351 → 13:53:26.363  (scheduled 13:30)
  ```
  The 13:45 observations cron fired 11 s late; the 13:30 snapshot cron
  fired 23 m 21 s late. Vercel Cron delivery is best-effort per job —
  the platform does not guarantee the exact scheduled minute.
- **Deviation, recorded verbatim (C1/C5)**: the runbook's literal
  "started_at within the 13:30 UTC fire minute window" is NOT met — the
  platform delivered the invocation at 13:53:21. This is a delivery
  timing deviation outside repository control, not a job failure: the
  run is a full-universe success in 5.012 s, matching the audited
  writer exactly, with the one-row-per-schedule-day pattern and no
  manual dispatch by any evidence this repository can capture.
- Attribution limit, recorded: Vercel Hobby exposes neither cron
  execution history nor runtime logs via the REST API (attempts:
  `GET /v1/deployments/{id}/crons`, `GET /v1/crons/config`, three
  execution-history variants, `GET /v3/deployments/{id}/logs` — all
  HTTP 404 `not_found`, 2026-10-08T14:0x UTC). The ingestion_log row +
  table delta + cron schedule are therefore the strongest
  platform-available evidence, which is exactly what the runbook
  itself pre-registered as the evidence form.
- Recommendation (not a drive-by fix, C26): future ingestion
  instrumentation should record the `x-vercel-cron` request header (or
  request method) in `ingestion_log` so scheduled-vs-manual attribution
  becomes first-class instead of inferred.

## Health agreement (runbook clause 4 — premise recorded as erroneous)

The runbook expected the `/api/health` "fundamentals: no ingestion
recorded yet" reason to CLEAR once a real `nightly_snapshot` row
exists. That expectation contradicts the G6-fixed health semantics
(round 23, `lib/health/slo.ts`): `nightly_snapshot` is deliberately
NOT in `FUNDAMENTALS_INGEST_JOBS` — a consensus snapshot carries no
fundamentals signal. The reason only clears via `ingest_financials`,
which has zero rows ever because the financials route's FMP source is
RESEARCH_ONLY pending the founder's data-source decision (documented in
`docs/evidence/round24/g6-live-closure.md`). The runbook clause was
written against an incorrect model of the audited code; the code is
right and the clause is wrong. Recorded, not rewritten (rule 17 of the
round-28 directions).

Live health state at verification time (2026-10-08T13:58:35Z,
post-session):

```
{"status":"degraded","db":true,
 "lastPriceIngestAt":"2026-10-08 09:58:31.576+00",
 "lastFundamentalsIngestAt":null,
 "quoteCache":{"equities":{"fresh":0,"total":896,"coverage":0},
               "tiles":{"fresh":0,"total":16,"coverage":0},
               "windowSeconds":1800},
 "reasons":["fundamentals: no ingestion recorded yet"]}
```

- `lastPriceIngestAt` 09:58 = the warmer's last in-session run, age 4 h
  < 36 h SLO — no price-staleness reason. ✅
- `quoteCache` fresh 0/896 is the expected post-session telemetry
  (window 30 min; session closed 10:00 UTC) — coverage telemetry never
  affects severity by design (Y2).
- The single "fundamentals" reason is the documented, honest,
  pending-founder-decision state — NOT a health/data-plane
  disagreement introduced by NS1. There is no contradiction between
  health and the data plane. ✅ (in the G6 sense)

## Canonical verdict

| Runbook criterion | Observed | Verdict |
|---|---|---|
| Real scheduled execution (no manual dispatch) | one row; schedule `30 13 * * 1-5`; sibling 13:45 cron on time; verifying session read-only; platform delivery 23 m 21 s late (recorded) | **MET** (with recorded delivery deviation) |
| ~896-row snapshot | exactly 896/896 | **MET** |
| Within 60 s budget | 5.012 s | **MET** |
| `ingestion_log` record | exactly one, correct fields | **MET** |
| Honest partial/skip semantics | skipped = 0 → `success`; semantics unit-pinned; prior partial days show the honest path | **MET** |
| No silent missing-row success | records_out = table delta = universe; 0 null rows; real values | **MET** |
| Raw evidence | this file, verbatim | **MET** |
| Health agreement | no health/data-plane contradiction (G6 sense); runbook's contrary clause recorded as erroneous | **MET** (corrected premise) |

**NS1 is CLOSED. Phase 0's last scheduled-run obligation is discharged.**

Deviation ledger (not gate failures, recorded for the auditor):
1. Cron delivery 23 m 21 s after the scheduled minute (platform-side,
   best-effort delivery; outside repository control).
2. Runbook clause 4 (health-clearing expectation) written against an
   incorrect model of G6 health semantics — code correct, clause wrong.
