# RESP-1R — the live claim reconciled on BOTH cache keys (2026-10-12)

Founder's round-49 scorecard: "The ledger says production serves 7682263,
probe green, 'verified live'. The public RELIANCE page still shows the
pre-fix content." Ordered: reconcile (C6) — run the smoke with
`--expect-sha 02eac31`, paste `curl -sI`, count "HIGH Data" in the body,
purge if the page is stale, correct the ledger until the two agree.

## Verdict

- The debt-clear claim STANDS: production serves `02eac3166401…` (main tip;
  it advanced 7682263 → aab1eb1d → 02eac31 after the 02:08Z ledger entry).
- The public bare URL does NOT show the leak content any more (0 markers,
  below) — the founder's stale observation does not reproduce.
- ROOT MECHANISM confirmed real and closed: the smoke fetched a DIFFERENT
  cache key than users (`?smoke=<ts>` always misses the edge ISR cache), so
  a stale edge copy could never fail the probe. Hardened in this round:
  every content probe now runs on both cache keys.

## Evidence 1 — hardened smoke, production, both cache keys (exit 0)

```
$ node scripts/ci/postDeploySmoke.mjs --base https://rishi-terminal.vercel.app \
    --expect-sha 02eac31664013b80d568c55d6d914d86420af357
PASS  version — live sha 02eac3166401 (matches expected)
... (probe-key legs unchanged, all PASS)
PASS  bare-cache seedleak RELIANCE record-control — record class: seed (seed=1 missing=0 verdict-sections=0/2)
PASS  bare-cache seedleak RELIANCE "HIGH Data" — 0 occurrence(s) (must be 0 …)
PASS  bare-cache seedleak RELIANCE "REDUCE" — 0 occurrence(s) (must be 0 …)
PASS  bare-cache seedleak RELIANCE old QVPS badge "v2.0 · <grade> Data" — 0 occurrence(s) (must be 0 …)
PASS  bare-cache seedleak RELIANCE QVPS score on seed record — 0 occurrence(s) …
post-deploy-smoke: PASS (https://rishi-terminal.vercel.app, sha 02eac3166401)
EXIT=0
```

40/40 checks PASS (probe key + bare-cache key).

## Evidence 2 — `curl -sI` on the bare user-facing URL

```
$ curl -sI https://rishi-terminal.vercel.app/stock/RELIANCE
HTTP/2 200
age: 5
cache-control: public, max-age=0, must-revalidate
etag: "4o5ve8cmja1tbh"
x-matched-path: /stock/RELIANCE
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-vercel-cache: HIT
x-vercel-id: hkg1::iad1::4qs47-1791781062029-836ebf6c7a0c
```

## Evidence 3 — "HIGH Data" count in the body (raw AND comment-stripped)

```
$ curl -s https://rishi-terminal.vercel.app/stock/RELIANCE -o bare.html
bytes: 84827
HIGH Data count: 0        REDUCE count: 0      QVPS Score: 0
comment-stripped: HIGH Data 0 | REDUCE 0 | old badge 0 | "Avoid" 0 | seed marker 1
```

The 5 bare "QVPS" strings on the page are honest NEGATIVE statements
("no consensus, no per-Rishi verdicts and no QVPS are produced on seed
data" ×4 in meta/flight, "consensus, QVPS, metrics and verdicts on this
page are illustrative placeholders" ×1 in the seed disclaimer).

## Evidence 4 — the stale copy was observable, then revalidated

Three bare-URL samples ~4 s apart, mid-audit:

```
sample 1: x-vercel-cache: STALE  age: 202  etag "4o5ve8cmja1tbh"  84827 B  0 leaks
sample 2: x-vercel-cache: HIT    age: 3    etag "yri4s9rlh51tbj"  84829 B  0 leaks
sample 3: x-vercel-cache: HIT    age: 7    etag "yri4s9rlh51tbj"  84829 B  0 leaks
```

The edge serves a stale object while revalidating in the background
(stale-while-revalidate; `x-nextjs-stale-time: 300`). A PoP's first
request after a deploy can therefore serve the pre-fix object ONCE; the
etag transition above is that revalidation being observed live. This is
the mechanism consistent with the founder's fetch (first hit on their
PoP after the 02:53Z deploy), alongside browser cache on their side.

## Evidence 5 — the gate now bites (fail-first, C5/rule 24)

Mock server (scratch, outside the repo): serves FRESH post-fix content on
any `?smoke=` URL and STALE leak-era content (`v2.0 · HIGH Data`,
`QVPS Score 44`, `Avoid · REDUCE`) on the bare URL — the exact
probe-green/users-stale class.

Pre-change script (saved copy) on the same mock — the blind spot,
reproduced: PASS, exit 0, while the bare URL serves the leaks.

```
$ node postDeploySmoke.OLD.mjs --base http://localhost:4653 --expect-sha bbbb…
PASS  seedleak RELIANCE "HIGH Data" — 0 occurrence(s) (must be 0 …)
post-deploy-smoke: PASS (http://localhost:4653, sha bbbbbbbbbbbb)
OLD-SCRIPT EXIT=0
```

Hardened script on the same mock — the bite:

```
PASS  seedleak RELIANCE "HIGH Data" — 0 occurrence(s) (must be 0 …)   [probe key: fresh]
FAIL  bare-cache seedleak RELIANCE "HIGH Data" — 1 occurrence(s) (must be 0 …)
FAIL  bare-cache seedleak RELIANCE "REDUCE" — 1 occurrence(s) (must be 0 …)
FAIL  bare-cache seedleak RELIANCE old QVPS badge "v2.0 · <grade> Data" — 1 occurrence(s) …
FAIL  bare-cache seedleak RELIANCE QVPS score on seed record — 1 occurrence(s) …
post-deploy-smoke: FAIL — 4 failed check(s)
NEW-SCRIPT-ON-MOCK EXIT=1
```

## Purge decision

The RESP-1R order's purge branch is conditioned on "the probe passes AND
the page still shows HIGH Data". The second condition is false as of this
audit (Evidence 3), so no purge was required; the gate hardening removes
the blind spot that made the purge decision necessary at all.
