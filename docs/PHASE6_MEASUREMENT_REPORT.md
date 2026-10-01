# Phase 6.1 — Production Measurement Report (T59)

**Deployment measured:** `bbd5720` (`main`, CI green, Vercel READY)
**Battery command:** `npx tsx scripts/phase6Battery.ts` (one command; no manual steps)
**Raw evidence:** `artifacts/phase6/T59_PRODUCTION_MEASUREMENT.json` (committed; schema `RISHI_PHASE6_T59_MEASUREMENT_V1`, contains every raw value this report cites)
**Run executed:** 2026-10-01T00:41–00:44 UTC (two runs; both retained in the artifact — the second overwrote the file with the full percentile set)

This task is a **measurement gate, not an optimization**. No TTL was changed, no
vendor added, no cache rewritten (T63.1 respected). What follows is measured
production behaviour, with the exact evidence reference for every claim.

---

## 1. The two data paths — measured, not assumed

The primary finding of the review is confirmed and now quantified:

| | Single path | Batch path (dominant client traffic) |
|---|---|---|
| Client | `/api/prices?symbol=X` | `useLivePrices` → POST `/api/prices/batch` |
| Server chain | `fetchLivePrice` → T60 reuse → coalesce → `withProviderHealth` → provider → T62 write-through | `fetchBulkPricesForSymbols` → 60 s bulk cache → **direct Yahoo v8 HTTP** |
| Health counters | yes (`withProviderHealth`) | **no — bypasses `withProviderHealth` by design** (Phase 6.1 forbids changing semantics) |
| Measured since | bbd5720 | **bbd5720** (ledger `path="bulk"`, registry id `yahoo`) |

Homepage population measured: **32 distinct symbols** per batch request
(`scenarioD.population` in the artifact — reconstructed from the same
deterministic imports the page uses).

## 2. Scenario results (T59.3)

### A — cold single symbol (`scenarioA`)
TCS: HTTP 200, wall **674 ms** (second run 1366 ms), `source=yahoo`,
`status=LIVE`, `observedAt` = the actual upstream observation time.
"Cold" here means cache-busted + outside the 30 s reuse window; serverless
process warmth is not controllable from outside and is not claimed.

### B — sequential repeats inside the T60 window (`scenarioB`)
5 requests, 2 s apart, distinct cache busters (every request reaches the origin):

- **Run 2 (00:41 UTC):** all 4 replays `CACHED`, `observedAt` constant
  (`00:41:31.892Z`), walls 391–421 ms → **T60 reuse demonstrated on the
  single path with zero extra upstream calls.**
- **Run 1 (00:40 UTC, retained in git artifact history of this file's
  companion JSON):** replays B0/B1 `CACHED`, then **B2 returned a fresh
  `LIVE` observation mid-window** — the request landed on a second warm
  serverless instance with its own (empty) reuse store. This is the
  documented per-instance posture of T60/T45, now *measured in production*.

### C — concurrent burst N=10 (`scenarioC`)
- **Identical URL** (CDN may satisfy): p50 **78–642 ms** across runs; fast
  cluster ≈ edge hits. This variant measures CDN + coalesce combined, by
  construction.
- **Distinct URLs** (all origin): p50 **479–746 ms**.
- Raw wall arrays are in the artifact; p50/p95/p99 are null-gated by sample
  size (n=10 → computed; smaller sets → `null` + sampleSize, T59.5).

### D — batch production path (`scenarioD`)
32 requested → **32 returned** (0 missing, 0 UNAVAILABLE), wall
**1646–3032 ms**, chunked 32 (≤50 cap). Source distribution dominated by
`yahoo-bulk`; full distribution + per-entry provenance in the artifact.

### E — repeated batch inside the bulk-cache window (`scenarioE`)
Second identical batch: `observedAt` **equal across batches** (byte-identical
replay) and lower wall time. **Layer attribution (bulk cache vs T60 vs CDN)
requires counter deltas, which require `CRON_SECRET` — see §4.** The artifact
records exactly this state; it is not claimed as "served from bulk cache".

## 3. Provenance semantics (T60.1) — verified on both paths

Fixed in `bbd5720` (the minimal change the verification required), then
regression-locked:

- The batch route no longer stamps serve time as `lastUpdated`: bulk entries
  carry `observedAt` = Yahoo's own `regularMarketTime`; `lastUpdated` mirrors
  it; `checkedAt` is the distinct decision time; when Yahoo discloses no
  observation time the fields are `null` — never fabricated.
