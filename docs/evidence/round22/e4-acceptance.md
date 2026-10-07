# E4 — real NSE-session acceptance (Wed 2026-10-07) + Stocks 916-surface in-session measurement

Founder Round-22 directions 3–8, 13–14. Pre-registered protocol:
`docs/evidence/round18/e4-scheduler-diagnostic.md` §4 (unchanged). All
measurement autonomous, read-only, autocommand-only: the observer
(`scripts/e4SessionObserver.cjs`, launched 2026-10-06 21:12 UTC) never
dispatched the warmer; it only read `cron.job_run_details`,
`net._http_response`, `/api/health`, `/api/version` and the user-facing
surfaces. Raw state: `scripts/e4-observer/` (state.jsonl, coverage.jsonl,
acceptance.json, baseline.json, stocks-surface-*.json).

## Verdict

- **Scheduler: PROVEN.** Three consecutive scheduled in-session warming
  executions with zero manual dispatch; `/api/health` agrees with the SQL
  count to the row; positive controls all behave exactly as predicted.
- **Freshness gate: NOT MET — 814/916 (88.86%) vs the pre-registered 825
  (90%).** Reported as a fail; no threshold was moved.

## 1. Three consecutive scheduled in-session runs (pg_cron jobid=1 quotes-warm, `7-52/15 3-10 * * 1-5`)

| runid | start (UTC) | end (UTC) | status | slices | warming | skipped |
|---|---|---|---|---|---|---|
| 9 | 03:52:00.121 | 03:58:15.377 | succeeded | 6 | 6 | 0 |
| 10 | 04:07:00.199 | 04:13:15.428 | succeeded | 6 | 6 | 0 |
| 11 | 04:22:00.213 | 04:28:15.433 | succeeded | 6 | 6 | 0 |

Pre-open no-ops (honest `market closed`, 200) also captured: runids 6
(03:07), 7 (03:22), 8 (03:37) — 6 slices each, all skipped, proving the
market-hours guard and the wire path without counting toward acceptance.

## 2. Coverage battery (pre-registered §4 SQL forms, verbatim, at 04:28:48 UTC)

```
select count(*) from quote_cache where observed_at > now() - interval '30 minutes';
=> [{"count":820}]            (universe + tiles + legacy rows)
universe-scoped (916 STOCKS keys, same window):
=> [{"count":814}]
target: >= 825 (ceil(0.9 * 916))
not-fresh (universe): [{"count":102}]
```

## 3. /api/health agreement

```
health.quoteCache.equities = fresh 814 / total 916 (coverage 88.86%) at 2026-10-07T04:28:48Z
sql universe count         = 814  — EXACT agreement (same 30-min definition)
```

## 4. BANKBARODA positive control (04:28:48 UTC)

```
POST /api/prices/batch ["BANKBARODA"] -> price 231.29, change -0.618%,
  volume 582125, source yahoo-bulk, status CACHED,
  observedAt 2026-10-07T04:28:13+00:00 (35 s before the battery),
  market { open: true, freshness: "live-delayed", sessionDate: "2026-10-07" }
GET /stock/BANKBARODA -> HTTP 200; SSR first byte carries the time context
  ("09:40 IST · market open · intraday quote") and the market-state label;
  the ₹ price itself is client-hook delivered on this surface (design
  recorded since the closed-market baseline — no defect claim).
```

## 5. Representative symbols (04:28:48 UTC, batch path)

| symbol | class | status | price | observedAt |
|---|---|---|---|---|
| BAJAJAUTO | formerly aliased (LP3) | CACHED | 9850 | 04:28:14 |
| AMARAJABAT | formerly aliased (LP3) | CACHED | 736.60 | 04:28:13 |
| MEGH | formerly aliased (LP3) | CACHED | 60.76 | 04:27:59 |
| NARAYANA | formerly aliased (LP3) | CACHED | 1716.50 | 04:27:53 |
| SONATASOFT | formerly aliased (LP3) | CACHED | 249.25 | 04:28:10 |
| RELIANCE | never aliased | CACHED | 1210.10 | 04:28:20 |
| TCS | never aliased | CACHED | 2085.30 | 04:28:16 |
| LTIM | Yahoo-uncovered | UNAVAILABLE | — | — |
| BLUESTAR | duplicate seed row | UNAVAILABLE | — | — |
| COLGATE | duplicate seed row | UNAVAILABLE | — | — |

Every formerly-aliased and never-aliased control is fresh in-session;
LTIM and the duplicate rows stay honestly `UNAVAILABLE` — the provider
and registry defects stay visible, unpainted.

