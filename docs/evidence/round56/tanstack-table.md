# Round 56 — TANSTACK-STOCKS: the /stocks table on TanStack Table

Founder order (13 Oct 2026): "Next: queued builds — … TanStack /stocks table …"
Adoption record: docs/evidence/round55/r55-batch2-adoption-record.md (tier-1 row 2:
"acceptance = test against the full 896-row list (T12 parity stays 0/896)").

## Library choice (recorded)

@tanstack/react-table 8.21.3 (MIT). The pattern repo sadmann7/tablecn adopted v8 for
most of its life and has now moved to the weeks-old v9 store-atoms rewrite
(verified from its package.json, 2026-10-13); this PR pins the stable v8 major for
the demo-path page and records the v9 upgrade as a follow-up. Head-first adoption of
a fresh major on the founder's demo path is not justified by the pattern-repo bump
alone.

## Architecture

- components/screener/stocksTableOptions.ts — the ONE options factory (rule 14):
  columns, the T11 nulls-last sorting fn, the symbol-or-name global filter, the
  exact-sector column filter, pagination (50/page), shared by the component and the
  headless acceptance test.
- components/screener/StockTable.tsx — useReactTable over the factory; markup, a11y
  labels, badge logic and the T14 seed-price rule untouched; NEW: the honest
  pagination footer (Page X of Y · N matching rows).
- test/stocksTableTanstack.test.ts — the acceptance: the REAL server-built slim
  index (getSlimIndex -> toScreenerRows, 896 rows, not a fixture) driven headlessly
  through the exact component options.

## Proof (raw outputs in this directory)

- tanstack-896-green.txt — `npx vitest run test/stocksTableTanstack.test.ts` exit 0,
  8 passed / 0 failed over the full list (default sort + nulls last, ascending
  nulls-last, symbol lexicographic, search hits + honest zero, sector filter,
  pagination slices + tail page, filters-compose-with-pagination).
- tanstack-nulls-bite-red.txt — the rule-24 bite proof: with nulls-last deliberately
  broken in the factory (nulls first), the T11 pin fails (1 failed / 7 passed,
  vitest exit 1); restored, 8/8 pass again.
- `npm run score:parity`: "Checked 896 symbols across 4 entry paths. 0 mismatches /
  0 non-finite of 896" (T12 parity unchanged).
- `npx tsc --noEmit` exit 0; `node scripts/eslintRatchet.mjs`: 0 errors, 273
  warnings — below the 278 baseline (the TanStack v8 React-Compiler skip adds one
  documented warning; no ratchet change needed).

## Bundle (C9 paired guard)

First-load JS on /stocks grows by the TanStack core + row models; the ratchet
tolerance is +2 kB. The build + `npm run bundle:budget` runs in CI on this PR; if the
ratchet fails, the baseline re-locks in THIS PR with the measured numbers and the
paired-guard note (the 896-row table still server-renders — no first-byte content
moves client-side; B-24's regression class does not apply).

## Bundle measurement (post-build, 2026-10-13) — FOUNDER DECISION NEEDED

`npm run bundle:budget` on the built branch:

route            first-load   budget   ratchet    verdict
/                  160.9 kB   200 kB   159.1 kB   OK
/stocks            178.9 kB   200 kB   162.9 kB   REGRESSION vs ratchet (+16.0 kB)
/stock/[symbol]    172.8 kB   200 kB   171.2 kB   OK

- The +16.0 kB is the TanStack v8 row-model machinery in the /stocks first-load
  (the chunk measures 20.5 kB gzip including the screener client). The 200 kB
  hard budget holds with 21.1 kB headroom; the ratchet verdict is REPORTED (the
  script exits 0 — the hard budget is the fatal gate).
- The re-lock path REFUSES a failing run by design: "--update-baseline refused:
  the current run fails the gate — fix the regression first (re-locking growth
  defeats the ratchet)". Per C9 this is recorded, not silently re-anchored:
  FOUNDER DECISION NEEDED — accept the +16.0 kB (the founder-ordered TanStack
  build; pagination/filters/sort are the demo-path UX) and re-lock the baseline
  in a founder-approved follow-up, or require a lighter implementation.
- The C9 paired guard on first-byte CONTENT holds: the server HTML still
  renders the table (342 kB page; rows present), the FULL 896-row list ships in
  the RSC flight payload (897 "symbol" occurrences — 896 rows + the legend),
  and SSR renders page 1 (50 rows) because pagination — the founder-ordered
  behaviour — limits the rendered page to one page. T12 parity input is
  unchanged (0/896).
