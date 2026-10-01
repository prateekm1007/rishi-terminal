# Post-mortem — reference observations starved the nightly snapshot

**Date of incident:** 2026-09-30 (UTC)
**Date of detection:** 2026-09-30, during manual verification of the T61 deploy
**Severity:** data pipeline stall (no user-facing outage; the score history
for the affected window is incomplete)
**Fixed in:** commit `afd8af8` (route split), commit `96486f5` (docs
correction)
**Status:** resolved; prevention items partially open (see below)

## What failed

Phase 6 (T61) added "reference observation" capture — persisting our own
daily observations for storage-entitled sources (FRED yields, FX reference
rates) — INSIDE the existing nightly consensus snapshot route
(`/api/ingest/snapshot`), so a single cron invocation ran both jobs
sequentially.

The combined workload exceeded the serverless function's 60 s
`maxDuration` budget. Observed live: a manual trigger of the route
returned an **empty body at 60.6 s** — the function was killed mid-run by
the platform.

The kill had two effects:

1. **The consensus snapshot was starved.** The snapshot writes
   (`rishi_snapshots` — the score history the immutable forward track
   record, S2-07, will be built on) did not complete for the window; a
   function killed at the platform boundary leaves whatever partial work
   happened before the kill and nothing after.
2. **The failure was invisible to the pipeline's own telemetry.** The
   ingestion-log entry is written at the END of the run; a killed
   function writes no entry, so `/api/health` and `pipelineStatus`
   reported nothing wrong for that window. The failure mode is "silent
   absence of a row", not "an error row".

Root cause: **one route, two jobs, one shared budget.** Upstream latency
in the observations half (FRED/NSE-class endpoints, seconds each) could
consume the entire budget before the snapshot half ran. The route design
coupled unrelated failure domains.

## Detection

By a human, manually: the empty-body-at-60.6 s observation during
verification of the deploy. No alert fired, because (a) the killed
function logged nothing and (b) freshness alerting keyed on
`ingestion_log` (see `/api/health`) saw a "no row yet" state that is
indistinguishable from "job not due yet" within the same day.

This is a detection gap, not just a code bug — see Prevention.

## The fix (commit afd8af8)

One job, one budget:

- Observation capture moved to its own route,
  `/api/ingest/observations` (cron 13:45 UTC, weekdays — 15 min after
  the snapshot's 13:30 UTC slot), with its own 60 s `maxDuration`,
  its own `ingestion_log` entry (`job_name = reference_observations`),
  and the same `CRON_SECRET` gate.
- `/api/ingest/snapshot` reverted to consensus-only work.

Post-fix live evidence (production, 2026-09-30):

```
ingestion_log:
  job_name=reference_observations  status=success  records_out=5
  started_at=18:13:15  finished_at=18:13:17        (~2.2 s wall)

rishi_snapshots: 385 rows for 2026-09-30
```

Both jobs complete independently; neither can consume the other's
budget.

## Prevention

Done:

- **One job, one budget** is now the rule for cron routes (stated in the
  fixing commit and in `docs/DATA_PROVIDER_MATRIX.md`, T61 section).
- **The split also fixed the telemetry blind spot for the observations
  job**: it now writes its own `ingestion_log` row, so its absence IS
  detectable.
- N8 (round 3) memoized `/api/health`; its freshness inputs are the
  `ingestion_log` rows the split made honest.

Open (owner / where tracked):

1. **"Silent absence" detection.** A killed snapshot route still writes
   no error row. The honest signal is "expected row missing after the
   scheduled window" — a dead-man's-switch check, not per-job logging.
   → Roadmap D1-10 (SLOs and alerting) once E6-05 lands. Until then,
   `npx tsx scripts/pipelineStatus.ts` after the cron window is the
   manual check.
2. **Budget headroom monitoring.** A job that grows to 50 s passes today
   and dies tomorrow. When E6-05 (observability) lands, the
   observations/snapshot wall times belong in the metrics with an alert
   well below 60 s.
3. **Route-level maxDuration review.** Any future cron route that adds a
   second upstream phase must justify why the phases share a budget —
   PR review checklist item, tracked informally until L5-06 writes the
   review checklist down.

## Timeline

| UTC (2026-09-30) | Event |
|---|---|
| ~17:xx | T61 deployed with combined route (snapshot + observations) |
| ~18:0x | Manual trigger returned empty body at 60.6 s — incident observed |
| 18:08 | `afd8af8` — route split, own budget + own log entry |
| 18:13 | Live verification: observations job success (2.2 s), snapshot intact (385 rows) |
| 18:13 | `96486f5` — DATA_PROVIDER_MATRIX T61 section corrected |
