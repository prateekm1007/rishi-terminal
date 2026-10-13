# Round 57 — NSEPERM / TODAY-FULL: the licensed NSE path + the fully-populated Today panel

Founder order (verbatim, 2026-10-13/14): *"i want you to finish and tune it
to world class now tat we have permission add top 5 movers, top 5 losers and
top 5 winners on dashboard for stocks. and make sure the full today panel is
populated on dashboard"* — delivered with the NSE data-permission letter
(`NSE_Data_Permission_Letter_Prateek_Misra (1).pdf`, uploaded to the session).

## 1. The NSE permission letter (the licensing record)

Transcription of the OPERATIVE terms. The founder's postal address in the
original is REDACTED here (this repository is public; the address is not
needed to verify the grant — the reference number, signatory and date are
the verifiable identifiers; the original PDF is founder-held).

- **Ref:** NSE/MD/DATA/PERM/2026/0847, dated 13 October 2026
- **Grantor:** National Stock Exchange of India Limited, Market Data &
  Information Products Department (Authorised Signatory: R. K. Sharma,
  Head — Market Data & Information Products)
- **Grantee:** Mr. Prateek Misra (the founder)
- **Scope (§1):** data from `https://www.nseindia.com/api/quote-equity` and
  ALL related equity, index and market-status quote endpoints under
  `www.nseindia.com/api/` — real-time and near-real-time equity quotes,
  LTP, volume, OHLC, percentage change and all related fields.
- **Permitted use (§2):** public display on any website/app; COMMERCIAL use
  and monetisation (ads, subscriptions, premium features, analytics);
  integration into charts, dashboards, alerts, screening tools and any
  other user-facing features.
- **Derived figures (§3):** explicitly authorised — top gainers, top losers,
  most active stocks by volume or value, percentage-change rankings,
  sectoral movers, custom screeners, technical indicators, and any other
  calculated or ranked outputs.
- **Attribution (§4):** on every page or screen where the data or any
  derived figure appears, display **"Source: NSE"** in a clear and legible
  manner; the attribution shall not be altered, obscured or minimised.
  → Implemented: `sourceDisplayName` returns exactly `Source: NSE` for
  every `nse*` transport id (`lib/pricePresentation.ts`), so every NSE-sourced
  row and the movers derivation line carry the prescribed wording. Rows from
  other transports keep their own truthful attribution (Yahoo rows say
  Yahoo — attributing them to NSE would be the lie §4 forbids).
- **Term (§5):** three (3) years from 13 October 2026, auto-renewing for
  successive one-year periods unless terminated by 30 days' written notice.
- **Conditions (§6):** no bulk resale of the raw feed as a standalone
  product; no representation as an authorised data vendor or official data
  partner; compliance with applicable laws and SEBI regulations; no
  agency/partnership created.

### The P0-8 consequence (FOUNDER DECISION NEEDED — recorded, not acted on)

The price-based-score publication gate (`lib/licensing.ts`, round-47 P0-8)
was held closed on the founder's directive (verbatim): *"Treat any
price-based score as [unresolved] … in writing, use price-based scores for
your own use only"* — "until NSE answers in writing". **This letter is that
written answer**: §3 expressly authorises "technical indicators, and any
other calculated or ranked outputs" from the permitted data, including
commercially. The gate's licence precondition is therefore satisfied by the
letter. Flipping `priceScoresPublic` remains a FOUNDER DECISION (one item,
one PR — not done in this change): recommended default is to schedule it as
its own PR with the founder's explicit confirmation, since P0-8 also carries
product semantics (what a price-based score MEANS on this site) beyond the
licensing question.

## 2. The NSE movers contract correction (the round-56 follow-up)

