# Unofficial sources inventory (A4 — founder order, 12 Oct 2026)

Every runtime call to an unofficial third-party endpoint. Nothing here is
removed or disabled by this change (founder direction). "Label shown" is
what the user sees today; "founder decision" tracks the row-by-row review
(founder question 1: keep labelled "licence pending", add no new sources —
recommended default; recorded as pending until answered).

Conventions: "displayed" = values reach users. Prices carry source chips +
as-of time; scores carry the "licence pending" label while the exchange-data
licence is unresolved (DELIV-2); fundamentals values carry source + as-of
via DataValue. The "licence pending" label does NOT appear on data rows —
only on withheld price-based scores.

## Declared data hosts (the CI gate pins this list)

| file | endpoint | purpose | displayed to users | label shown | founder decision |
|---|---|---|---|---|---|
| lib/livePrice.ts | https://www.nseindia.com/api/quote-equity | NSE equity quotes | y (stock header: Delayed · source chip + as-of) | source chip + as-of; scores "licence pending" | pending |
| lib/livePrice.ts | https://www.nseindia.com/api/quote-derivative | NSE derivative quotes | y (F&O surfaces where rendered) | source chip + as-of | pending |
| lib/livePrice.ts | https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData | BSE scrip header | y (where rendered) | source chip + as-of | pending |
| lib/livePrice.ts | https://query1.finance.yahoo.com/v8/finance/chart | Yahoo price charts | y (Delayed · Yahoo Finance (unofficial) + as-of) | source chip + as-of; scores "licence pending" | pending |
| lib/livePrice.ts | https://query2.finance.yahoo.com/v7/finance/quote | Yahoo quotes | y (same) | source chip + as-of | pending |
| lib/livePrice.ts | https://api.coingecko.com/api/v3/simple/price | CoinGecko spot prices | y (crypto: LIVE chips where fetched + heuristic labels) | source + heuristic-reference label | pending |
| lib/stockApi.ts | https://query1.finance.yahoo.com/v8/finance/quote | Yahoo quotes (stock API path) | y | source chip + as-of | pending |
| lib/nse/bulkFetch.ts | https://query1.finance.yahoo.com/v7/finance/spark | Yahoo sparkline data | y (sparklines where rendered) | source chip + as-of | pending |
| lib/nse/bulkFetch.ts | https://query1.finance.yahoo.com/v8/finance/chart | Yahoo charts (bulk path) | y | source chip + as-of | pending |
| lib/nse/fundamentals.ts | https://www.nseindia.com/api/quote-equity | NSE fundamentals path | y (via /api/fundamentals → metrics provenance) | source + as-of | pending |
| lib/nse/fundamentals.ts | https://query1.finance.yahoo.com/v10/finance/quoteSummary | Yahoo fundamentals | y (same) | source + as-of | pending |
| lib/scrapers/screener.ts | https://www.screener.in/company (HTML scraping) | scraped fundamentals (primary), Yahoo+NSE fallback | y — via lib/liveFundamentals → app/api/fundamentals/route.ts (a route calls it) → MetricsPanel DataValue source+as-of; source ids carried ("screener"/"yahoo+nse"). Public disclaimer omits Screener.in (G4) | source + as-of (vendor ids); scores "licence pending" | pending — founder question 1 starts here |
| lib/livePrice.ts | https://open.er-api.com/v6/latest/USD | USD FX reference rates (carries time_last_update_unix) | y (forex surfaces, sourced rows) | source + as-of (DELIV-3 row contract) | pending — NOT in the order's file list; found during verification (rule 28) |
| lib/livePrice.ts | https://fred.stlouisfed.org/graph/fredgraph.csv | US Treasury yields / macro series (attribution "FRED, Federal Reserve Bank of St. Louis" already in lib/cache/storageRights.ts) | y (bonds/macro rows, sourced rows) | source + as-of (DELIV-3 row contract) | pending — NOT in the order's file list; found during verification (rule 28) |

## News RSS feeds (app/api/news/route.ts — NOT in the order's file list; found by the gate's first run, rule 28)

Public RSS/Atom feeds polled for headlines. Each entry carries its publisher
name as attribution. Publisher terms govern reuse — founder decision pending
(row-by-row with the rest).

| file | endpoint | purpose | displayed to users | label shown | founder decision |
|---|---|---|---|---|---|
| app/api/news/route.ts | https://economictimes.indiatimes.com (RSS) | ET headlines | y (/news list, attributed) | publisher name + link | pending |
| app/api/news/route.ts | https://www.livemint.com (RSS) | Mint headlines | y | publisher name + link | pending |
| app/api/news/route.ts | https://news.google.com (RSS) | Google News aggregation | y | publisher name + link | pending |
| app/api/news/route.ts | https://www.investing.com (RSS) | Investing.com headlines | y | publisher name + link | pending |
| app/api/news/route.ts | https://cointelegraph.com (RSS) | CoinTelegraph crypto headlines | y | publisher name + link | pending |
| app/api/news/route.ts | https://coindesk.com/arc/outboundfeeds/rss/ | CoinDesk crypto headlines | y | publisher name + link | pending |
| app/api/news/route.ts | https://www.espncricinfo.com/rss/content/story/feeds/0.xml | ESPNcricinfo cricket headlines | y | publisher name + link | pending |
| app/api/news/route.ts | https://timesofindia.indiatimes.com/rssfeeds/-2128818991.cms | TOI sports headlines | y | publisher name + link | pending |

## Acknowledged non-data hosts (fetched or configured, not vendor data)

These appear in fetch-pattern scans but are not unofficial DATA sources.
They are listed so the CI gate (scripts/ci/unofficialSourcesGate.mjs) does
not false-positive; any NEW hostname outside both tables fails the gate.

| hostname | where | why acknowledged |
|---|---|---|
| generativelanguage.googleapis.com | lib/ai/providers/gemini.ts (fetch) | chat provider transport — FD-8 territory (provider approval pending), not a data source for surfaces |
| rishi-terminal.vercel.app | lib/seo/site.ts, app/api/history/breadth/route.ts, User-Agent strings | first-party (self) |
| placeholder.supabase.co | CI env placeholder | synthetic test config, never fetched in production |

Terms/docs URLs (providerRegistry termsUrl/docsUrl, footer links) are not
fetch targets and are ignored by the gate's fetch-pattern scan by design.

## Declared hosts (machine section — the gate parses this)

```
www.nseindia.com
api.bseindia.com
query1.finance.yahoo.com
query2.finance.yahoo.com
api.coingecko.com
open.er-api.com
fred.stlouisfed.org
www.screener.in
economictimes.indiatimes.com
www.livemint.com
news.google.com
www.investing.com
cointelegraph.com
coindesk.com
www.espncricinfo.com
timesofindia.indiatimes.com
generativelanguage.googleapis.com
rishi-terminal.vercel.app
placeholder.supabase.co
```