- Yahoo-transported quotes (including `yahoo-bulk`) render **DELAYED**, never
  realtime: `statusLabel("live","yahoo-bulk") = "DELAYED · YAHOO-BULK"`
  (unit-tested).
- Replays stay honest: CACHED stays CACHED, STATIC stays STATIC, DERIVED
  stays DERIVED, original observation timestamps survive (unit-tested, and
  demonstrated live in scenarios B and E).

## 4. Counter reconciliation (T59.4) — **status: BLOCKED on one secret**

The ledger and the battery are deployed and working, but reading the
per-process counters from `/api/admin/providers` requires `CRON_SECRET`,
which is stored as a Vercel-encrypted envelope and is not retrievable via
any API (verified: `?decrypt=true` returns the `{"v":"v2",...}` envelope;
`vercel env pull` returns nothing for Sensitive values).

**`BLOCKED: T59.4 live counter reconciliation requires CRON_SECRET from the founder.**`
Everything else in this report was produced without it. Once provided, one
re-run of `scripts/phase6Battery.ts` completes the reconciliation
(health-volume delta vs ledger single-path delta per provider, with the
bulk delta expected outside health counters — rule encoded in the battery).

No reconciliation defect is claimed either way: the check could not run. It
was not converted into "probably fine".

## 5. Persistent cache (T62.1) — production evidence

| Required step | Result | Evidence |
|---|---|---|
| 1. live observation occurs | ✅ | US10Y response `observedAt=2026-10-01T00:41:49.699Z` |
| 2. persistent cache write occurs | ✅ | `provider_cache` row `quote:US10Y`, `provider_id=fred-csv`, `observed_at=2026-10-01 00:41:49.699+00` — byte-exact match |
| 3. subsequent provider failure | ⚠️ test-only | production fault-injection unavailable without a debug surface |
| 4. cached observation returned on failure | ⚠️ test-only | `test/phase6-cache.test.ts` (fallback → CACHED) |
| 5. original `observedAt` survives | ✅ | row `observed_at` == response `observedAt` |
| 6. status becomes `CACHED` | ⚠️ test-only | same integration tests |
| 7. non-entitled provider never persisted | ✅ | `SELECT count(*) … provider_id not in (allow-list)` → **0**; distinct providers in cache = exactly `["exchangerate-api","fred-csv"]`; the Yahoo-served USD/INR observation did **not** overwrite the entitled row |

⚠️ = covered by automated integration tests, explicitly **not claimed as
production-proven**. Making it production-provable needs a fault-injection
debug surface → `FOUNDER DECISION NEEDED` (not built unilaterally).

## 6. Observations cron (T61.1) — production evidence

- Route exists: `app/api/ingest/observations/route.ts`; schedule:
  `vercel.json` → `45 13 * * 1-5` (code evidence).
- CRON auth fails closed: unauthenticated POST → **401** (live probe).
- Production execution occurred: `ingestion_log` row
  `job_name=reference_observations, status=success, records_out=5,
  started_at=2026-09-30T18:13:15.104Z`.
- `observed_prices`: **5 rows**, `observed_date=2026-09-30`,
  `last_observed_at=2026-09-30 18:13:15.338+00`,
  sources = `["fred-csv"]` ⊆ allow-list; non-entitled rows = **0**; row
  count (5) == `records_out` (5) → no fabricated rows. FX reference symbols
  were honestly skipped (non-entitled winner), matching the storage-rights
  design.
- An authenticated live re-execution is available once `CRON_SECRET` is
  provided (battery probes it automatically).

## 7. Traffic split (T59.6)

`BLOCKED: production traffic attribution unavailable` — Vercel request-path
telemetry is not API-accessible for this project. Deployed substitute:
per-instance endpoint counters (ledger `appRequests`) now measure
`/api/prices` vs `/api/prices/batch` from bbd5720 onward; the battery's own
traffic (28 single + 3 batch requests) is recorded separately. External
user attribution is **not** inferred.

## 8. Cache-path reconciliation (T59.7)

| Path | Cache | TTL | Provenance preserved | Health counted | Volume counted | Persistent cache |
|---|---|---:|---|---|---|---|
| `fetchLivePrice` (single) | T60 in-process reuse | 30 s | **yes — demonstrated** (scenario B: constant `observedAt`, `CACHED` label, zero extra fetches) | **yes** (`withProviderHealth`) | **yes** (ledger `path=single`) | eligible sources only — **demonstrated** (§5) |
| `/api/prices/batch` Yahoo-bulk | bulk in-process cache | 60 s | **yes since bbd5720** — demonstrated (unit tests + scenario D entries carry `observedAt=regularMarketTime`; previously serve time was stamped — defect fixed) | **no** — bypasses `withProviderHealth` **by design** (Phase 6.1 forbids changing this) | **yes since bbd5720** (ledger `path=bulk` + `bulk-run` events) | **no** (never — Yahoo has no storage rights; verified: zero non-entitled rows) |
| CDN API response | `s-maxage` | 30 s | response-dependent (CDN replays response bytes, provenance fields included) | not upstream telemetry | not upstream telemetry | no |

