# Y1 — production evidence (post-deploy)

Deployment: **dpl_3vNw9k8nR4jPCrvAQv7wWzBAgEka** (state READY), serving
**4bebbd5** = merge of PR #118. One production deploy for this merge
(merges earlier in the window: none). `/api/version`:

```
{"sha":"4bebbd517fe5bcc1ccd6d6ba2f387b36b623f45d","now":"2026-10-04T00:41:44.022Z","node":"v24.21.0"}
```

## Route rendering on live headers (was `MISS` + `no-store` pre-Y1)

```
== headers: / ==
age: 0
cache-control: public, max-age=0, must-revalidate
x-vercel-cache: PRERENDER
== headers: /stock/SBIN ==
age: 0
cache-control: public, max-age=0, must-revalidate
x-vercel-cache: PRERENDER
```

## AFTER TTFB — same panel, same script, production (2026-10-04T00:44–00:47Z)

First panel (`bash scripts/measureTtfb.sh https://rishi-terminal.vercel.app 4`,
begun ~2 min after deploy readiness — pass 1 is the edge fill of fresh bakes):

```
cold (pass 1): n=10 p50=0.593s p95=1.107s max=1.107s   <- first-hit edge fill, not render cost
warm (pass 2): n=10 p50=0.324s p95=0.359s max=0.359s   <- residual regional MISSes
warm (all passes 2+): n=30 p50=0.091s p95=0.341s max=0.359s
```

Steady-state panel (second run, 3 passes, edge warm):

```
cold (pass 1): n=10 p50=0.090s p95=0.112s max=0.112s
warm (pass 2): n=10 p50=0.086s p95=0.109s max=0.109s
warm (all passes 2+): n=20 p50=0.087s p95=0.118s max=0.126s
```

| Panel (warm) | BEFORE (force-dynamic) | AFTER (ISR) |
|---|---|---|
| p50 | 0.315 s | **0.087 s** |
| p95 | 0.356 s | **0.118 s** |
| max | 0.399 s | **0.126 s** |

Founder acceptance "warm page TTFB <= 300 ms p95": met with margin in
steady state; the post-deploy pass-1 tail is edge fill of a fresh bake
(a one-time event per PoP per deploy), honestly reported.

## X3 non-regression on the ISR serving path

```
curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -c "FETCHING"        -> 0
curl -s -H 'Cache-Control: no-cache' https://rishi-terminal.vercel.app/ | grep -c "Connecting\|RANKINGS_ENABLED\|——" -> 0
```

First-byte price (after regeneration, cache holds SBIN/CANBK rows):

```
$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -o "Observed[^<]*<[^>]*>[^<]*"
Observed 9:45:00 am
$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -o "CACHED · YAHOO-BULK\|price unavailable" | sort | uniq -c
      1 CACHED · YAHOO-BULK
      6 price unavailable
$ curl -s https://rishi-terminal.vercel.app/stock/CANBK | grep -o "CACHED · YAHOO-BULK\|price unavailable" | sort | uniq -c
      1 CACHED · YAHOO-BULK
      6 price unavailable
```

The 6 "price unavailable" rows are the peer-table rows and non-equity
tiles — nothing warms the cache for them and they are not peeked; that is
exactly founder defect 2 = Y2, not a Y1 regression (the same rows were
unavailable placeholders under force-dynamic until the client fetch ran).

## Known follow-ups observed during verification (reported, not fixed here)

1. `Observed 9:45:00 am` still lacks date/timezone/market-state — Y3.
2. Peer rows and index/crypto/gold tiles render "price unavailable" in the
   first byte — Y2 (warmer + peer peek + tile cache).
3. CI "PROVENANCE.md drift gate" regenerates with the RUN date, so ANY
   commit made on a day after the committed snapshot drifts (this PR's
   first CI run failed on a date-only diff: 2026-10-03 -> 2026-10-04,
   classification counts identical). Reported per Constitution
   stop-and-report; the regenerated snapshot rides in this PR's commit.
