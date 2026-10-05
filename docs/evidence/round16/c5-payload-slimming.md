# R16 C5 — payload slimming + CLS fixes (raw evidence)

## Forensics (production, 2026-10-05 ~04:20Z, pre-fix)

Route payloads measured from live HTML (flight = `self.__next_f.push` chunks):

```
== /screener ==
  HTML: 2196.7 kB raw, 97.1 kB gzip
  flight data: 855.8 kB raw, 56.9 kB gzip (59% of page gzip)
  top keys: namex7336, fullx6412, labelx6412, scorex6412, originx4580,
            sectorx917, symbolx917, consensusx917, ...
== /lab ==
  HTML: 1025.6 kB raw, 64.8 kB gzip
  flight data: 857.2 kB raw, 57.5 kB gzip (89% of page gzip)
== / ==
  HTML: 65.4 kB raw, 10.0 kB gzip
```

`full`/`label` appear 6,412 times (7 per stock x 916) and `origin` 4,580 —
the same ~39 distinct verdict-metadata objects re-serialized per stock.

## After the fix (local production build, same methodology)

```
route          html raw   html gz   flight raw   flight gz
/screener      1404.0kB    64.6kB      181.1kB     27.0kB
/lab            484.5kB    52.6kB      396.0kB     46.9kB
/chat           248.8kB    32.7kB      181.3kB     27.0kB
```

Codec unit economics: rows JSON 846.1 kB -> wire JSON 384.9 kB (45.5%);
gzip 55.7 -> 44.8 kB; legend = 39 entries (vs 6,412 serializations).

## CLS fix (stock page)

Fail-first (pre-fix build, `npx playwright test test/smoke/c5-cls-stock.spec.ts`):
`Expected: < 0.01 / Received: 0.04131778041521708` — matches Lighthouse's
mobile CLS 0.053 on /stock/BANKBARODA (layout-shift trace: the observation
line "Delayed · Yahoo Finance (unofficial)" + the 52W bar growing the tile).
Post-fix: `1 passed` (CLS < 0.01, attribution positive control included).

## Lighthouse battery (production, mobile, pre-fix)

```
route              perf     FCP     LCP    TTFB     CLS      TBT
bonds                92   0.92s   2.51s   0.01s 0.0143    0.25s
forex                92   0.92s   2.39s   0.01s 0.0141    0.29s
home                 87   1.48s   2.55s   0.01s 0.0001    0.31s
lab                  80   1.30s   3.46s   0.01s 0         0.46s
news                 90   0.92s   2.43s   0.00s 0.0032    0.32s
pulse                88   0.96s   2.95s   0.01s 0.0012    0.31s
rishis               95   0.92s   1.90s   0.01s 0         0.24s
screener             62   1.41s   3.24s   0.01s 0         7.44s
stock_BANKBARODA     84   0.93s   2.53s   0.01s 0.0528    0.50s
stock_RELIANCE       84   0.98s   2.52s   0.01s 0.0015    0.53s
```

/screener TBT 7.44 s root cause: the `bootup-time` trace attributes
6,737 ms of scripting to the framework chunk that hydrates the 916-row
table (7k+ cells). The payload cut does not materially change TBT; the
structural options (server-render first N rows + client "load more",
or virtualization) would REMOVE rows from the first byte — Constitution
C9's guarded trade, escalated separately as FOUNDER DECISION NEEDED.

## Route sweep (production, 51 GET routes, pre-fix)

```
== tally ==
  200: 39   400: 1   401: 2   404: 8   405: 1   5xx: 0
== slowest 8 ==
    2633 ms  200  /api/news
    2513 ms  200  /api/prices?symbol=RELIANCE
    1223 ms  200  /api/version
    1187 ms  200  /api/fundamentals?symbol=RELIANCE
    1036 ms  200  /
     999 ms  200  /api/health
```

Non-200s verified correct: registry 404s (BOGUSXYZ), POST-only 405
(/api/screener/query GET), auth gates 401, unbuilt /api/alerts (X3-08,
Round 16 C7), param-missing 400 (/api/gurus).

## BLOCKED: 24 h runtime-log tally

`GET /v2/projects/{id}/logs` and `/v1/projects/{id}/runtime-logs` return
404 on this plan; `GET /v2/log-drains` is `[]`. The Hobby plan exposes no
runtime-log API or retention. Options: Vercel Pro (log retention) or a
log drain to a third-party destination — vendor/plan choice = founder
decision. The route sweep above is the point-in-time alternative.
