# B2 — portfolio importer safety (Round 15)

Evidence for the B2 PR. Fail-first run 2026-10-04 22:39 UTC, fix applied,
post-fix runs 22:41–22:42 UTC. Raw outputs below.

## 1. Fail-first (rules 21/24) — the acceptance tests on the PRE-fix code

`npx vitest run test/portfolio.importValidation.test.ts` (branch cut from
`origin/main` @ 9c05a96, tests written first):

```text
 Test Files  1 failed (1)
      Tests  18 failed | 2 passed (20)
   Start at  22:39:21
   Duration  331ms
```

The two pre-fix passes are the CONTROL cases that must hold on both sides
(a yesterday-dated buy imports; a valid CAS ISIN imports). The 18 failures
are the founder's four acceptance classes plus the derived guards — on the
pre-fix code `=cmd|' /C calc'!A0` was accepted as a position, `2099-01-01`
imported silently, unknown symbols stored as typed with no report, and the
fullwidth/Cyrillic lookalikes passed straight through.

## 2. The guards (lib/portfolio/csvImport.ts)

- **Formula-injection guard** — a symbol cell whose raw or trimmed form
  starts with `=`, `+`, `-`, `@`, tab or CR is a row ERROR (the founder's
  list, verbatim). Raw-cell check matters: `splitCsvLine` now returns
  UNTRIMMED cells because the old blanket `.trim()` deleted the leading
  tab/CR before any check could see them (caught by the fail-first run).
- **ASCII symbol shape** — `^[A-Z0-9][A-Z0-9&.\-]{0,29}$` (alphanumeric
  start; `&` for M&M, `-` for BAJAJ-AUTO; ≤ 30 chars). Rejects Unicode
  homoglyphs (fullwidth ＩＮＦＹ, Cyrillic ІNFY), commas, quotes and
  surviving control characters. The internal `ISIN:` placeholder is exempt
  (never user-typed) — the ISIN itself is shape-checked
  (`^[A-Z]{2}[A-Z0-9]{10}$`).
- **Date sanity** — future-dated buys (after the validation clock) and
  buys before 1990-01-01 are row ERRORS. Unparseable dates still import
  dateless (the pre-existing honest behavior, kept). The clock is
  injectable (`today` option) so the tests are deterministic.
- **Registry validation** — server callers pass the universe
  (`Object.keys(STOCKS)`); resolution goes through
  `resolveTickerSymbolAgainst` (alias chains + mangled-ampersand identity).
  Unknown → stored but REPORTED in the new `warnings` channel and flagged
  `knownSymbol: false` (never silently stored); renamed/mangled inputs
  resolve to the CANONICAL symbol (MINDTREE → LTIM, MANDM → M&M) with a
  notice — "saved as typed" was the defect.
- **CSV export quote-prefix** — `app/api/screener/export/route.ts`'s
  `csvCell` now prefixes STRING cells that start with a formula character
  with a single quote (numeric cells never — a real `-5` must stay a
  number, and numbers cannot execute formulas). This covers the export
  boundary that exists TODAY; any future portfolio export reuses the
  pattern (founder directive: "prefix risky cells with a single quote").

## 3. Post-fix (same tests, same command)

```text
$ npx vitest run test/portfolio.importValidation.test.ts test/portfolio.import.test.ts
 Test Files  2 passed (2)
      Tests  33 passed (33)
   Start at  22:42:06
   Duration  430ms
```

Affected-surface sweep (screener suites included — the export route
changed):

```text
$ npx vitest run test/portfolio.importValidation.test.ts test/portfolio.import.test.ts test/screener
      Tests  83 passed (83)

$ npx tsc --noEmit
EXIT 0
$ npx eslint lib/portfolio/csvImport.ts app/api/portfolio/import/route.ts app/api/portfolio/summary/route.ts app/api/screener/export/route.ts test/portfolio.importValidation.test.ts test/portfolio.import.test.ts
EXIT 0
```

## 4. Behavior changes beyond the founder's four (deliberate, visible)

- A comma inside a quoted symbol (`"ABC,DEF"`) is now REJECTED by the
  ASCII shape guard (no NSE ticker contains a comma; it is also a CSV
  smuggling vector). The old test asserted it parsed; RFC 4180
  quote-comma coverage moved to the price cell
  (`"1,23,456.78"`). Test updated, not deleted.
- The import API response now carries `warnings` and per-position
  `known_symbol`; the duplicate-import path forwards the freshly parsed
  warnings too.
- `app/api/portfolio/summary/route.ts` reconstructs positions for
  XIRR/sector math — `knownSymbol: null` there (the DB does not persist
  the import-time verdict; the summary makes no registry claim).
