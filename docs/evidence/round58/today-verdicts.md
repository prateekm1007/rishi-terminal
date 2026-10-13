# Round 58 — TODAY-VERDICTS (founder order, 2026-10-14 IST)

Founder order (verbatim): "finish and tune it to world class now that we
have permission … make sure the full today panel is populated on
dashboard."

## 1. The state before (verified live, 20:19Z)

The Today panel rendered five live rows (three Top-5 lists — Winners and
Losers from NSE's licensed ranking, Movers computed over 827 observed
symbols; the LIVE Stock of the Day — HCLTECH, most-traded by value; the
fresh news row) and two honest-empty rows: "Verdicts produced today:
none — the record set is illustrative seed data (P0-1)" and
"Forward-return tracking: not started (DEMO-2)".

## 2. Root cause — why no verdict could exist (P0-1 meets the transport)

The P0-1 verdict gate demands all 10 quality fields (pe, roe, roce, opm,
de, promo, revcagr, epscagr, mktcap, bvps) resolve LIVE. The Screener
transport covered nine — and parsed `debtToEquity: null` for EVERY stock
(production /api/fundamentals verified for RELIANCE and TCS): the current
page format (captured 14 Oct 2026, 231,646 bytes, HTTP 200 from both the
development and production egresses) exposes NO "Debt to equity" ratio
anywhere — the top-ratios list and the #ratios section carry
Debtor/Inventory/Payable days and ROCE only, and the balance-sheet rows
sit behind button elements the old regex could not cross. Every
Screener-resolved record was therefore seed-mixed (9 live + 1 seed) and
the gate refused — by design, correctly.

## 3. The fix — the balance-sheet D/E derivation

`lib/scrapers/screener.ts`: the value derives from the page's own
published rows — latest-column Borrowings / (Equity Capital + Reserves).
RELIANCE: 402,962 / (13,532 + 890,498) = 0.4457 (the public ~0.45
reality). Fail-first: 3 RED legs on the pre-fix extractor, 9/9 GREEN
after; the real captured bytes validated end-to-end (D/E 0.445739…).
Edge semantics: an explicit text ratio still wins verbatim (H4
preserved); blank latest cells fall back to the prior column; a genuine
0 (debt-free) is a real observation; negative/zero equity is null
(meaningless ratio, never fabricated); a missing Borrowings row is null
(T11).

## 4. The pipeline (the LIVE-TODAY architecture, applied to verdicts)

`lib/verdicts/` — produce (the SAME single scoring surface every stock
page runs; the gate bites upstream, refusals disclosed with reasons),
store (migration 036: verdicts_produced, unique (symbol, ist_date), RLS
deny-all, zod on read; verdicts_meta single row), warm (the warmer step:
same-day TTL, 25 s wall-time budget with notReached disclosure, force=1
for acceptance runs, failures disclosed never thrown), presentation (the
ONE row-face owner). The TodayPanel's verdicts row and tracking row
render the ledger (one cheap read each — the movers read's class; the
build stays hermetic). The methodology page carries the same tracking
line via hourly ISR (one state source: the ledger; one wording source:
lib/demoState). Each verdict records its day-0 BASELINE from the same
quote-cache observation the stock-page header renders — the S2-03/S2-04
calibration track measures forward returns from it.