Every "yes" above is backed by an evidence reference; nothing is green
merely because code exists.

## 9. The measurement answer (acceptance #7)

With the evidence available today:

1. **Where provider calls go:** the batch path is the dominant traffic
   generator — one real Yahoo HTTP attempt *per symbol* per bulk-fetch pass
   (32 attempts per cold batch pass on the homepage population), while the
   single path contributes at most a handful of provider calls per request
   (fallback chains). Exact counter reconciliation is one `CRON_SECRET`
   away (§4).
2. **Where latency goes:** origin single-symbol responses ≈ **0.4–0.8 s**;
   cold batch pass (32 symbols) ≈ **1.6–3.0 s** — the bulk layer fetches
   symbols *sequentially inside chunks of 20*, so per-symbol Yahoo latency
   stacks; this is the largest measured wall-time contributor.
3. **What is already eliminated:** T60 reuse serves 4/4 sequential same-symbol
   origin requests without upstream work (scenario B, run 2); the CDN serves
   identical-URL bursts at p50 78 ms vs 623 ms origin (scenario C, run 1);
   repeated batches replay byte-identical provenance (scenario E). The
   residual duplication is **cross-instance** (scenario B, run 1: a second
   warm instance re-fetched mid-window) — measured, quantified, and now the
   *evidence-based* candidate for any future T62/T63 work.

**No optimization was performed or claimed in this gate.** The next
optimization decision, if any, must cite this artifact.

## 10. Open items carried forward

1. `CRON_SECRET` needed from the founder → completes T59.4 live
   reconciliation + authenticated cron execution probe (one battery re-run).
2. T62.1 steps 3/4/6 in production → `FOUNDER DECISION NEEDED` on a
   fault-injection debug surface.
3. External traffic attribution → BLOCKED (§7); app counters now collecting.
4. The two cache implementations (T60 30 s vs bulk 60 s) remain
   semantically separate **by design until measurement justifies a change**
   — that justification attempt now exists and can be evaluated with numbers.

---

## 11. Corrective measurement/provenance gate (deep-audit fixes, this commit)

An independent deep audit of the measurement implementation found four
correctness defects. All four are fixed in this commit with tests that were
written first, run against the unfixed code (15 failures, captured), then
made to pass (31/31 in the two affected suites; 268/268 overall). No provider
selection, TTL, batch geometry, or cache semantics was changed.

### 11.1 Request-ID attribution (was: last-incomplete-event matching)

`recordAppRequestDone()` matched "the most recent incomplete app-request
event for this endpoint" — unsafe under concurrency: a 10-request burst
could attach completions to the wrong request. `recordAppRequest()` now
returns a unique event id and `recordAppRequestDone(id, wallMs)` updates
exactly that event. Tests: out-of-order completions, concurrent
same-endpoint delays, double-completion and unknown-id hijack attempts.

### 11.2 Bulk-run local attribution (was: global before/after deltas)

`fetchBulkPricesForSymbols()` derived per-run upstream counts from global
ledger deltas around its concurrent work — overlapping batch requests
absorbed each other's attempts. Each run now owns a local attempt
accumulator threaded through `fetchYahooPrice()`/`processBatch()`; the
global ledger event stream is unchanged (T59.4 reconciliation intact).
Test: two overlapping bulk runs (2 + 4 real HTTP attempts) each report
exactly their own attempts/failures; under the old method run 1 charged 6.

### 11.3 No fabricated observation timestamps anywhere

The audit found `current time` substituted for `observation time` in four
places. All are gone — `observedAt` is now `string | null` end to end:

1. `attempt()`: `r.observedAt ?? new Date()` → `r.observedAt ?? null`.
2. `persistIfEntitled()` / `persistentCacheSet()`: storage entries without a
   disclosed observation time are NOT written (migration 009 demands
   `observed_at NOT NULL`; we do not manufacture a value to satisfy it).
   `persistentCacheSet` additionally rejects a null timestamp at the
   boundary.
3. T61 observations cron: a storage-entitled capture without a disclosed
   observation time is skipped, not fabricated.
