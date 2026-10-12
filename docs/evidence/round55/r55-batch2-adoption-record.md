# Round 55 — batch-2 adoption record (founder order, 13 Oct 2026, verbatim table verified)

The founder's second adoption order of the round — "Adopt: licence fits, actively maintained, directly useful" — lists 16 repos in two tables. Every licence claim below was verified 2026-10-13 from primary sources (GitHub API metadata, `scripts/r55/batch2-verification.json` + raw LICENSE file reads). Tier-1 claims verified MATCH; the two GitHub SPDX `NOASSERTION` detections were resolved by reading the licence files verbatim.

## Tier 1 — verified + disposition

| Repo | Verified | Activity (pushed) | Repo state (13 Oct) | Disposition + condition |
|---|---|---|---|---|
| tradingview/lightweight-charts | Apache-2.0 ✓ | 2026-10-12, 17.5k★ | NOT in tree | Adopt. Next build: price charts on the stock page; TradingView's attribution notice + link rendered wherever the chart renders (README requirement — re-read the vendored README at build time and pin the notice text in a test, DELIV-4-style) |
| sadmann7/tablecn | MIT ✓ | 2026-10-12 | NOT in tree (pattern repo) | Adopt with TanStack/table (MIT ✓, pushed 2026-10-12). Next build: the /stocks table sorting/pagination/filters; acceptance = test against the full 896-row list (T12 parity stays 0/896) |
| shadcn-ui/ui | MIT ✓ | 2026-10-12, 125k★ | in use in the component layer | Adopt. Keep licence notices (repo already consumes the component pattern; notice row added to the third-party register) |
| jnsahaj/tweakcn | Apache-2.0 ✓ | 2026-09-03 | design-time only | Adopt as a DESIGN-TIME tool — never a runtime dependency (founder condition; nothing enters package.json) |
| dequelabs/axe-core + abhinaba-ghosh/axe-playwright | MPL-2.0 ✓ + MIT ✓ | axe-core 2026-10-12; axe-playwright 2025-09-12 (13 months stale — thin wrapper; the core is active) | `@axe-core/playwright` ^4.13.0 ALREADY in devDependencies | Adopt. axe's own files are never modified (condition). Next build: the ENG-4 a11y gate on the demo path |
| promptfoo/promptfoo | MIT ✓ | 2026-10-12 | NOT in tree | Adopt, CI only (founder condition). Org watch: promptfoo is now part of OpenAI — re-check the org before each upgrade. Next build: regression evals for grounded answers + the verifier (stage 4) |
| colinhacks/zod | MIT ✓ | 2026-10-12, 44k★ | `zod` ^4.6.5 ALREADY in dependencies | Adopt (already at the data boundary per C2/rule 9). The DELIV-3 row-contract PR (#361) is the wiring vehicle |
| getsentry/sentry-javascript | MIT ✓ (LICENSE read verbatim: "MIT License, Copyright (c) 2012 Functional Software, Inc. dba Sentry") | 2026-10-12 | NOT in tree | Adopt as DORMANT (no init, no DSN, no network) pending the vendor decision + PII-scrubbing config — rule 31: vendor selection is a founder decision; the founder's own condition says so |
| vercel/ai | Apache-2.0 ✓ (LICENSE read verbatim: "Copyright 2023 Vercel, Inc. / Apache License, Version 2.0") | 2026-10-12, 27k★ | NOT in tree | Adopt while FD-8 is open, as the provider-agnostic chat layer. Provider terms are a separate check (founder condition) — recorded FOUNDER DECISION NEEDED on the provider before any provider call; the A4 static no-model-surface pin stays untouched |

## Tier 2 — verified + disposition

| Repo | Verified | Activity | Disposition + condition |
|---|---|---|---|
| GauravSh-7/nse-trading-holidays-2018-2026 | MIT ✓ (LICENSE verbatim) | 2026-08-26 | **ADOPTED THIS ROUND** — PR #408: the in-app source; 15 weekday closures; 2026-01-15 excluded pending the circular check (`r55-holidays-crosscheck.md`) |
| rsheftel/pandas_market_calendars | MIT ✓ | active | **ADOPTED THIS ROUND** as the OFFLINE cross-check (Python venv tooling; never an app dependency — founder condition honored verbatim) |
| Bitvested/ta.js | MIT ✓ | 2026-10-10 (active) | Approved-BLOCKED: RSI/MAs for the Catalyst & Timing scorer, but blocked until licensed price history exists (PRICE_DATA_LICENSE stays `unresolved`; FD-26 "licence pending" label untouched). No dep added until unblocked |
| anandanand84/technicalindicators | MIT ✓ | 2022-11-03 (verified — the founder's premise is exact) | Fallback only; prefer ta.js (founder condition). Same licence-pending block applies |
| vibrantlabsai/ragas | Apache-2.0 ✓ | 2026-02-24 | Adopt after the identity check — **DONE**: `explodinggradients/ragas` now API-redirects to `vibrantlabsai/ragas` (identical full_name/stars), the org move the founder asked to confirm. Next build: faithfulness scores for grounded answers (stage-4 eval harness, CI side) |
| ranaroussi/quantstats | Apache-2.0 ✓ | 2026-09-27 | Condition column reads "Off" — HELD, not adopted; flagged to the founder for one-word confirmation (offline metrics only, or not adopted) |

## Batch-state ledger (the honest state of the tree)

- Already in the tree before this order: `zod` ^4.6.5 (dep), `@axe-core/playwright` ^4.13.0 (devDep; axe-core arrives transitively).
- Not yet in the tree, queued as their own PRs per C7: lightweight-charts + attribution notice; @tanstack/react-table + the /stocks build; vercel/ai; @sentry/nextjs (dormant); promptfoo (CI-only config); ragas harness.
- Never entering the app: tweakcn (design-time), pandas_market_calendars (offline Python), the blocked ta.js/technicalindicators (until the price licence exists).
- Excluded by the founder's earlier directive (unchanged): personal-use-only `india-xbrl-filings`; copyleft NseIndiaApi / backtrader / stocky / lightkeeper.

## Register note

PR #406 (A3 dependency licence register) is the register vehicle. The rows above are the verified inputs for it; the register PR should cite this file rather than re-derive (one source of truth, rule 14).

## Follow-ups recorded

1. ROADMAP-STATUS round-55 section for THIS order rides after #407 (which records the first order of the round) merges — avoids the add/add collision on the same file.
2. FOUNDER CONFIRMATION: quantstats "Off" (hold vs offline-only).
3. BLOCKED: NSE circular page unreachable from the build environment — resolve 2026-01-15 against the official list (December ritual or any human browser visit).
