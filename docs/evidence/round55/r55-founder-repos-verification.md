# Round 55 evidence — the founder-named repository verification pass (C1)

Date: 2026-10-13 (one pass). Founder's directive recorded verbatim in
`docs/ROADMAP-STATUS.md` (Round 55) before any change.

## Method

Four checks per repository, all on 2026-10-13:

1. GitHub REST API repository metadata (license SPDX, stars, `pushed_at`,
   `archived`, description) — `founder-repos.json` in this directory holds the
   raw records.
2. Raw LICENSE file fetch from `raw.githubusercontent.com` where the API
   detection was missing or ambiguous (openchart, getbhavcopy).
3. README fetch with keyword checks for each claim the founder quoted
   ("official website", "not affiliated", "personal use", "Screener", ...).
4. Search-level repo queries for the two premise checks (XNSE presence in
   exchange_calendars; pandas_market_calendars' NSE calendar files).

The API's rate-limit token came from the local vault (Article VI); no token
value is recorded here.

## Verification table

| Repository | Founder's claim | Verified finding | Status |
|---|---|---|---|
| vsjha18/nsetools | MIT; retrieves data "from the official website" | MIT (LICENSE, "Copyright (c) 2025 Vivek Jha"); 907 stars; pushed 2025-03-18; README contains "official website" and a not-affiliated disclaimer | VERIFIED as stated |
| marketcalls/openchart | MIT; "not affiliated with NSE"; uses its APIs | LICENSE file IS MIT ("Copyright (c) 2024 Rajandran R") — GitHub API SPDX says NOASSERTION (detection artifact, recorded); 77 stars; active; README verbatim: "OpenChart is **not** affiliated, endorsed, or vetted by NSE India. It's an open-source tool that uses NSE India's publicly available APIs, and is intended for research and educational purposes." | VERIFIED as stated |
| LogeshR15/screener-mcp | reaches Screener.in and NSE | MIT (LICENSE, "Copyright (c) 2026 Logesh Ramasamy"); 15 stars; active; README: "gives Claude live access to Screener.in, NSE, and MCX data" | VERIFIED as stated |
| shashankvemuri/Finance | uses Yahoo Finance | MIT code; 4,317 stars; active. Data layer = Yahoo: Yahoo's own terms remain the personal-use boundary recorded 11 Oct 2026 | VERIFIED (code license + data source) |
| dhananjaym182/india-xbrl-filings | labelled MIT; founder category "Personal use only" | MIT label verified; 0 stars. The founder's personal-use-only classification is recorded as BINDING regardless of the label | VERIFIED + binding category |
| BennyThadikaran/NseIndiaApi | GPL-3.0 | GPL-3.0; 160 stars; active (2026-10-10) | VERIFIED as stated |
| cloudQuant/backtrader | GPL-3.0 | GPL-3.0; 198 stars; active | VERIFIED as stated |
| rehanhaider/stocky | GPL-3.0 | GPL-3.0; 31 stars; active | VERIFIED as stated |
| lfre/lightkeeper | AGPL-3.0; archived | AGPL-3.0; archived = true; 85 stars; last push 2025-05-31 | VERIFIED as stated |
| hemenkapadia/getbhavcopy | bhavcopy fetcher (category per founder's list) | **NO LICENSE FILE, NO README**; 121 stars; last push 2020-01-07 (dead ~6.5 years). Code = all-rights-reserved | PREMISE CORRECTION (rule 28) — technique reference only; never copied |
| NayakwadiS/NSE-Neuron | can be used for a buy or sell rule | MIT (LICENSE, "Copyright (c) 2026 pythonwadi"); 22 stars; active; "Predicts 5-day OHLC prices + Buy/Hold/Sell Signals" (deep learning, Python/TensorFlow/FastAPI) | VERIFIED as stated (integration gated, see ROADMAP-STATUS round 55) |

## Premise checks this pass (rule 28)

1. **exchange_calendars has no XNSE calendar.** GitHub code search
   `repo:gerrymanoim/exchange_calendars XNSE` = 0 hits; the git tree carries
   69 `exchange_calendar_*.py` modules and `xbse`/`xbom` but NO `xnse`; no
   commit history exists for the path. The round-54 research note's line
   "exchange_calendars Apache-2.0 with XNSE" was right about the license and
   wrong about the calendar. The historical evidence is never rewritten; this
   file is the correction of record.
2. **pandas_market_calendars (MIT) DOES carry the NSE calendar.**
   `pandas_market_calendars/calendars/nse.py` + `pandas_market_calendars/holidays/nse.py`
   hold the NSE closed-day list 1996-2026, "sourced from NSE's published
   holiday circulars (https://www.nseindia.com/resources/exchange-communication-holidays)
   and verified against observed market activity, including ad hoc closures.
   Muhurat trading dates are not holidays." Provenance pin for the adoption:
   `holidays/nse.py` at commit `9af1144af406eac48bb113692d81fe33b3f20589`
   (2026-08-27, "Overhaul NSE calendar: holidays, era hours, Muhurat").

## The annual-diff verification ritual (ch. 8 gate)

The adopted 2026 closed-day facts are factual schedules; the standing
verification is an annual diff against NSE's own list before each January.
This pass attempted the machine diff: `https://www.nseindia.com/api/holiday-master?type=markets`
answered **Access Denied** (Akamai; no cookie jar for robots) — raw response
kept in this directory as `nse-holiday-master-denied.html`. The first annual
diff therefore runs via a browser session (or the founder's copy of the
circular) and is recorded as a standing TODO on the calendar row of
`docs/DATA_SOURCES.md`. Until then the module comment carries the source and
as-of of the adopted facts (C1).

## Raw evidence in this directory

- `founder-repos.json` — the 11 GitHub API + raw-fetch records (the script
  lives outside the repo; every field shown in the table above is traceable
  to a field here).
- `nse-holiday-master-denied.html` — NSE official API denial (the reason the
  annual diff is a recorded TODO, not a completed check).
- `pmc_nse_holidays.py` — the upstream holiday file as fetched (provenance
  copy for the audit; MIT-licensed upstream, attribution carried in
  `lib/marketHours.ts` and `docs/DATA_SOURCES.md`).
- `ec_tree.json` — the exchange_calendars git tree listing (the XNSE-absence
  evidence).