## 6. Why 814 < 825 — the 102 not-fresh, classified (not hidden)

- **89 structurally unavailable** (no live observation exists):
  ~82 Yahoo-uncovered identities (LTIM class), 5 duplicate seed rows
  (BLUESTAR/BLUESTARCO, COLGATE/COLPAL, INFOEDGE/NAUKRI, JAINIRRIG/JISLJALEQS,
  TASYBITE/TASTYBITE), 2 unresolved ambiguous identities. These cannot be
  warmed by any retry — they are the provider-coverage and registry
  classes already escalated (second provider = FOUNDER DECISION NEEDED;
  duplicate cleanup = its own registry task).
- **13 priced-but-stale at battery time** (named by the 05:00 surface
  measurement): DRONE, INDIGRID, RMCL, SADHAV (~2.2 years stale — seed-era
  rows never observed live), GSPL, HEG, TINPLATE (similarly ancient), plus
  a flake tail DFL (30 min), GEECEE (55), STARPAPER (63), TAINWALCHM (58),
  VHL (33), REVATHI (1141). Seven of the thirteen look like the same
  identity/coverage class as the 82, not transient flakes; ~6 are
  per-symbol provider misses the warmer retries next run (coverage curve
  crept 813 → 814 → 815 across runs).

## 7. Stocks 916-surface, user-facing, IN-SESSION (05:00:00 UTC — `stocksSurfaceMeasurement.cjs`, the page's own transport: POST /api/prices/batch, 50-symbol chunks, sequential)

| metric | closed-market BEFORE (21:14 UTC Oct 6) | in-session AFTER (05:00 UTC Oct 7) |
|---|---|---|
| TTFF | 1955 ms | **2252 ms** |
| 25% fill | 8.8 s | **9.8 s** |
| 50% fill | 22.0 s | **22.2 s** |
| 75% fill | 30.5 s | **30.7 s** |
| 100% fill | unreachable (89 UNAVAILABLE) | **unreachable (89 UNAVAILABLE)** |
| priced | 827 (35 LIVE + 792 CACHED) | **827 (827 LIVE + 0 CACHED)** |
| fresh ≤30 min | 0 | **814 (88.9%)** |
| chunk p50 / p95 | 1828 / 2752 ms | **1811 / 2358 ms** |
| chunk failures | 0 | **0** (19 chunks) |
| SSR /stocks | 200, TTFB 160 ms, 0 prices in first byte | **200, TTFB 572 ms, 0 prices in first byte** |
| /api/health | 0/916 | **814/916** |

**The measured optimization target (direction 14):** the fill curve is
market-state-INDEPENDENT — closed and in-session curves match within
~1 s at every milestone, because the tail is the page's 19 sequential
chunk round-trips (p50 ≈ 1.8 s each ≈ 35 s wall). Data availability is
solved for all 827 priceable symbols (827 LIVE); the remaining gaps are
the structural 89. Any tail optimization is therefore transport work
(chunk size / sequencing) and must re-prove the Lighthouse floor and the
200 kB bundle budget (direction 15: no blind parallelism).

## 8. Page TTFB battery in-session (canonical `scripts/measureTtfb.sh`, 4 passes, 05:19 UTC)

```
ALL ROUTES warm (passes 2+): n=30 p50=0.091s p95=0.345s max=0.349s
cold (pass 1): 0.089–0.100 s per route; all 200s; bytes 70–191 kB
```

## 9. Reproducibility (founder direction 22)

- Observer: `node scripts/e4SessionObserver.cjs` under nohup, PID 1844,
  started 2026-10-06 21:12 UTC; state under `scripts/e4-observer/`
  (resume-safe: runids/responses tracked in state.jsonl).
- Surface scheduler: `node scripts/sessionSurfaceScheduler.cjs` under
  nohup, PID 1941, started 2026-10-06 21:15 UTC; absolute-time jobs
  05:00/05:15/08:00/08:15/09:45 UTC + the canonical
  `scripts/measureTtfb.sh` (invoked through a local wrapper dir because
  the sandbox forbids symlinks; the repo script is the only logic).
- Sandbox notes, recorded honestly: ps/pgrep snapshots were transiently
  inconsistent twice (23:57–00:09 UTC); /proc and the logs were used as
  the liveness truth. A duplicate scheduler start at 23:57:59 logged a
  second start line and died before any job fired (log line preserved);
  no double measurement occurred.
- No warmer dispatch, no manual SQL against production (the only
  production SQL this round was the G1 migration apply + read-only
  verifications, via the Management API, recorded in the G1 PR).
