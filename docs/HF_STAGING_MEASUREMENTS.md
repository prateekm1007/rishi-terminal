# HF Staging Measurements (E2) — compare, don't migrate

Round 18, item E2. The staging Space (`prateekm1/rishi-terminal`,
private, `cpu-basic`, see `docs/evidence/round18/e1-hf-staging-space.md`)
is a **measurement target only**. Nothing here proposes a migration:
production stays on Vercel, and the founder decides (E3 decision rule,
pre-registered below).

## Caveats (read before the numbers)

1. **Runner location is not India.** Every number marked `[sandbox]` or
   `[GH runner]` was measured from the coder's automation sandbox / CI
   (egress IPs recorded per table). The sandbox egress IP **rotates per
   connection** (observed: 8.212.10.159 and 47.57.242.119 in adjacent
   runs) — cross-host comparisons are same-runner-class, not
   same-connection. The **India** rows are the founder's own runs
   (commands below) and are the only ones allowed to carry the "India"
   label.
2. Lighthouse numbers are **simulated** mobile throttling, single run
   per cell, homepage + `/stock/RELIANCE` only.
3. The private Space requires `Authorization: Bearer <HF token>` for
   every probe; the Vercel production site is public. Auth headers do
   not change timing meaningfully (one header line).
4. The Space runs **seed-only** (no DB env, per the founder's staging
   rule): its pages are the baked seed-backed prerender; live price
   paths behave differently on production. TTFB/LCP compare the same
   page weight (byte medians below differ by <1.5%), not live data.

## The two India commands (founder runs from India)

```bash
# 1. Vercel production (public — no auth):
bash scripts/measureTtfb.sh https://rishi-terminal.vercel.app 4 table

# 2. HF Space (private — auth required):
CURL_AUTH=<HF token> bash scripts/measureTtfb.sh https://prateekm1-rishi-terminal.hf.space 4 table
```

Paste both outputs into the E2 PR thread. The table reports per route:
cold TTFB, warm p50/p95, HTTP codes, median warm bytes.

## Table 1 — Page TTFB `[sandbox]` (non-India; scripts/measureTtfb.sh, 4 passes)

Vercel (2026-10-05T11:34:28Z, egress 47.57.242.119):

```
ROUTE                     COLD_S WARM_P50_S WARM_P95_S  CODES     BYTES_WARM_MED
/                          0.695     0.089     0.089  200            67284
/stock/RELIANCE            0.120     0.089     0.089  200           187023
/stock/TCS                 0.104     0.089     0.101  200           189365
/stock/HDFCBANK            0.275     0.091     0.110  200           184050
/stock/SBIN                0.102     0.085     0.148  200           182809
/stock/INFY                0.105     0.084     0.111  200           191621
/stock/CANBK               0.099     0.087     0.090  200           182626
/stock/BANDHANBNK          0.093     0.091     0.329  200           185479
/stock/AUBANK              0.164     0.107     0.337  200           188969
/stock/TATAMOTORS          0.095     0.099     0.313  200           186479
ALL ROUTES warm (passes 2+): n=30 p50=0.089s p95=0.329s max=0.337s
```

Space (2026-10-05T11:34:19Z, egress 8.212.10.159):

```
ROUTE                     COLD_S WARM_P50_S WARM_P95_S  CODES     BYTES_WARM_MED
/                          0.659     0.866     0.878  200            65269
/stock/RELIANCE            0.698     0.885     0.886  200           185849
/stock/TCS                 0.646     0.683     0.772  200           188334
/stock/HDFCBANK            0.681     0.690     0.693  200           182724
/stock/SBIN                0.749     0.868     0.877  200           181498
/stock/INFY                0.694     0.674     0.704  200           190583
/stock/CANBK               0.829     0.639     0.647  200           181308
/stock/BANDHANBNK          0.606     0.690     0.807  200           184157
/stock/AUBANK              0.669     0.677     0.685  200           187648
/stock/TATAMOTORS          0.759     0.692     0.829  200           185932
ALL ROUTES warm (passes 2+): n=30 p50=0.686s p95=0.885s max=0.886s
```

## Table 2 — India rows `[FOUNDER — pending]`

| Metric | Vercel | Space |
|---|---|---|
| warm TTFB p50 (10 pages) | pending founder run | pending founder run |
| warm TTFB p95 (10 pages) | pending founder run | pending founder run |
| Lighthouse LCP (founder device) | pending founder run | pending founder run |

## Table 3 — Lighthouse, mobile simulated, same runner `[sandbox]`

| Audit | Vercel / | Space / | Vercel /stock/RELIANCE | Space /stock/RELIANCE |
|---|---|---|---|---|
| Performance score | 78 | 90 | 87 | 82 |
| First Contentful Paint | 1.0 s | 0.9 s | 1.0 s | 1.1 s |
| Largest Contentful Paint | 3.3 s | 2.7 s | 2.5 s | 2.9 s |
| Total Blocking Time | 590 ms | 290 ms | 430 ms | 460 ms |
| Cumulative Layout Shift | 0 | 0.005 | 0.001 | 0.061 |
| Server response time (root) | 10 ms | 240 ms | 10 ms | 440 ms |

