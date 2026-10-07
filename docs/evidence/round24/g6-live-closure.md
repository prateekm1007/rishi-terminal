# G6 — live closure of the health ingest signal (round 24, post-#240)

PR #240 (`fix/g6-health-signal`, merged 2026-10-07T13:05:57Z as `248161d`)
changed `/api/health` to track the REAL writers (`quotes_warm`,
`ingest_financials`) and deployed AFTER the Oct-7 NSE session closed — so no
scheduled warmer cycle had run against the new logging code when the founder's
round-24 directions landed. This file records the post-merge live verification
(C6), executed the same day through the warmer route's own designed off-hours
verification path (`force=1` with the same Bearer secret — the route comment
and the round-14 A4 / B-21 remediation precedent; the scheduled in-session
proof re-runs tomorrow with the observer below).

## 1. Empty state is honestly degraded (BEFORE, live 2026-10-07T13:56:27Z)

```
GET /api/health → 200
{"status":"degraded","db":true,
 "lastPriceIngestAt":null,"lastFundamentalsIngestAt":null,
 "quoteCache":{"equities":{"fresh":0,"total":896,"coverage":0},
               "tiles":{"fresh":0,"total":16,"coverage":0},
               "windowSeconds":1800},
 "reasons":["prices: no ingestion recorded yet",
            "fundamentals: no ingestion recorded yet"]}
```

Captured before any slice ran (the first attempt's BEFORE snapshot — the
attempt was killed by a sandbox process teardown after slice 0; its slice-0
log row is the 13:56:38 row in §3).

## 2. A real quotes_warm cycle clears the price reason (AFTER, live 14:08 UTC)

`node scripts/g6-forced-warm-verification.mjs` (sandbox, secret via env; 6
slices, force=1, paced 75 s — the workflow's own pacing). Slice responses
(raw, all HTTP 200):

```
slice 0: {"slice":0,"of":6,"universe":896,"inSlice":150,"equities":{"upstreamWrites":0,"served":145,"misses":5},"tiles":{"upstreamWrites":0,"served":12,"misses":4},"forced":true,...}
slice 1: {"slice":1,...,"equities":{"upstreamWrites":0,"served":137,"misses":13},...}
slice 2: {"slice":2,...,"equities":{"upstreamWrites":0,"served":141,"misses":8},...}
slice 3: {"slice":3,...,"equities":{"upstreamWrites":0,"served":136,"misses":13},...}
slice 4: {"slice":4,...,"equities":{"upstreamWrites":0,"served":134,"misses":15},...}
slice 5: {"slice":5,...,"equities":{"upstreamWrites":0,"served":142,"misses":7},...}
```

Served total 835, misses 61 — **the misses match the G5 residual census's 61
unavailable exactly** (docs/evidence/round24/g5-residual-disposition.md), a
clean cross-validation of the census against the warmer's own accounting.

`GET /api/health` AFTER (14:08:16Z, past the 12 s memo window):

```
{"status":"degraded","db":true,
 "lastPriceIngestAt":"2026-10-07 14:08:01.012+00","lastFundamentalsIngestAt":null,
 "quoteCache":{"equities":{"fresh":0,"total":896,"coverage":0},...},
 "reasons":["fundamentals: no ingestion recorded yet"]}
```

- The **price reason CLEARED** and `lastPriceIngestAt` tracks the last
  non-skipped slice — the G6 live expectation from
  docs/evidence/round23/g6-health-signal-hygiene.md, now verified on the
  deployed build.
- `quoteCache.equities.fresh` stays **0/896** — honest: off-session the
  provider observation clock is the session close (~10:00Z), outside the
  30-minute window. The INGESTION signal and the COVERAGE telemetry are
  separate, exactly the separation G6 built; neither fabricates the other.

## 3. The ingestion rows themselves (raw SQL, read-only, via Management API)

```
select job_name, status, records_out, source, started_at, finished_at
from ingestion_log where job_name = 'quotes_warm' order by finished_at asc;
→ 7 rows, all: job_name=quotes_warm, status=partial, records_out=0,
  source=quotes-cache-warmer
  13:56:29→13:56:38 (the killed first attempt's slice 0)
  14:01:13→14:01:21, 14:02:37→14:02:42, 14:03:57→14:04:01,
  14:05:16→14:05:21, 14:06:37→14:06:41, 14:07:57→14:08:01 (the six slices)
```

`status=partial` (misses > 0) and `records_out=0` (upstream WRITES only —
fresh-cache serves are not new data): the rows say exactly what happened, no
more. No other job names exist in the log except `reference_observations`
(6 rows; the 13:45Z Vercel-cron FRED/FX route — deliberately not a price or
fundamentals signal).

## 4. Fundamentals signal — honestly never produced (FOUNDER DECISION held)

`ingest_financials` has ZERO rows ever: the financials route's FMP source is
registry-gated `RESEARCH_ONLY` (T55) and no production schedule invokes it.
`/api/health` therefore keeps `"fundamentals: no ingestion recorded yet"` —
the honest never-produced state, not a defect. Unblocking it requires the
founder's fundamentals-source decision (FMP approval or an alternative) —
already on the round-24 decision roll-up.

## 5. Off-session no-op logs nothing — live proof scheduled

Today's post-close scheduled fires (pg_cron runids 34-37, 10:07-10:52 UTC)
ran against the PRE-#240 build (deployed 13:05Z), so they carry no logging
evidence either way. The committed observer
(`scripts/e4SessionObserver.mjs`, launched 2026-10-07T14:20Z, state at
`scripts/e4-observer/`) records `ingestion_log` counts every 4 minutes
through tomorrow's session: the pre-open fires (03:07-03:37 UTC) must leave
the count at 7 (today's forced rows) until the first in-session run — the
live no-op proof. Unit pins already exist (`test/y2.quoteWarm.test.ts`: the
no-op path logs nothing).

## 6. Stale-state degradation — pinned + naturally demonstrated

`computeHealth` (pure) degrades on `priceAge > 36 h` — pinned by
`test/health.test.ts` on the real job names. The natural live demonstration
lands after the weekend: Friday's last in-session run (~09:52 UTC) is >36 h
stale by Monday 03:07 UTC, so Monday's pre-open polls must show
`"prices: staleness exceeds SLO"` until the first in-session run re-arms the
signal. The observer captures this autonomously.

## 7. Clean-server fail-closed

Unchanged and already proven (round-23 §"Clean-server verification":
`scripts/ci/withCleanServer.mjs`, health honestly `degraded` on a fresh
server with both never-produced reasons).

## Verdict

| G6 acceptance item | Status |
|---|---|
| empty state honestly degraded | **LIVE-PROVEN** (§1) |
| fresh quotes_warm clears the price reason | **LIVE-PROVEN** (§2-3) |
| stale state degrades | unit-pinned; natural live proof after the weekend (§6) |
| ingest_financials controls fundamentals | unit-pinned; honestly never-produced pending the founder's source decision (§4) |
| off-session no-op does not fabricate | unit-pinned; live proof captured by the observer tomorrow pre-open (§5) |
| clean-server fail-closed | proven round-23, unchanged (§7) |

G6 is CLOSED on the deployed build for every item provable today; the two
time-gated items are instrumented (the observer) and pinned by tests — no
open engineering action remains.
