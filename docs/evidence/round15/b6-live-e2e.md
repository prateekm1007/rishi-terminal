# B6 — live end-to-end verification of the Round-14 features (Round 15)

All probes against production `9c05a96` (2026-10-04 23:03–23:08 UTC), raw
outputs. No secrets — the Supabase publishable key used for the auth probes
is the public anon key from the site's own bundle.

## 1. Screener v2 — run a query (anonymous, live)

```text
$ curl -s -X POST -H "Content-Type: application/json" -d '{"q":"pe > 0 and roe > 15"}' \
    https://rishi-terminal.vercel.app/api/screener/query
HTTP 200 (1.903521s)
{"ok":true,"count":435,"elapsedMs":163.35,"rows":[{"symbol":"360ONE","name":"360 One WAM","sector":"Fintech","consensus":62,"category":"Balanced Risk-Reward","dataQuality":"OK","topBull":{"name":"Nemish","full":"Nemish Shah","label":"Steady Compounder","score":90},…
```

(GET returns 405 — the query route is POST-only by design.)

## 2. Screener v2 — CSV export (anonymous, live)

```text
$ curl -s "https://rishi-terminal.vercel.app/api/screener/export?q=pe%20%3E%200%20and%20roe%20%3E%2015"
HTTP 200 (1.414937s, 38460 bytes)
symbol,name,sector,consensus,category,dataQuality,pe,roe,mktcap,de,revcagr,fcf
360ONE,360 One WAM,Fintech,62,Balanced Risk-Reward,OK,32,20,985000,0.5,10,4000
AARTIDRUGS,Aarti Drugs,Pharma,76,High Conviction Quality,OK,28,16,3800,0.2,14,100
…
436 lines total (header + 435 matches — agrees with the query count)
```

## 3. Rishi Council view (anonymous, live, first byte)

The Council renders server-side on the stock page (raw HTML of
/stock/BANKBARODA, fetched 2026-10-04 22:13 UTC):

```text
Council: 2 occurrences   Dissent: 2 occurrences   (in the 182 kB raw HTML)
```

## 4. Auth gates (the ugly paths — Constitution 22, live)

```text
GET    /api/screens                          -> 401 {"ok":false,"error":"Sign in to use saved screens."}
POST   /api/screens                          -> 401 {"ok":false,"error":"Sign in to use saved screens."}
DELETE /api/screens/00000000-…               -> 401 {"ok":false,"error":"Sign in to use saved screens."}
GET    /api/portfolio/summary                -> 401 {"ok":false,"error":"Sign in to see your portfolio."}
POST   /api/portfolio/import                 -> 401 {"ok":false,"error":"Sign in to import a portfolio."}
```

## 5. Screener hostile queries (live, parser totality)

```text
"pe >"                          -> 400 {"message":"unexpected end of query","position":4}
"drop table"                    -> 400 {"message":"unknown field \"drop\" — allowed: pe, roe, mktcap, de, r…
"))))"                          -> 400 {"message":"expected a field, number or string","position":0}
"pe > 9999999999999999999999"   -> 400 {"message":"number out of range: 9999999999999999999999","position":5}
"__proto__"                     -> 400 {"message":"expected a comparison (e.g. pe > 10) — a bare value is n…
```

## 6. BLOCKED: the authenticated flows (save/delete a screen, import a portfolio CSV)

`BLOCKED: live authenticated e2e — the Supabase project requires email
confirmation for sign-up, and this session has no mailbox.` Probes tried,
raw:

```text
POST /auth/v1/signup {"email":"rishi-b6-probe.<rand>@gmail.com","password":"…"}
  -> HTTP 200, NO session, user unconfirmed (confirmation email required)

POST /auth/v1/signup {"data":{…}}            (anonymous sign-in)
  -> HTTP 422 {"error_code":"anonymous_provider_disabled"}
```

The UI offers magic-link email and Google OAuth only (app/auth/signin) —
both need an inbox/Google account. Options for the founder (cheapest
first):

1. Provide a test account (any confirmed email + password, or paste a
   session token) — I will run the full save/delete/query/import battery
   and paste status codes + payloads.
2. Approve a temporary confirmation-off window on the Supabase project
   (would use the Supabase Management PAT — reminder per rule 36; revert
   immediately after).
3. Enable anonymous sign-ins for a probe window (same reminder; revert
   after).

Until then the authenticated surface is covered by: the CI RLS invariants
(the founder reproduced them on a clean harness — X3-05/X3-07 blocks),
the B3 cap triggers (51st screen/21st import/501st position rejected as
`authenticated`), and the 401 gates above.

## 7. Warmer state at probe time (Sunday 23:07 UTC — market closed)

```text
$ curl -s https://rishi-terminal.vercel.app/api/health
"quoteCache": {"equities": {"fresh": 0, "total": 916, "coverage": 0}, …},
"reasons": ["prices: no ingestion recorded yet", …]
```

0/916 fresh is the expected closed-market state (30-minute freshness
window, weekend). The B5 coverage evidence is captured inside the Monday
NSE session after the warmer's cron cycles (protocol in the B5 section of
the round evidence).