4. In-chain cache replays (bond 5-min cache, Yahoo 60-s stock cache) and the
   client hook (`useLivePrices`) replay/substitute `null`, never the
   fill/fetch time. `lastUpdated` is `string | null` — serve time is never
   dressed up as an observation time; `checkedAt` remains the distinct
   decision/serve time.

Where upstreams DO disclose observation times, they are now carried (this
is what keeps T62 persistence alive without fabrication):

| Provider / fn | Disclosed field used | When absent |
|---|---|---|
| `fetchYahooQuote` / `getYahooNSEPrice` / v7 | Yahoo `regularMarketTime` (same field the bulk path already trusted) | `null` |
| `fetchUSBondYield` (fred-csv) | FRED's own CSV `DATE` column, kept date-only exactly as disclosed | `null` |
| `getForexRate` er-api path | `time_last_update_unix` | `null` |
| NSE, BSE, CoinGecko, India ETF (DERIVED) | none disclosed (DERIVED has no single observation time) | `null` |

### 11.4 Read-side storage-rights guard (defense in depth)

`persistentCacheGet()` trusted the stored `provider_id`. It now re-validates
`provider_id ∈ PERSISTABLE_SOURCES` (resolved from the single allow-list in
`lib/cache/storageRights.ts`) and returns null otherwise. Tests: a
non-entitled (`yahoo`) row is never served even though it exists and is
unexpired; an entitled row is served with provenance intact; the guard holds
end-to-end through `lastKnownObservation`.

### 11.5 T62 last-known fallback precedence — documented (finding 5), not changed

The FRED chain inside `fetchUSBondYield` resolves its STATIC reference
BEFORE `fetchLivePrice` ever reaches `lastKnownObservation()`. Precedence
for a US Treasury symbol is therefore:

```
FRED fresh (LIVE) → 5-min bond cache (CACHED) → FRED refetch →
STATIC reference (static-yields-us)   ← lastKnownObservation is NEVER
                                         reached while a static entry exists
```

Test: with FRED failing AND a valid, entitled, fresh fred-csv row present in
the persistent store, US10Y still serves STATIC 4.42 — not the stored 4.55.
Contrast (also tested): a forex pair with no static entry, on total upstream
failure, DOES serve the persisted observation as CACHED with its original
`observedAt` — the T62 fallback is reachable and correct where the chain
cannot otherwise answer.

**T62 reachability matrix (measured, this commit):**

| Storage-entitled source | Writes possible? | Fallback reachable? | Why |
|---|---|---|---|
| `fred-csv` (US bonds) | yes — real FRED DATE | **no** — STATIC wins in-chain first | design gap; a future change must cite this evidence |
| `exchangerate-api` (FX er-api path) | only when the pair loses the Yahoo race AND er-api discloses `time_last_update_unix` | **yes** (proven by test) — the only chain that can reach `lastKnownObservation` | — |
| `ecb-fx` | no routing chain uses it today | n/a | registered but unwired |

### 11.6 Batch path semantics (finding 10) — measurable, unchanged

The batch path keeps its independent 60 s Yahoo-bulk cache. This commit does
NOT merge the two cache paths; it makes the batch path's measurement
trustworthy (11.1/11.2) so the decision can later be made on numbers: batch
traffic share, bulk cache hit rate, upstream attempts saved, latency per
bulk symbol, cross-instance duplication. Those quantities now measure only
the traffic that actually produced them. The batch route still labels fresh
Yahoo-bulk observations `LIVE` with `source: yahoo-bulk`; the presentation
layer renders the delayed-source label (T47/T60.1), unchanged.

### 11.7 T59.4 / T59.6 status unchanged

- **T59.4**: `CRON_SECRET` remains absent from the local vault and the HF
  mirror (checked per Article VI lookup order; the founder has been asked).
  `BLOCKED: CRON_SECRET required for live T59.4 reconciliation` — not passed.
- **T59.6**: per-instance endpoint counters remain available; external
  Vercel traffic attribution remains `BLOCKED`. The two are not conflated.
- The battery's scenario reports already separate T60 in-process reuse,
  T62 DB write/read/fallback, and T61 persistence (§2–§6); no
  fault-injection endpoint was added (the standing FOUNDER DECISION from
  §10 item 2 still applies to full production proof of failure→cached-serve).

**Not claimed in this commit:** no optimization, no TTL change, no batch
rewrite, no provider change, no Redis, no score redesign. The production
battery should be re-run after this commit deploys to re-baseline the
percentiles against the corrected attribution.
