# Round 56 evidence — LIVE-TODAY (the dashboard Today view goes live)

Founder order 13 Oct 2026: "make the site live. make sure today page on dashboard is fully working. Also add top 5 losers and top 5 winner stocks on dashboard. use Unofficial data scrapers."

## C5 fail-first — the deliberate-violation RED (the session gate must bite)

```
$ sed -i "s|if (istDateOf(row.observed_at) !== sessionDate) continue; // not this session|// VIOLATION RED: session gate removed|" lib/movers/compute.ts
$ npx vitest run test/movers.compute.test.ts
      Tests  7 passed (7)
exit code: 1 (2 failed) — the session-freshness legs fail exactly as designed; violation reverted (verified 0 occurrences)
```

## C5 — the tie-break leg caught a wrong test expectation before merge (the suite bites)

```
First GREEN attempt: 1 failed — expected ['TCS','INFY',...] to deeply equal received ['INFY','TCS',...] (symbol-asc tie-break: INFY < TCS). The IMPLEMENTATION was right; the expectation was corrected. The test did its job on its own author.
```

## Tier-1/Tier-2 battery (the full pre-push gate)

```
$ npx tsc --noEmit
exit 0 (no output)

$ npx eslint . | tail -1 && npm run lint:ratchet | tail -2

Baseline: 236
Ratchet holds. Reduce the count to lower the bar.

$ npx vitest run | grep -E "Test Files|Tests "
 Test Files  228 passed (228)
      Tests  2473 passed (2473)

$ npm run validate:encoding | tail -1
✅ Encoding validation passed — no mojibake detected

$ npm run build | grep -E "Compiled|Generating"
✓ Compiled successfully in 19.0s
✓ Generating static pages using 1 worker (1020/1020) in 11.0s

$ npm run verify:isr | tail -1
ISR manifest gate: PASS — / initialRevalidateSeconds=60s, /stock/[symbol] template present, 896 baked stock routes (cap 60s)

$ git ls-files | grep -E "(^|/)\.env"
.env.example
```

## The local end-to-end against PRODUCTION data (post-merge, pre-deploy)

```
$ set -a && source .env.local && set +a && TSX_TSCONFIG_PATH=$PWD/tsconfig.json \
    npx tsx --conditions react-server <the session populate script>
warm outcome: {
  "path": "computed",
  "gainers": 5,
  "losers": 5,
  "universeObserved": 827,
  "error": "nse: HTTP 403 | HTTP 403"
}
read-back: derivation=computed universeObserved=827 writtenAt=2026-10-13T15:21:34.954+00:00
  GAINER #1 HATHWAY (Hathway Cable) ₹11.17 15.123% src=yahoo-bulk asOf=2026-10-13T09:52:00+00:00
  GAINER #2 BANDHANBNK (Bandhan Bank) ₹172 9.206% src=yahoo-bulk asOf=2026-10-13T09:45:00+00:00
  GAINER #3 PNCINFRA (PNC Infratech) ₹150.43 8.8% src=yahoo-bulk asOf=2026-10-13T09:58:00+00:00
  GAINER #4 BSOFT (Birlasoft) ₹295.75 8.393% src=yahoo-bulk asOf=2026-10-13T09:32:01+00:00
  GAINER #5 HCLTECH (HCL Technologies) ₹1320.1 7.939% src=yahoo-bulk asOf=2026-10-13T09:45:00+00:00
  LOSER  #1 RBLBANK (RBL Bank) ₹388.3 -7.039% src=yahoo-bulk asOf=2026-10-13T09:45:00+00:00
  LOSER  #2 PCJEWELLER (PC Jeweller) ₹14.05 -6.333% src=yahoo-bulk asOf=2026-10-13T09:58:59+00:00
  LOSER  #3 LXCHEM (Laxmi Organic Industries) ₹175.9 -5.87% src=yahoo-bulk asOf=2026-10-13T09:49:57+00:00
  LOSER  #4 TRF (TRF Limited) ₹215 -5.671% src=yahoo-bulk asOf=2026-10-13T09:59:00+00:00
  LOSER  #5 JUPITER (Jupiter Life Line) ₹241.3 -5.373% src=yahoo-bulk asOf=2026-10-13T09:54:37+00:00

$ curl -s http://localhost:3100/   (after the 60 s ISR regen)
  1 Today&#x27;s Top 5 Losers
  1 Today&#x27;s Top 5 Winners
 20 data-movers-row
  2 tracked symbols observed   (the "827 tracked symbols observed" derivation line)
  Yahoo Finance (unofficial) · Tue 13 Oct, 15:22 IST   (per-row FD-15 attribution)
```

The pre-populate curl served the honest not-generated state (`data-movers-notgenerated`,
"no data yet — … Nothing is estimated") — the fail-closed render before any snapshot exists.

## Merge + deployment state

- PR #433 MERGED 50180b4 (15:14Z), all five CI checks green post-window.
- Migration 033 applied to production Supabase ahead of the deploy (additive, CI-validated).
- Deploy: BLOCKED on the Vercel 100/day quota (402 api-deployments-free-per-day) —
  sporadic retry loop running (B-22 discipline); git integration also watched.
  The deployment + bare-URL live proof + postDeploySmoke append below when it lands.

## The C6 acceptance (16:00-16:02Z, production)

```
[15:58:28Z] attempt 2: 200 dpl_2yB9EoVXadtAtPkiE9CfEYMhi1mw   (quota freed on the sporadic retry)
[16:00:34Z] deploy READY
[16:00:51Z] /api/version: {"sha":"50180b4f64995031bef64d90a84d1c9aab0c7a6d","now":"2026-10-13T16:00:51.211Z"}
[16:01:27Z] force=1 warm 200: movers={"path":"computed","gainers":5,"losers":5,"universeObserved":827,
            "error":"nse: schema: no rankable rows …; payload head: {\"legends\":[[\"NIFTY\",\"NIFTY 50\"],…} |
            schema: Invalid input: expected array, received string; payload head: {\"data\":\"Missing index or key.\"}"}
            isr60.revalidated=8 pagesRendered=8
[16:01:51Z] bare-URL homepage: data-movers-panel PRESENT · "Today's Top 5 Winners" PRESENT ·
            "Today's Top 5 Losers" PRESENT · data-movers-row PRESENT · "tracked symbols observed" PRESENT ·
            "no source yet" PRESENT · data-movers-notgenerated absent
            attribution samples: ["Yahoo Finance (unofficial) · Tue 13 Oct, 15:22 IST", …15:15…, …15:28…]
[16:02:00Z] post-deploy-smoke: PASS (https://rishi-terminal.vercel.app, sha 50180b4f6499)
```

The NSE-first discovery recorded for the follow-up: the production
egress reaches the endpoint (no 403), the payload is legends-keyed with
no top-level row array, and `index=losers` is rejected ("Missing index
or key" — NSE's own `loosers` spelling suspected). The fail-closed
fallback served, disclosed, exactly as designed.
