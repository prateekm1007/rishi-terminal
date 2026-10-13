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
