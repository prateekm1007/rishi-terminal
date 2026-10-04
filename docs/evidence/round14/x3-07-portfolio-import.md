# X3-07 — Portfolio import and XIRR: fail-first and acceptance evidence

All commands run on branch `fix/x3-07-portfolio-import` (base = main @ `67f153d`, after R4-04 merged) on 2026-10-04.

## 1. Roadmap acceptance commands (raw)

### `npx vitest run test/portfolio.xirr.test.ts`

```
 Test Files  1 passed (1)
      Tests  19 passed (19)
```

10 fixtures against an INDEPENDENT reference (dense grid scan at 1e-5 + 200-step bisection
refinement — a different algorithm and code path from the implementation's Newton-Raphson +
bisection). Five fixtures additionally carry closed-form analytic answers (single-period 10%
and -20%, half-year annualization, the balancing SIP `1000(1+r)^2 + 1000(1+r) = 2310` at
exactly r = 0.10, 800% single-period). Seven degenerate-input cases pin the null contract
(all-positive, all-negative, single flow, empty, NaN amounts, zero-span dates, out-of-range
return — null, never a fabricated number).

### `npx vitest run test/portfolio.import.test.ts`

```
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

- Re-import no-op (the acceptance's first half) at the key layer: identical content →
  identical sha256 idempotency key; line-ending/blank-line noise normalizes to the SAME
  hash; different content differs. The persistence layer (UNIQUE (user_id, content_hash)
  rejecting the second insert) is proven behaviorally below.
- Malformed rows reported, never silently dropped (the second half): 5 distinct failure
  classes (no symbol, non-numeric qty, zero qty, non-numeric price, negative price) each
  reported with the exact 1-based line number; a file whose rows ALL fail reports every
  row; bad dates degrade honestly (position imports without a date).

### `npx vitest run test/rls.portfolio.test.ts`

```
 Test Files  1 passed (1)
      Tests  21 passed (21)
```

## 2. Behavioral RLS + idempotency proof (real Postgres 18 via embedded-postgres)

Driver: `/home/z/my-project/pgtest/x3-07-rls-proof.mjs` (persisted). Applies
`scripts/ci/pg_harness.sql` + migrations 001–025 + the full `scripts/ci/rls_invariants.sql`
(the same script the CI migrations job runs on Postgres 16), then sabotages:

```
[3] rls_invariants.sql (all blocks incl. X3-07, expect PASS)
    PASS — invariants hold with the policies in place
[4] RED-1: drop all portfolio RLS policies
    RED confirmed (policies dropped) — X3-07 FAILED: user A cannot READ own import (0 rows)
[5] RED-2: permissive USING (true) policies (unscoped)
    RED confirmed (unscoped policies) — X3-07 FAILED: user B READ user A's import (1 rows)
RESULT: GREEN + RED-1 + RED-2 all proven
```

The X3-07 CI block also proves: user B cannot read A's POSITIONS (separate check), cannot
delete either table's rows, cannot forge rows owned by A (WITH CHECK violation), and the
idempotency constraint — the SAME content hash for the SAME user raises unique_violation
while a DIFFERENT user may import the same content.

## 2b. Rule 14 consolidation (ported from the parallel session's approach)

`components/lab/helpers.ts`'s local `calcXIRR` (90-iteration bisection with an
arbitrary-midpoint bug: no-root flow sets returned a bogus number) is DELETED and
delegated to the one `lib/portfolio/xirr.ts`. The wrapper preserves the lab's
contract (Date flows in, percent out); two new tests pin the parity (percent =
decimal x 100 to 1e-6) and the null contract for no-root flows. The same
consolidation shipped in the parallel session's #147 — adopted here with credit.

## 3. Parser shape coverage

One generic holdings-CSV grammar via header-alias mapping (case/whitespace/punctuation
insensitive), pinned by tests against the header spellings of the major Indian brokers
(Zerodha-Console-style `Instrument,Qty,Average cost`; Groww/Upstox-style
`Stock Symbol,Quantity,Avg. Buy Price,Buy Date`) plus CAS-style ISIN rows, RFC 4180 quoted
commas, Indian digit groupings (`"1,23,456.78"`), dd/mm/yyyy + dd-MMM-yyyy + ISO dates,
and duplicate-symbol merging with weighted-average pricing. FD-6 (which broker to
prioritize) remains a founder decision; this parser privileges no vendor and excludes
none — documented in the PR.

## 4. Full gate battery on the branch

```
npx tsc --noEmit                                  → clean
npx eslint .                                      → 0 errors, 301 warnings (ratchet holds at 301)
npm run validate:encoding                         → passed
npx tsx scripts/validateStocks.ts                 → all T12 gates passed, 916 symbols
npx tsx scripts/scoreParity.ts                    → 0 mismatches / 0 non-finite of 916
npx tsx scripts/provenanceAudit.ts                → 34 pages, no drift
npx vitest run (FULL suite)                       → 137 files / 1446 tests passed
npm run build                                     → exit 0; ƒ /api/portfolio/import, ƒ /api/portfolio/summary
npm run audit:commit-scope -- <base>..HEAD        → AUDIT PASS
```

## 5. Design notes (what the gate does NOT claim)

- XIRR needs buy DATES; a holdings file without dates yields xirr: null (a guessed
  date would fabricate timing — Constitution 4). Invested/sector/concentration still
  compute for undated positions.
- Current values come from the shared quote cache (peek semantics — the same X3 SSR
  path as the stock pages); a position with no cached quote reports value: null,
  never a seed placeholder.
- Positions are insert/delete only (no UPDATE policy): corrections re-import; the
  route cleans up a half-failed import so a retry completes (Constitution 11).
- The analytics module takes the sector lookup as an injected function — no engine
  or dataset import leaks into the client boundary.
