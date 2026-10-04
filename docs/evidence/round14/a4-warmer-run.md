# A4 — Run the warmer (evidence)

## 1. Auth posture (A4 step 1) — live probes against production

```
$ curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=0&of=6"
401                      <- unauthenticated probe

$ H='Authorization: Bearer wrong-secret'
$ curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "$H" "https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=0&of=6"
401                      <- wrong-secret probe (re-verified live 2026-10-04T13:21Z, exact session above)
```

`QUOTES_WARM_SECRET` confirmed present in the Vercel project env
(target=production,preview, type=sensitive — Vercel API /v9/projects/.../env).

## 2. Manual workflow_dispatch (A4 step 2)

Run URL: https://github.com/prateekm1007/rishi-terminal/actions/runs/37203104979
(event=workflow_dispatch, ref=main, status=completed, conclusion=success)

Raw slice outputs (all six slices returned HTTP 200; the endpoint no-ops
honestly outside the session, exactly as the workflow's defense-in-depth
design documents):

```
== slice 0/6 ==  HTTP 200
{"warmed":0,"skipped":"market closed","market":{"open":false,"ttlSeconds":null,"freshness":"close","sessionDate":"2026-10-02"},"note":"no-op outside the NSE session (Mon-Fri 09:15-15:30 IST); force=1 with the same Bearer secret overrides for verification runs"}
== slice 1/6 ==  HTTP 200   (same shape)
== slice 2/6 ==  HTTP 200   (same shape)
== slice 3/6 ==  HTTP 200   (same shape)
== slice 4/6 ==  HTTP 200   (same shape)
== slice 5/6 ==  HTTP 200   (same shape)
== warmer run complete ==
```

## 3. Forced verification run (same secret, force=1, Sunday 2026-10-04 ~12:52-12:58 UTC)

To prove the pipeline beyond a no-op, all six slices were called with
`force=1` outside the session (the route's documented verification path):

```
slice 0: {"slice":0,"of":6,"universe":916,"inSlice":153,"equities":{"upstreamWrites":0,"served":133,"misses":20},"tiles":{"upstreamWrites":0,"served":12,"misses":4},"market":{"open":false,"ttlSeconds":null,"freshness":"close","sessionDate":"2026-10-02"},"forced":true}
slice 1: served 120, misses 33 (of 153)
slice 2: served 125, misses 28 (of 153)
slice 3: served 130, misses 23 (of 153)
slice 4: served 125, misses 27 (of 152)
slice 5: served 129, misses 23 (of 152)
```

All HTTP 200. `upstreamWrites: 0` is the CORRECT closed-market behavior:
no NSE session is open, so the quote path serves the LAST SESSION
observation (Friday 2026-10-02 per `sessionDate`) instead of re-fetching
an unchanged market from the free upstream. The serve/miss split
(762 served of 916 on this pass) shows the claim+bulk path and the cache
serving real data; misses retry on the next cycle (claim expiry 30 s).

## 4. Live coverage during NSE hours — SCHEDULED (Monday session)

The A4 acceptance metric — `select count(*) from quote_cache where
observed_at > now() - interval '30 minutes'` ≥ 90% of 916, with
`/api/health` agreeing and a fresh `/stock/BANKBARODA` fetch showing a
price — is only meaningful INSIDE a trading session. Today (2026-10-04)
is Sunday; the deployment's health honestly reports `fresh: 0` with
`windowSeconds: 1800` because no row can be younger than 30 minutes on a
day with no session.

The warmer's cron (`*/15 3-10 * * 1-5` UTC) starts the Monday session
runs at 03:00 UTC (08:30 IST) and the endpoint gates precisely on
marketState. The coverage evidence will be captured in the first
Monday-session window (2026-10-05, 09:15 IST onwards) — the founder's A4
text itself schedules this ("so also run the next weekday session").
Nothing here blocks later items; the metric is time-gated, not blocked.