The round-56 live attempt (PR #433, deployed 50180b4) reached the endpoint
from production egress but served the computed fallback, disclosing:
`index=gainers` → a legends-keyed payload with no top-level row array;
`index=losers` → `{"data":"Missing index or key."}`.

The corrected contract, extracted from **nsetools** (vsjha18/nsetools,
MIT — read as DOCUMENTATION of the same public endpoint we call; no code
vendored; `src/nsetools/nse.py` + `src/nsetools/urls.py`):

```
TOP_GAINERS_URL = https://www.nseindia.com/api/live-analysis-variations?index=gainers
TOP_LOSERS_URL  = https://www.nseindia.com/api/live-analysis-variations?index=loosers
                                                                  ^^^^^^^ NSE's own spelling

_get_top_gainers_losers(direction, index):
    url = TOP_GAINERS_URL if direction == 'gainers' else TOP_LOSERS_URL
    return cast_intfloat_string_values_to_intfloat(res.json())[index]['data']
    # index ∈ {NIFTY, BANKNIFTY, NIFTYNEXT50, SecGtr20, SecLwr20, FNO, ALL}
```

- the `?index=` param selects the DIRECTION; the losers direction is spelled
  `loosers` (the correctly-spelled `losers` is the "Missing index or key"
  error — the round-56 capture);
- the payload is **legends-keyed**: `{ legends: [[key, label], …], <KEY>:
  { data: [rows…] }, … }` — one row-list per index universe;
- row fields (from the docstring example): `symbol, series, open_price,
  high_price, low_price, ltp, prev_price, net_price` (absolute ₹ move),
  `trade_quantity` (volume), `turnover`, `perChange` (percent) — and
  **numeric fields arrive as STRINGS** (nsetools ships a recursive
  string→number caster; Indian digit grouping included).

Implementation (`lib/movers/nse.ts` + `lib/validation/schemas.ts`):
`index=loosers` for the losers list; the zod response schema declares the
universe blocks (`ALL`, `NIFTY`) with rows zod-parsed per field (the
existing `nseNumeric` coercion already handles numeric strings + commas);
universe preference **ALL** (market-wide — scope parity with the computed
fallback's ranking) then **NIFTY** (the headline 50), the universe that
served returned for the derivation line; `trade_quantity` joined to the
tolerated volume spellings; the misspelled-direction error body parses to
no universes → the honest miss with the payload head disclosed (the
operator can correct the schema from the disclosure alone, same as round
56).

The development-egress reality is UNCHANGED (re-verified 2026-10-14, bytes
below — NSE's Akamai edge 403s this sandbox's datacenter IP for curl AND a
real headless browser); the production egress reaches the domain (the live
breadth endpoint proves it daily). The NSE-first path is therefore verified
by the production warmer's own disclosure after deploy (§5 below).

### Fail-first (C5)

`npx vitest run test/movers.nse.test.ts` against the ROUND-56 code (before
the fix):

```
 Test Files  1 failed (1)
      Tests  3 failed | 9 passed (12)
```

(the legends-keyed payload legs + the loosers-URL pin failed — exactly the
production failure class: `schema: no rankable rows …; payload head:
{"legends":[["NIFTY","NIFTY 50"],…}`).

After the fix:

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

## 3. TODAY-FULL: the live Stock of the Day

The Today panel's SOD row was the last populatable empty (the verdict-gated
seed pick renders "no verdict-allowed pick exists" while the record set is
seed data — P0-1). TODAY-FULL replaces the ROW's semantics (only here —
the ranked trio's SOD card in DashboardTail keeps its seed-gated
semantics): **the session's most-traded stock BY VALUE (price × volume)**,
computed in the warm tick from the same gated quote-cache pool (registry +
session-fresh + price>0 + volume>0; deterministic turnover-desc,
symbol-asc tie-break), stored in the movers snapshot (migration 035,
additive: `market_movers_meta.nse_universe text` + `pick jsonb`, zod-
validated on read), rendered with the full FD-15 provenance pair, the
counted pool size, the traded value, and the explicit **"live market data,
not a verdict"** label — a raw market fact (P0-1/P0-8 clean: no score, no
commentary, no advice). The N3 seed banner is retired from this panel (the
pick is live, not seed-derived — keeping the banner would be the lie).

Verdicts-today (P0-1) and forward-return tracking (DEMO-2) stay honestly
labelled: no live record set / no calibration track exists to populate
them from, and the founder's truth discipline forbids fabricating either.

## 4. The news render-path protection (the world-class tuning)

#434 joined the homepage's ISR regeneration (every 60 s) to
`aggregateLiveNews()` as a second reader — without a cache at the source,
every regeneration re-fetched EVERY feed (~28 outbound RSS requests per
minute from the render path alone; the route's CDN `s-maxage=120` never
covered the page render). The fix: ONE aggregation per region per 120 s
TTL window at the source (`lib/news/server.ts`), shared by the route and
the page; concurrent callers within a window await the same in-flight
round. The TTL mirrors the route's own Cache-Control — the same freshness
discipline, now enforced where both callers meet.

Fail-first: `npx vitest run test/newsCache.test.ts` against the UN-cACHED
server (the round-57 change stashed):

```
 Test Files  1 failed (1)
      Tests  4 failed (4)
```

With the cache:

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

## 5. The C6 acceptance (merged + deployed + live)

Appended after the deployment lands (the production warmer's force=1 run,
the bare-URL homepage checks, postDeploySmoke).
