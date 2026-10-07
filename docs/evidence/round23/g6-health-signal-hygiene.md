# G6 — health ingest-signal repair + hygiene locks (round 23)

Founder G-series item: "G6 hygiene/clean-server fallback/PR hygiene". The
#188 (R4-07) disposition was closed DEFERRED by the parallel session
(2026-10-07 06:32Z, rationale on the PR); this PR carries the remaining
verifiable G6 items: the dead health signal and the ratchet lock.

## The defect (verified on production 2026-10-07 ~06:29Z)

`/api/health` reported `"status": "degraded"` with reasons
`"prices: no ingestion recorded yet"` / `"fundamentals: no ingestion
recorded yet"` — permanently — while the pg_cron warmer held 815/916
equities fresh and served live observations. Root cause: the SLO job-name
lists named jobs NO route writes.

Actual `logIngestion` callers in the tree (verified by source scan):

| route | job_name | carries |
|---|---|---|
| /api/ingest/snapshot | nightly_snapshot | consensus SCORE snapshots |
| /api/ingest/observations | reference_observations | FRED yields, FX reference |
| /api/ingest/financials | ingest_financials | fundamentals (FMP) |
| /api/ingest/quotes-warm | (logged nothing) | the actual price mechanism |

vs the pre-G6 lists: `PRICE_INGEST_JOBS = ["ingestPrices"]` (no writer),
`FUNDAMENTALS_INGEST_JOBS = ["ingestQuarterly","ingestFundamentals"]`
(no writer — the real name is `ingest_financials`). So
`lastPriceIngestAt`/`lastFundamentalsIngestAt` were structurally null and
the severity could never recover. The E4 acceptance point "/api/health
agreement" cannot close against a dead signal.

## Fix

1. `app/api/ingest/quotes-warm/route.ts` — every non-skipped slice logs a
   `quotes_warm` ingestion row: `records_out` counts upstream WRITES only
   (fresh-cache serves are not new data), misses make the row `partial`,
   and the off-session no-op path deliberately logs NOTHING (a
   zero-records "ingestion" would keep the price signal green through a
   weekend of no-ops — Rule 3).
2. `lib/health/slo.ts` — the lists name the real jobs
   (`["quotes_warm"]`, `["ingest_financials"]`); header comment records
   why. The proposed 36h/96h thresholds are untouched (founder
   confirmation pending per the file's own note — the coder never
   silently picks a number).
3. `test/health.test.ts` — fixtures renamed to the real job names
   (`quotes_warm`/`ingest_financials`); every assertion's intent is
   unchanged (fresh→ok, stale→degraded, never-produced→null reason,
   payload-shape pins).
4. `test/y2.quoteWarm.test.ts` — ingestion mock added in the file's
   existing pattern; pins: no-op logs nothing, forced run logs exactly
   one row with honest `records_out`/`status`.
5. `eslint-ratchet.json` — 284 → 283 (locks the G4-session improvement;
   `npm run lint:ratchet -- --update-baseline`, mechanism-written).

## Fail-first (C5)

On pre-fix sources (stash-verified, 2026-10-07):

```
$ npx vitest run test/g6.healthSignal.test.ts
      Tests  11 failed | 1 passed (12)
   FAIL ... PRICE_INGEST_JOBS includes the warmer's job name
   FAIL ... FUNDAMENTALS_INGEST_JOBS includes the financials route's job name
   FAIL ... a recent quotes_warm row clears the price reason
   FAIL ... a recent ingest_financials row clears the fundamentals reason
   FAIL ... the warmer records a quotes_warm ingestion row
   (the 1 pass is the honest empty-state test — green by design pre and post)
```

The first full run also exposed a real integration break the fix caused:
`test/y2.quoteWarm.test.ts` failed 12/12 (`Missing Supabase URL or
service-role key`) because the warmer now imports logIngestion — fixed by
mocking it in the test (the same pattern the file uses for every other
route dependency), with the logging contract pinned as new assertions.

## Post-fix battery (raw, this exact tree)

```
$ npx vitest run test/y2.quoteWarm.test.ts test/g6.healthSignal.test.ts test/health.test.ts
      Tests  39 passed (39)
$ npx vitest run                   → Test Files 161 passed (161); Tests 1631 passed (1631)
$ npx tsc --noEmit                 → exit 0
$ npx eslint .                     → 0 errors, 283 warnings
$ node scripts/eslintRatchet.mjs   → Baseline: 283 / Ratchet holds.
$ npm run build                    → exit 0
$ npm run validate:encoding        → ✅ no mojibake
```

## Clean-server verification (the G6 "clean-server" item)

`scripts/ci/withCleanServer.mjs` exercised end-to-end on this tree
(2026-10-07 07:07Z): clean build → fresh server → health gate → wrapped
command exit 0 → teardown clean. Playwright config keeps
`reuseExistingServer: false` (zombie adoption impossible). On a clean
server with nothing ingested, health stays honestly `degraded` with both
"no ingestion recorded yet" reasons — pinned by test.

## Live expectation after merge + one warmer cycle

With the warmer logging and the lists aligned, `/api/health` should flip
to `ok` (or carry only the honest fundamentals-staleness reason until the
financials ingest next runs), and `lastPriceIngestAt` should track the
last non-skipped warmer slice — the E4 "health agreement" signal becomes
real. Verified in the post-merge C6 step of this PR.
