# Round 14 — deployment catch-up after the second quota exhaustion

**Context:** the Round-14 merge burst (#140–#148, 09 merges 12:42–14:25 UTC)
hit the Vercel Hobby 100-deployments/24h team cap a second time. Production
froze at `47d76c4` (A2); main `a4a7486` sat 4 code commits ahead. Remedy per
`docs/RELEASE.md` policy 4: the sanctioned API retry. This file records the
raw outputs of the catch-up and the production acceptance for the four
rate-limited code merges.

## 1. The rate-limited window (raw)

```
$ curl -s -H "Authorization: token $TOKEN" \
    https://api.github.com/repos/prateekm1007/rishi-terminal/commits/a4a7486/status
state: failure
  Vercel – rishi-terminal-staging | failure | Deployment rate limited — retry in 24 hours.
  Vercel – rishi-terminal         | failure | Deployment rate limited — retry in 24 hours.
  (identical on e678e49, 9baa92a, 67f153d, 5fc16c7 — every merge after 13:14:49Z)

$ POST /v13/deployments {name:"rishi-terminal", target:"production",
                         gitSource:{github, prateekm1007/rishi-terminal, main}}
http=402
ERROR: payment_required | Resource is limited - try again in 24 hours
       (more than 100, code: "api-deployments-free-per-day").
```

A rejected creation consumes no quota event (verified 2026-10-04, RELEASE.md
ledger row `e18d6a9`/`1628ade`), so the retry loop re-fires harmlessly.

## 2. The catch-up deploy (raw)

```
$ POST /v13/deployments (same body) at 2026-10-04T14:48:02Z
http=200 — CREATED dpl_CEjogr5gFhh7gb7hWke5eAwJBitZ

$ GET /v13/deployments/dpl_CEjogr5gFhh7gb7hWke5eAwJBitZ (poll)
14:48:13 BUILDING
14:48:34 BUILDING
14:48:54 BUILDING
14:49:15 BUILDING
14:49:36 BUILDING
14:49:57 READY  rishi-terminal-cbd71nuvv-prateeks-projects-8c5639bd.vercel.app
```

## 3. Production acceptance (raw) — script `scripts/round14_prod_acceptance.sh`

```
== deployed SHA ==
a4a748600e4d23e48959ffe64623b732c7ed66e9  (== main tip)

== A5: /methodology in the nav (PR #142) ==
defect-grep  href="/methodology" on /            : 1   (pre-fix: 0)
positive-ctl count of nav links href="/ on /       : 32

== R4-04: Rishi Council view on the stock page (PR #144) ==
defect-grep  'Rishi Council' on /stock/RELIANCE     : 2   (pre-fix: 0)
positive-ctl (A1-era rendered content) 'Wisdom' : 6, 'Metrics' : 5, 'Peer' : 3
  (note: 'Top Rishi Scores' no longer exists — A1 replaced the heading;
   the corrected positive control is any A1-era rendered marker)

== X3-05: screener v2 (PR #146) ==
$ POST /api/screener/query  {"q":"mktcap > 100000 and roe > 15"}
{"ok":true,"count":239,"elapsedMs":94.27,"rows":[{"symbol":"360ONE",...
$ POST /api/screener/query  {"q":"DROP TABLE users; --"}
{"ok":false,"error":{"message":"unexpected character \";\"","position":16}}
  (injection fail-closed; GET /api/screener/query → 405 route-exists probe;
   pre-fix both were 404)

== X3-07: portfolio import + summary (PR #148) ==
defect-probe  POST /api/portfolio/import            : 401   (pre-fix: 404)
defect-probe  GET  /api/portfolio/summary           : 401   (pre-fix: 404)
positive-ctl  GET  /api/health                      : 200

== A1 regression guard: warm TTFB spot check (curl time_starttransfer) ==
/                 : try1=0.323846 try2=0.094913
/stock/RELIANCE   : try1=0.317067 try2=0.152765
  (warm second fetches ≤ 153 ms — ISR holds; the Y1 ≤300 ms proposal is met)
```

## 4. Local battery on the merged tree (raw)

```
npx tsc --noEmit                    exit 0
npx eslint .                        ✖ 301 problems (0 errors, 301 warnings) — ratchet holds (baseline 301)
npx vitest run                      Test Files  138 passed (138) / Tests  1451 passed (1451)
npm run validate:encoding           ✅ no mojibake detected
npx tsx scripts/validateStocks.ts   916 symbols, all T12 gates passed
npx tsx scripts/scoreParity.ts      0 mismatches / 0 non-finite of 916
npm run build                       exit 0 — /api/portfolio/import, /api/portfolio/summary,
                                    /api/screener/export, /api/screener/query in the route manifest
```

## 5. Anonymous-chat spot check on the deployed SHA (raw)

```
$ POST /api/chat {"personaId":"buffett","symbol":"RELIANCE","message":"What is the ROE of RELIANCE?"}
http=200
{"text":"roe = 8.91 percent — live (no disclosed observation time)",
 "provenance":{"provider":"chat-api","model":"agnes-2.5-flash","grounded":true,
               "claimsVerified":true,"groundingMode":"structured-claims",
               "structuredResponse":"valid", ...}}
  (no challenge on a fresh identity — the X7/A2 PoW engages past the
   per-identity threshold; the grounded verified surface is server-generated)
```

## 6. Consolidated founder-decisions register

Posted on #148: <https://github.com/prateekm1007/rishi-terminal/pull/148#issuecomment-5981232160>
— bundles budget (#140), S2-01 content ratification (#139), managed challenge
provider (#136), Vercel plan upgrade (RELEASE.md policy 5), FD-1 vendor,
staging Supabase (P0-03), ANON_ID_PEPPER/CHAT_* env, FD-13..16, auditor
egress allowlist.