Raw reports: `e2-lh-vercel.json`, `e2-lh-space.json`,
`e2-lh-vercel-stock.json`, `e2-lh-space-stock.json` (automation
workspace; summaries above are the PR record).

## Table 4 — Cold wake and redeploy outage (server-side, Space)

| Metric | Value | Evidence |
|---|---|---|
| Container cold boot to first 200 (`docker run` in CI) | **2 s** | run 37302855239: `first 200 after 2 s (last code: 200)` |
| Space soft-restart wake (restart_space, poll 2 s) | **1 s** | restart 11:37:58Z, first probe 200 |
| Free-tier sleep (48 h idle) wake | **not inducible** | `cpu-basic` cannot change it; `gcTimeout: 172800` s from the runtime API. Will be captured if/when it happens naturally; no cost-free keep-alive avoids it (a ping would be a workaround for a paid-hardware constraint and is NOT scheduled) |
| Redeploy outage (factory reboot, 1 Hz probes) | **0 of 78 probes failed** | stages RUNNING_BUILDING (2 s) → RUNNING_APP_STARTING (158 s) → RUNNING (174 s); previous replica served the whole rebuild; raw: `e2-outage-poll3.txt` |
| Rebuild wall time (factory reboot) | **~181 s to RUNNING** | same run |

## Table 5 — Build time and image size

| Metric | Value | Evidence |
|---|---|---|
| Docker build, cold, GH runner | **76 s** | run 37302855239: build step 11:25:46Z → image tagged 11:27:02Z |
| Space rebuild, warm BuildKit cache | **~2 min 35 s wall** | HF build log: first ts 11:25:51Z → `DONE 76.3s` at 11:28:25.635Z (the 76.3 s final step matches the cold `npm run build`) |
| Image size | **1.38 GB** | CI `docker images` output: `rishi-terminal-space:latest 1.38GB` |

## Server-side facts that don't depend on location

- The Space serves all probed routes with HTTP 200 and the same page
  byte weights as production (Tables 1/3) with **no database attached**.
- `/api/health` on the Space answers the honest degraded 503
  (`db round-trip failed` — fail closed; FOUNDER DECISION NEEDED on
  PR #195 governs whether a staging DB is provisioned).
- Zero-downtime redeploy was **observed** on the Space (Table 4) — the
  old replica serves until the new one is up; outage is not the
  differentiator, rebuild wall time (~3 min vs Vercel's ~2 min build)
  is the cost of that window.

## E3 — Decision rule and verdict (the founder decides)

**Pre-registered rule (verbatim from the founder's E3 directive, written
before any Space measurement was examined):**

> Recommend staying on Vercel unless the Space is **at least as good on
> all of these**: warm TTFB p95 for pages ≤ the Vercel number,
> India-measured LCP no worse, redeploy outage under 60 s, and cold wake
> under 60 s with a plan that avoids sleep at no cost. Put the verdict
> and the numbers in the doc. The founder decides.

### Verdict per the rule (numbers: Tables 1–4)

| # | Criterion | Measured | Result |
|---|---|---|---|
| 1 | warm TTFB p95 (pages) ≤ Vercel | Space 0.885 s vs Vercel 0.329 s `[sandbox]` | **FAIL** (2.7× worse; India run pending) |
| 2 | India-measured LCP no worse | `[FOUNDER — pending]`; sandbox proxy: home 2.7 s vs 3.3 s (Space better), stock 2.9 s vs 2.5 s (Space worse) | **PENDING** founder run |
| 3 | redeploy outage < 60 s | 0 of 78 one-second probes failed through a full rebuild | **PASS** |
| 4 | cold wake < 60 s **with a no-cost plan that avoids sleep** | boot 2 s, restart 1 s — but `cpu-basic` sleeps after ~48 h idle (`gcTimeout` 172800 s) and **no cost-free avoidance plan exists**: a keep-alive ping was explicitly dropped by the founder's earlier PRO delta | **FAIL** (sleep avoidance unmet at zero cost) |

**Verdict: the Space is NOT at least as good on all criteria — the
pre-registered rule therefore recommends staying on Vercel.** Criterion 1
fails on the sandbox numbers and is expected to fail or be marginal from
India (the Space has no India edge region; Vercel serves its cached edge
from wherever the request lands). Criterion 4 is structural on the free
tier: sleep cannot be avoided without paying, and the founder already
dropped the keep-alive ping.

`FOUNDER DECISION NEEDED:` ratify "stay on Vercel" (recommended default;
the Space remains a private staging/measurement target) or order a
migration contrary to the rule — your call; nothing migrates without it.
