# NS1 nightly snapshot — production acceptance runbook (round 26)

Status: `#251` (batched snapshot completion) merged `93c1dac` and live in
production (`/api/version` = `93c1dac...`, verified 2026-10-07T22:19Z).
The 2026-10-07 13:30 UTC scheduled run executed the PRE-`#251` writer —
durable records confirm the defect (ZERO `nightly_snapshot` rows in
`ingestion_log` for Oct 7 and every prior day; read-only SQL,
Management API, 2026-10-07T22:30Z). The FIRST real scheduled run of the
batched implementation is therefore the **2026-10-08 13:30 UTC** cron
fire (`30 13 * * 1-5`, `/api/ingest/snapshot`). This runbook
pre-registers the verification so the executing session cannot move the
goalposts (C5/C10; founder round-26 direction 24).

## What counts (fixed before the run)

- **Real scheduled execution only**: the run must be the Vercel cron
  fire — no manual dispatch, no warm-path invocation. Evidence: the
  run's own durable records + the cron schedule; manual `/api/ingest/*`
  calls by the session are forbidden during the window.
- **`ingestion_log` row**: exactly one `job_name = 'nightly_snapshot'`
  row with `started_at` within the 13:30 UTC fire minute window and
  `finished_at - started_at` inside the 60 s function budget.
- **Coverage**: `records_out` + the artifact's own counts must reconcile
  against the 896-symbol universe. `success` requires the full universe
  processed; null-consensus skips must appear as honest `partial`
  semantics (skip counted, never silent) per the `#251` contract.
- **No missing-row silent success**: `records_in`/`records_out`/error
  fields must be consistent with the actual table deltas; a `success`
  row with zero-outcome counts on a full universe is a DEFECT (rule 3).
- **Health agreement**: `/api/health` reflects the snapshot state
  honestly (the fundamentals "no ingestion recorded yet" reason must
  CLEAR once the first real `nightly_snapshot` row exists; if it does
  not, that is a blocking health/data-plane disagreement — direction 25).

## Execution procedure

1. Bind: record `/api/version` (must be ≥ `93c1dac`, the batched
   writer).
2. Wait for the 13:30 UTC fire; within minutes, run the read-only SQL
   (Management API, the roSql guard):
   `SELECT job_name, status, records_in, records_out, error_msg,
   started_at, finished_at FROM ingestion_log WHERE job_name =
   'nightly_snapshot' ORDER BY started_at DESC LIMIT 3`.
3. Reconcile coverage against the universe (896) and the budget against
   60 s. Record the row verbatim (rule 25) into
   `docs/evidence/round26/ns1-production-proof.md` with the canonical
   verdict.
4. If the run fails/partial: attach the raw row + the honest
   classification; NS1 stays OPEN (no partial credit, C6).

## Guardrails

- No manual snapshot dispatch during the window (the cron IS the test).
- No threshold movement: 60 s budget and 896 universe are fixed.
- The E4 read-only observer remains untouched; this proof uses its own
  read-only SQL, never the warmer path.
