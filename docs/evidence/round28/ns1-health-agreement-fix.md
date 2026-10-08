# NS1 — first real scheduled run + the blocking health-agreement defect, root-fixed (round 28)

## The first REAL scheduled nightly_snapshot execution (2026-10-08)

The pre-registered runbook (`docs/evidence/round26/ns1-acceptance-runbook.md`)
fixed the first real scheduled run of the batched (#251) writer as the
2026-10-08 13:30 UTC cron fire. Read-only SQL (Supabase Management API;
sanctioned path) — the durable row, verbatim:

```text
job_name = nightly_snapshot
status   = success
records_out = 896
error_msg   = NULL
started_at  = 2026-10-08 13:53:21.351+00
finished_at = 2026-10-08 13:53:26.363+00
duration    = 5.012 s   (budget 60 s)
```

- **Real scheduled execution only** — the 13:53:21Z start matches the
  deterministic Vercel cron-lag signature of every prior weekday
  (13:53:21/22Z on Oct 1, 2, 5, 6, 7); nothing was dispatched manually.
- **Coverage** — `rishi_snapshots WHERE snapshot_date='2026-10-08'`:
  896 rows, 896 DISTINCT symbols, 0 null-consensus rows. `records_out`
  (896) reconciles exactly against the 896-symbol universe.
- **Honest semantics** — `status='success'` requires `errors==0 &&
  skipped==0` (route code); zero missing rows, zero silent skips.
- **Production SHA at the run** — `2d74e064b2c45d6630dc94220861231f57c1b037`
  (≥ `93c1dac`, the batched writer; C6 docs-only commits after it carry no
  redeploy obligation).

## The blocking leg: health disagreement (pre-registered condition)

The runbook requires: the fundamentals "no ingestion recorded yet" reason
must CLEAR once the first real `nightly_snapshot` row exists. Observed
live, minutes after the run:

```text
GET /api/health →
  lastFundamentalsIngestAt: null
  reasons: ["fundamentals: no ingestion recorded yet"]
```

Root cause (read-only audit): `/api/health` → `health_probe(...)` RPC →
`FUNDAMENTALS_INGEST_JOBS = ["ingest_financials"]` (lib/health/slo.ts).
`ingest_financials` has ZERO rows ever (G6 round-24: honestly
never-produced pending the founder's source decision), while the real
daily producer writes `nightly_snapshot`. The signal was structurally
dead: the reason could never clear. A blocking health/data-plane
disagreement — exactly the condition the runbook pre-registered.

## The fix (this PR)

`FUNDAMENTALS_INGEST_JOBS` gains the second real writer identity,
`nightly_snapshot`. The 96h staleness SLO now applies to a live signal.
The `ingest_financials` identity is preserved (positive control test).
Gate correction in its own PR with justification (rule 23) — no
threshold moved, no check weakened; the change ADDS visibility of real
ingestion.

Fail-first (rule 21), on pre-fix main:

```text
npx vitest run test/g6.healthSignal.test.ts
Test Files  1 failed (1)
Tests  2 failed | 13 passed (15)
```

GREEN with the fix:

```text
npx vitest run test/g6.healthSignal.test.ts
Test Files  1 passed (1)
Tests  15 passed (15)
```

Full battery on the fix tree:

```text
npx tsc --noEmit          → exit 0
npx eslint .              → 0 errors (283 warnings, ratchet holds)
npx vitest run            → Test Files 173 passed (173), Tests 1827 passed (1827)
npm run validate:encoding → passed
validateStocks            → all T12 gates passed
scoreParity               → 0 mismatches / 0 non-finite of 896
```

## NS1 verdict accounting

- Legs 1–4 (scheduled execution, ingestion_log row, coverage, honest
  semantics): **met** on the raw row above — the batched writer's first
  real scheduled proof.
- Leg 5 (health agreement): **failed on the day**, root-caused to a
  structurally dead signal, corrected here. After deploy, the reason
  must be absent and `lastFundamentalsIngestAt` must equal the
  13:53:26Z row on production — verified in the PR that carries this
  file's closeout pointer.
