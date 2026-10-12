# Round 55 — NSE holiday calendar adoption: the cross-check record

Founding directive (13 Oct 2026, verbatim): `GauravSh-7/nse-trading-holidays-2018-2026 (MIT) ... Market-hours logic for the stale-quote fix (#399) ... Community-compiled. Check each 2026 holiday against NSE circulars before use` and `rsheftel/pandas_market_calendars (MIT) ... Python. Use as an offline cross-check, not in the app`.

## The adoption

- In-app source: **GauravSh-7/nse-trading-holidays-2018-2026** (MIT — licence file read verbatim, "MIT License, Copyright (c) 2026 GAURAV"; repo metadata via GitHub API: MIT, pushed 2026-08-26, not archived). Its own README: "independently compiled and cross-verified against official NSE India holiday calendars and exchange circulars" for 2018–2026; segment NSE F&O. Its data file (`nse_trading_holidays_2018_2026.parquet`, 169 rows) is committed at `scripts/r55/` for the cross-check.
- Offline cross-check (tooling only, never an app dependency): **pandas_market_calendars** (MIT) `holidays/nse.py` @ 9af1144af406eac48bb113692d81fe33b3f20589 ("Overhaul NSE calendar", 2026-08-27; PR #479: "verified against NSE circulars, contemporaneous press coverage of exchange announcements, and observed market activity for 1996-2026").
- The facts land in `data/nse-holidays.json` — the single source of truth (rule 14) read by `lib/marketHours.ts` AND `scripts/ci/postDeploySmoke.mjs`.

## The three-way diff (re-runnable: `scripts/r55/holidayCrosscheck.py`, exit 0)

```
GauravSh-7 2026: 19 rows, 15 weekday closures
adopted data/nse-holidays.json (15):  [identical list]
pandas_market_calendars NSE 2026 weekday closures (16):  [same 15 + 2026-01-15]

=== ACCEPTANCE ===
PASS: designated source carries every adopted date (15).
PASS: cross-check agrees on 15 dates; disagrees exactly on the documented disputed set ['2026-01-15'].
RESULT: ACCEPTANCE HOLDS
```

GauravSh-7's 4 non-weekday rows (2026-02-15 Sun Mahashivratri, 2026-03-21 Sat Ramadan Eid, 2026-08-15 Sat Independence Day, 2026-11-08 Sun Diwali Laxmi Pujan) are weekend dates — handled by the weekend rule, not the holiday file.

## The disputed date and the fail-closed decision

**2026-01-15 (Thursday, Makar Sankranti)**: a closed day per pandas_market_calendars, NOT a holiday per the founder-designated source. pmc's own list shows no mid-January closure in 2024 or 2025, making its 2026-01-15 an outlier; PR #479 does not cite a specific circular for it.

The founder's condition — "Check each 2026 holiday against NSE circulars before use" — could not be discharged for this date from the build environment:

- `https://www.nseindia.com/resources/exchange-communication-holidays` — HTTP 403 (Akamai), curl with browser headers AND a headless browser (cold and cookie-warmed: "Access Denied")
- `web.archive.org` — connection timed out
- `r.jina.ai` render proxy — 401 (blocked IP reputation)
- Web search — no primary/secondary source for the 2026 list retrieved
- Zerodha's circular feed (reached, HTTP 200) confirms the 2026-10-02 Gandhi Jayanti circular (positive control that the feed carries holiday circulars) but holds no January 2026 entry on the reachable page

Decision (C2/rule 6, fail-closed): **EXCLUDE 2026-01-15.** Error-direction analysis: a FALSE closed-day would silence the round-53 15-minute freshness rule on a live session (stale lines pass silently — the exact 13:28-all-afternoon class the founder ordered fixed); a MISSING closed-day only causes extra 60 s refreshes and a stricter probe (loud failure, never a wrong label). The December ritual resolves this date against NSE's official list before January; until then the pin `NSE_HOLIDAYS_IST.has("2026-01-15") === false` guards the exclusion.

## Status line

`BLOCKED: NSE circular page unreachable from the build environment — resolve 2026-01-15 (Makar Sankranti) against the official list (December ritual, or any human browser visit).`

Everything else in the adoption is unblocked and landed: 15 agreed dates, weekday-only, Muhurat not modelled, year-scope degradation preserved, tests + probe self-test green.
