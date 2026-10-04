# X3-05 — Screener v2: fail-first and acceptance evidence

All commands run on branch `fix/x3-05-screener-v2` (base `e678e49`, main after A2+A5 merged) on 2026-10-04.

## 1. Roadmap acceptance commands (raw)

### `npx vitest run test/screener.parser.test.ts`

```
 Test Files  1 passed (1)
      Tests  47 passed (47)
   Start at  13:34:53
   Duration  431ms
```

Fuzz details: 10,000 inputs (deterministic mulberry32 seed 20261004 — reproducible);
5% generated from the grammar itself (valid expressions), 95% adversarial junk over a
charset including quotes, backticks, `${}`, unicode, SQL and JS metacharacters.
Every input returned a shaped result — zero uncaught throws; every classic injection
payload (`process.exit(1)`, `eval("pe > 0")`, `new Function(...)`, `; DROP TABLE screens;--`,
`${process.env...}`, `constructor.constructor(...)`, `__proto__[...]`, UNION SELECT, …)
returned a positioned parse error.

### `npx tsx scripts/benchScreener.ts --universe`

```
[benchScreener] universe=916 iterations/query=200
[benchScreener] pe > 0 and roe > 15                                    median=0.046ms p95=0.059ms max=0.096ms
[benchScreener] sector = "Banking" and de < 1                          median=0.030ms p95=0.097ms max=8.928ms
[benchScreener] consensus is not null and consensus >= 75              median=0.040ms p95=0.049ms max=0.083ms
[benchScreener] mktcap > 10000 and revcagr > 10                        median=0.042ms p95=0.049ms max=0.100ms
[benchScreener] pe > 0 or roe > 15 or de < 1 or mktcap > 5000          median=0.044ms p95=0.056ms max=0.501ms
[benchScreener] (pe > 0 and roe > 15) or (consensus is not null and consensus >= 75 and de < 0.5) median=0.069ms p95=0.078ms max=0.098ms
[benchScreener] worst p95 = 0.080 ms (budget 500 ms)
[benchScreener] PASS
```

(The verbatim command works without flags: `scripts/benchScreener.ts` is an entry shim
that re-execs the implementation with `--conditions react-server`, the established
scoreParity pattern — the slim index is `server-only` by N1.)

### `npx vitest run test/rls.screens.test.ts`

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

### `git grep -nE "\beval\(|new Function\(" -- app lib`

```
(no output — exit 1)
```

Also enforced permanently by the last block of `test/screener.parser.test.ts`,
which walks `app/` + `lib/` on every CI run.

## 2. Behavioral RLS proof (real Postgres 18 via embedded-postgres, local run)

Driver: `/home/z/my-project/pgtest/x3-05-rls-proof.mjs` (persisted). It applies
`scripts/ci/pg_harness.sql`, all migrations 001–024, then the full
`scripts/ci/rls_invariants.sql` — the same script the CI migrations job runs on
Postgres 16.

```
[3] rls_invariants.sql (all blocks, expect PASS)
    PASS — X3-05 invariants hold with the policies in place
[4] RED-1: drop all screens policies
    RED confirmed (policies dropped) — X3-05 FAILED: user A cannot READ own screen (0 rows)
[5] RED-2: permissive USING (true) policies (unscoped)
    RED confirmed (unscoped policies) — X3-05 FAILED: user B READ user A's screen (1 rows)
RESULT: GREEN + RED-1 + RED-2 all proven
```

RED-2 is the exact acceptance failure mode: with unscoped policies, user B reads
user A's screen and the block RAISES. The same blocks run in CI (Postgres 16) on
every push.

## 3. Source-level gate RED proof (rule 24)

Sabotage: `sed 's/USING (auth.uid() = user_id);/USING (true);/'` on migration 024
(select + delete policies unscoped), then:

```
     × scopes SELECT to auth.uid() = user_id for authenticated only 4ms
     × scopes DELETE with USING (auth.uid() = user_id) 1ms
     × creates NO policy that omits the ownership predicate (fail-closed review) 1ms
```

Restored: `Tests 12 passed (12)`.

## 4. Full gate battery on the branch

```
npx tsc --noEmit                                  → clean (no output)
npx eslint .                                      → 0 errors (301 warnings, ratchet holds at 301)
npm run lint:ratchet                              → "Ratchet holds."
npm run validate:encoding                         → passed, no mojibake
npx tsx scripts/validateStocks.ts                 → all T12 gates passed, 916 symbols
npx tsx scripts/scoreParity.ts                    → 0 mismatches / 0 non-finite of 916
npx tsx scripts/provenanceAudit.ts                → 34 pages, PROVENANCE.md regenerated, no diff
npm run build                                     → exit 0; ƒ /api/screener/query, ƒ /api/screener/export,
                                                    ƒ /api/screens, ƒ /api/screens/[id]; /screener stays ○ (static)
```

## 5. Design notes (what the gate does NOT claim)

- The query engine evaluates **server-side only**; the client never parses or
  evaluates an expression (the roadmap's "safe parser" requirement is about the
  server surface; the browser only renders results).
- Fields are the N1 slim-index public fields; engine inputs (ocf, rev, np, …)
  are deliberately NOT filterable — that would be a client-boundary regression.
- Saved screens store the query TEXT; re-parsing on read is total and free.
  A screen that does not parse cannot be saved (400 at the API boundary).
- CSV export emits the same public slim fields; null consensus exports as an
  empty cell, never 0.