The candidate set v1: the founder-confirmed five (#418), disclosed on
the row.

## 5. The local end-to-end (real transports, production ledger)

Migration 036 applied + verified on production Supabase pre-deploy
(tables, RLS deny-all, zero policies, constraints — record:
R58_036_live_apply). Then the REAL warmer path from the development
egress:

```
PRODUCED RELIANCE (Reliance Industries) consensus=59.0 category="Balanced Risk-Reward" dq=delayed transport=screener baseline=Rs 1167.8 (yahoo-bulk @ 2026-10-13T09:45:03+00:00) istDate=2026-10-14
PRODUCED TCS (Tata Consultancy Services) consensus=70.0 category="Value-Aligned Consensus" dq=delayed transport=screener baseline=Rs 2262 (yahoo-bulk @ 2026-10-13T09:45:00+00:00) istDate=2026-10-14
PRODUCED INFY (Infosys) consensus=60.0 category="Balanced Risk-Reward" dq=delayed transport=screener baseline=Rs 1061.15 (yahoo-bulk @ 2026-10-13T09:45:00+00:00) istDate=2026-10-14
REFUSED  ITC: data-quality:seed
REFUSED  HDFCBANK: data-quality:seed
```

All 10 quality fields live on every produced row. The refusals are the
gate's designed honesty, disclosed per-run: ITC's page discloses no
promoter holding (widely-held company — null, never fabricated; a
shareholding-table promoter fallback is a possible future coverage
improvement, noted in DATA_SOURCES row 18); bank pages (HDFCBANK) carry
no Borrowings/OPM rows the parse can read — a bank verdict needs a
bank-capable transport, honestly refused until then.
readTrackingState: `{baselines:3, startedOn:"2026-10-14"}`.

## 6. The battery (all green, 949de4b)

tsc 0; eslint 236 = ratchet exactly, 0 errors; vitest 231 files / 2530
tests (17 new TODAY-VERDICTS legs — the producer-gate pin: a Screener
record missing the derived D/E goes seed-mixed and REFUSES
data-quality:seed; the warm step's gate/budget/outage legs; the ledger
round-trip; the tracking flip; the panel rows); encoding PASS;
validate:stocks 896 clean; parity 0 mismatches; build 1020/1020; ISR
gate PASS (60 s, 896 baked routes); budgets OK (/ 160.9, /stocks 164.8,
/stock 172.9 kB). Transport hygiene: the Screener and Yahoo/NSE
fundamentals fetches now carry cache: no-store (the movers/nse semantic;
the ISR60 pin asserts it on every tick fetch).

## 7. Merge + deploy

PR #440 opened on b057d5d; the first CI run failed only the PROVENANCE
freshness gate (/methodology reclassified none → sourced — the audit's
own demand; regenerated + committed as 949de4b); ALL SEVEN checks green;
MERGED 75283db4 at 21:25:08Z. The manual v13 trigger answered 402
(B-22, account-wide quota); the detached watcher retries sporadically
and runs the C6 acceptance automatically on READY.

## 8. The C6 live acceptance

(appended when the deploy lands — the watcher's log, verbatim)

## 8. The C6 live acceptance (the deploy landed 21:52Z, verified 21:53–22:05Z)

The quota freed on the sporadic retry (B-22): manual v13 deployment
dpl_3TDMKUaRxxrDK8CoCsSHCs1dSTPb triggered 21:50:43Z, READY 21:52:25Z;
/api/version = 75283db46af1.

**force=1 warm (the verdicts step's first live production run):**

```
verdicts: {"produced":3,"refused":[{"symbol":"ITC","reason":"data-quality:seed"},{"symbol":"HDFCBANK","reason":"data-quality:seed"}],"skippedAlreadyProduced":[],"notReached":[],"candidates":["RELIANCE","TCS","INFY","ITC","HDFCBANK"],"error":null}
movers: {"path":"nse","gainers":5,"losers":4,"error":null}
isr60.revalidated: 8 | pagesRendered: 8 | forced: true
```

**The bare-URL homepage today panel (verbatim, cache-control no-cache):**

```
Stock of the Day: HCLTECH — HCL Technologies · ₹1,320.1 ▲ +7.94% (+97.09) · ₹28,38,15,41,434 traded today — the session's most-traded stock by value (live market data, not a verdict) Yahoo Finance (unofficial) · Tue 13 Oct, 15:15 IST · top of 827 tracked symbols with today's session data
Verdicts produced today: 3 — 3 verdicts produced today on live fundamentals — latest: INFY (Balanced Risk-Reward, 60.0/100, delayed live data (undated provider observations)) · fundamentals via Screener.in (unofficial) · candidate set: RELIANCE, TCS, INFY, ITC, HDFCBANK · produced 14 Oct, 02:18 IST. A heuristic score, not investment advice.
News: BNY, Citadel Securities test tokenized U.S. Treasuries to speed up Wall Street financing — CoinDesk · 0 min ago
Forward-return tracking: started (tracking: started 2026-10-14 — 3 verdict baselines recorded; forward returns measurable after the next session close) — methodology carries the same line; forward-return measurements begin after the next session close.
```

Needles: data-today-verdicts-row PRESENT, data-today-verdicts-count
PRESENT, data-today-verdicts-empty ABSENT (correct), "not started"
ABSENT on the homepage (correct), the three Top-5 lists and the SOD row
live as before. postDeploySmoke PASS vs 75283db46af1 (run from main —
the first local run used the pre-#439 smoke and failed its 2 known
stale-gate legs, the exact bug #439 fixed; the main-tree gate passes).
The methodology page's tracking line flips on its hourly ISR (the build
bakes the honest not-started state; the first post-deploy regeneration
reads the ledger) — verified below.

**C6 verdict: merged + deployed + live, with evidence.**
