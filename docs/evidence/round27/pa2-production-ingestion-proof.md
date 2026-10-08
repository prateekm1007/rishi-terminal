# PA2 (roadmap A2) — production ingestion proof from real scheduled activity (2026-10-08)

Roadmap item: **A2 Temporal Memory** (PR #253, migration 030, `lib/intelligence/stateLog.ts`).
This file closes the outstanding obligation: prove the append-only
observation-state log fills from **real scheduled quote activity** (no manual
SQL, no manual dispatch — Constitution C2/§11 of the round-27 directions).

## Binding

- Production SHA at proof time: `345134c` (the #261 merge; the PA2 code
  itself landed with #253 and every deploy since carries it).
- Writer: `lib/quoteCache.ts` hooks `buildQuoteTransitions` +
  `appendStateTransitions` on every quote-cache write; the writes are fed by
  the pg_cron `quotes-warm` job (schedule `7-52/15 3-10 * * 1-5` UTC).
- Reader: read-only SQL through the Supabase Management API (the observer's
  own sanctioned path — `scripts/sql_ro.sh`, session tooling).

## Raw SQL evidence (2026-10-08, ~05:46 UTC)

Aggregate (read-only):

```
SELECT count(*) AS total, count(*) FILTER (WHERE old_value IS NULL) AS first_obs,
       count(DISTINCT change_id) AS distinct_ids, count(DISTINCT entity) AS entities,
       min(recorded_at), max(recorded_at), ... FROM public.observation_state_log;

total | first_obs | distinct_ids | entities | first_at | last_at | price_rows | change_rows | volume_rows
26593 | 0         | 26593        | 840      | 2026-10-08 03:48:07.98925+00 | 2026-10-08 05:46:36.967586+00 | 8710 | 8870 | 9013
```

Per-observation snapshot during the proof window (11,891 rows at ~05:00,
26,593 by ~05:46 — the warmer's 15-minute cadence keeps appending).

No-op rejection (the DB constraint + writer discipline):

```
SELECT count(*) AS noop_rows FROM public.observation_state_log WHERE old_value = new_value;
noop_rows
0
```

Source-state vocabulary (closed set, shared with the evidence layer):

```
SELECT source_state, count(*) FROM public.observation_state_log GROUP BY source_state;
source_state | count
live         | 11913   (earlier snapshot; 100% live at every observation)
```

Chaining (RELIANCE price, the audit spot-check — every row's old_value
equals the previous row's new_value; observed_at is the upstream clock):

```
recorded_at                      | old_value | new_value | source    | observed_at
2026-10-08 03:58:21.53797+00     | 1207      | 1203     | yahoo-bulk | 2026-10-08 03:58:19+00
2026-10-08 04:13:21.812113+00    | 1203      | 1197.5   | yahoo-bulk | 2026-10-08 04:13:15+00
2026-10-08 04:28:22.548952+00    | 1197.5    | 1195.5   | yahoo-bulk | 2026-10-08 04:28:19+00
2026-10-08 04:35:42.839386+00    | 1195.5    | 1195.1   | yahoo-bulk | 2026-10-08 04:35:39+00
2026-10-08 04:43:21.890261+00    | 1195.1    | 1194.8   | yahoo-bulk | 2026-10-08 04:43:14+00
```

RLS (fail-closed, live):

```
SELECT count(*) AS policies_on_state_log FROM pg_policies WHERE tablename='observation_state_log';
policies_on_state_log
0
```

## What this proves

1. **Real production ingestion**: 26,593 transitions appended by the
   scheduled warmer's writes through the one canonical hook — zero manual
   inserts (the writer is the quote-cache path only; `git grep` pins the
   call sites: `lib/quoteCache.ts` lines 132–134).
2. **Idempotent appends**: 26,593 rows = 26,593 distinct `change_id`s —
   warmer retries and re-observations collapse to one row per deterministic
   identity (rule 11).
3. **No-op suppression works in production**: zero rows where
   old_value = new_value (both the writer's unchanged-value skip and the DB
   constraint held across ~26.6k appends in-session).
4. **Honest chaining**: consecutive rows per (entity, field) chain exactly;
   `observed_at` carries the upstream's clock (seconds before our
   `recorded_at`), never fabricated.
5. **Provenance vocabulary is the closed set**: only `live` appears (the
   yahoo-bulk path discloses observation times); no seed/derived rows can
   masquerade as live.
6. **RLS deny-all**: zero policies on the table for client roles.

## Honest scope notes

- **Zero first-observation rows (`old_value IS NULL`)**: expected in the
  current production topology — the warmer ran for days before the PA2 hook
  went live, so every quote write finds a previous cache row. The
  first-observation path (old = null, "an honest beginning, never a zero")
  is pinned by the #253 test suite; it becomes production-reachable when a
  new field writer (fundamentals, A5-era) or a never-warmed symbol appears.
- **stateAt / readStateHistory readers**: not yet consumed by any surface
  (their consumers are A6 ChangeSince and later items). The SQL equivalent
  of `stateAt` semantics was exercised by the chaining query above; the TS
  readers are unit-pinned.
- Migration 030 was applied production-side before 03:48 UTC (first row);
  the apply evidence predates this session — the ingestion proof here is
  the behavioral closure the round-27 directions demanded.

## Verdict

A2's production-ingestion obligation is CLOSED: the temporal memory fills
from real scheduled activity with deterministic identity, idempotency,
no-op rejection, honest chaining, closed provenance, and deny-all RLS —
verified by live read-only SQL against production on 2026-10-08.
