# E6-11 — Load and abuse testing

## Acceptance clauses (docs/ROADMAP.md) and their disposition

| Clause | Result | Where |
|---|---|---|
| p95 < 800 ms for `/api/prices/batch` at 50 rps (PROPOSED budget) | measured, honest caveats | §1 |
| Rate limiter returns 429 above the limit | **GREEN on the live deployment** (60 × 200 then 15 × 429, exactly the documented 60/60 s bound) | §2 |
| Chat quota holds under 50 parallel requests | CI-gated at the SQL level: the W3-A concurrency storm extended 24 → 50 parallel `reserve_rate_limit` sessions | §3 |

## §1 k6 latency profile — what was measured, what it means

```
$ npm run build && npm run start        # local production build of the same commit
$ k6 run -e TARGET=http://localhost:3000 scripts/load/api.js

  ✓ 'p(95)<800' p(95)=3.555346

  █ TOTAL RESULTS
    CUSTOM
    batch_admitted_ms..............: avg=4.927589 min=1.949666 med=2.479189 max=475.617983 p(90)=3.212808 p(95)=3.555346
    HTTP
    http_req_duration..............: avg=4.73ms   min=1.94ms   med=2.52ms   max=475.61ms   p(90)=3.46ms   p(95)=3.77ms
    http_req_failed................: 0.00%  0 out of 3451
    http_reqs......................: 3451   31.372425/s
running (1m50.0s), 000/060 VUs, 3451 complete and 0 interrupted iterations
homepage     ✓ [ 100% ] 00/20 VUs    45s   10.00 iters/s
prices_batch ✓ [ 100% ] 000/040 VUs  1m0s  50.00 iters/s
```

**Honest reading (rule 16):** the local build runs WITHOUT Supabase env, so
every batch request takes the documented fail-fast path (registry gate →
honest per-symbol missing-data semantics, no DB peek, no upstream call). The
3.6 ms p95 therefore measures the route's control plane under 50 rps —
parsing, registry validation, response assembly — and NOT the warm-cache
peek path or upstream latency. The warm-cache path is the one the
< 800 ms budget was proposed against; its production numbers live in the
Y1/Y2 evidence (ISR TTFB p95 ≈ 0.15 s warm). The budget stays PROPOSED
until the founder ratifies it; this run's reading should be cited
accordingly, never as "the budget is met on production".

**Deviations, recorded per the roadmap text:**

1. The acceptance says "against staging". The staging project is
   quota-suspended and database-less by design (Z1 rule 1; P0-03 remains
   founder-blocked). A local production build of the same commit is the
   honest stand-in for the app tier.
2. The per-IP limiter FAILS OPEN without its DB store (documented failure
   direction — abuse defense-in-depth, not accounting; the daily quota
   fails CLOSED behind it). So the local k6 run could not exercise 429s;
   §2 does that on the live deployment instead.
3. Chat is NOT synthetically load-tested end to end: anonymous chat is
   spend-capped globally (W3) and PoW-challenged (X7) — synthetic parallel
   chats would burn real global budget or be refused pre-provider, and a
   test that consumes the users' shared quota to prove the cap is the
   abuse it tries to detect. The quota's 50-parallel acceptance is proven
   one level down, where it is both stronger and side-effect-free (§3).

## §2 Rate limiter 429 — live deployment (GREEN)

Raw output: `docs/evidence/round14/e6-11-prod-429.txt`.

```
$ curl -s -o /dev/null -w "%{http_code} " -X POST \
    -H "Content-Type: application/json" \
    -d '{"symbols":["RELIANCE","TCS","HDFCBANK","INFY","SBIN"]}' \
    $(75 copies of https://rishi-terminal.vercel.app/api/prices/batch) \
  | tr ' ' '\n' | uniq -c

     60 200      <- admitted, full CACHED payloads from the quote cache
     15 429      <- {"error":"Too many requests"}
```

Method note (recorded because the FIRST two probes looked like a defect):
this sandbox's egress IP rotates per connection, so spaced probes landed on
many different `data:ip:*` limiter keys (visible in `rate_limits`), each far
below the cap — that is the limiter working as designed against rotated
clients, not a bypass. The single keep-alive connection pins one egress IP
= one key, and the bound bites at exactly 60.

## §3 Chat quota under 50 parallel — SQL-level, CI-gated

`.github/workflows/ci.yml` W3-A step extended: 50 parallel psql sessions
each reserve 10 against a limit of 100 on one key — 500 requested, EXACTLY
100 admitted, the counter never exceeds the cap. `reserve_rate_limit` is
the same atomic, WHERE-guarded upsert that backs the chat global-spend
reservation (migration 020) and the per-IP burst limiter's sibling. The
assertion's bite is pinned by the boundary checks in
`scripts/ci/global_spend_invariants.sql` (G1a/G1b: exact-fit admitted,
over-limit refused — proven RED-capable when W3-A landed, PR lineage #102).

## Tooling

- `scripts/load/api.js` — the k6 profile (parameterized `TARGET`, admitted/
  rejected latency split). k6 binary: v1.4.0, installed outside the repo
  (`~/.local/bin/k6`); no repo dependency added.
