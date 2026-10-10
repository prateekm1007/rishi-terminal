# Round 42 — INT-RECONCILE: the two founder audit findings resolved at the root

Session 2026-10-10. Founder directives 5+6 (the pre-D3 audit findings),
both resolved in one PR against the verified root cause. Branch
`fix/int-reconcile` from `origin/main` = `1c86205` (the #304 merge).

## Finding 1 — the 928/928 pair (directive 5)

**Verified, not assumed.** The live production artifact for BANKBARODA
(`curl https://rishi-terminal.vercel.app/api/intelligence?capability=thesis&subject=BANKBARODA`,
2026-10-09T23:26Z) carried:

```
summary:      "... excluded=928). changeSince: state=CHANGED (fieldsTracked=3,
               fieldsChanged=3, transitionsSince=925)."
uncertainty:  ["928 observed transition(s) did not qualify as material evidence
                in this window and are excluded from the ledger.",
               "928 transition(s) were refused fail-closed by the materiality
                engine (non-comparable)."]
```

Derivation from A4's actual verdicts (`lib/intelligence/chain.ts`
`composeScaffold`): `nonMaterial.length` = 928 (the total line) and the
per-reason `byReason` map partitions those SAME verdicts — 0
below-threshold + 928 non-comparable. Every non-material verdict
carries exactly one reason (closed `MATERIALITY_REASONS` vocabulary,
pinned by test), so the partition is disjoint and complete: 928 = 0 +
928. **No arithmetic error, no double count in the data** — the two
lines are total-then-breakdown; the defect is that the wording never
says so. Repair (merged as the INT-A8-REC wording in #306, adopted
here): every breakdown line is prefixed "Of those excluded:" (the
1 + 1 + 8 ≤ 10 A1 bound and the string[] carrier are untouched), and
the tests pin that the partition sums to the total and that the
summary's `excluded=` equals the uncertainty total.

## Finding 2 — `whatChanged:[]` / `evidence:[]` with `changeSince CHANGED` (directive 6)

**No projection loss.** The projection is materiality-gated by design:
`whatChanged` and `evidence` are built from `events.filter((_, i) =>
aiSpendAllowed(verdicts[i]))` — zero material events means both are
empty BY DESIGN, while A6's `CHANGED` counts recorded rows (a different
scope, both stated). The positive control (material events DO project,
exact expected field lines) is pinned by test — `test/
intelligenceChainProductionShape.test.ts` case 1.

**The root cause of the zero-material state (traced to the A2 boundary,
verified read-only on production):** `appendStateTransitions` stored
`JSON.stringify(value)` — a STRING — into the JSONB `old_value`/
`new_value` columns, and `rowToStateLogRow` returned the value verbatim.
Every number round-tripped as `"236.52"`, A4's `isFiniteNumber`
correctly refused to scale a string, every leg abstained
`non-comparable`, and the statistical thresholds never evaluated a
single real number. Read-only verification via the Supabase Management
API (SELECT only, 2026-10-09T23:31Z):

```
SELECT field, jsonb_typeof(new_value) AS t, count(*) AS n
FROM public.observation_state_log GROUP BY 1,2 ORDER BY 1,2;
→ change    | string | 53353
  price     | string | 52449
  volume24h | string | 54398        (160,200 rows, 840 entities — 100% strings)
```

BANKBARODA row math reconciles exactly: 306 + 304 + 318 = 928 rows =
928 events (A3's 1:1 non-seed projection, zero seed rows); 3 rows sit
at the exact oldest timestamp (the warmer's batch write) = A6's
window-start baselines → 928 − 3 = 925 = `transitionsSince`.

**Repair (rule 15 — the root, not the symptom):** the writer stores
values NATIVELY (numbers as jsonb numbers; null `old_value` as SQL
NULL); the reader decodes legacy rows through `decodeLegacyJsonbValue`
(the exact inverse of the retired encoding: a string that parses as
JSON decodes to its value; native values and non-JSON text pass through
verbatim — deterministic, total, never guesses). `stateAt` inherits the
same boundary. No A4/A5/A6 change: their fail-closed refusals were
correct; they now receive real numbers. Post-repair, BANKBARODA's 928
events classify with REAL verdicts (the honest Phase-A
insufficient-history state until the ~2026-11-03 20-day baselines
accumulate — and a ≥4% intraday move fires material without baselines,
as pre-registered).

## Fail-first evidence (rule 21)

RED on the pre-repair tree (`git stash` of the implementation; raw
output in `red-fail-first.txt`, same directory):

```
 Test Files  3 failed (3)
      Tests  8 failed | 38 passed (46)
```

The 8 failures are exactly the new pins: the reader returning `"1070"`
(string) where `1070` (number) is required; the writer payload carrying
stringified values; the production-shape chain degrading every verdict
to non-comparable (the material +7% intraday move NOT projecting into
whatChanged/evidence); the missing partition prefix; the
missing empty-by-verdict explanation in whyItMatters.

GREEN after the repair (raw output above, this session):

```
 ✓ test/intelligenceChain.test.ts (24 tests) 75ms
 ✓ test/stateLog.test.ts (20 tests) 43ms
 ✓ test/intelligenceChainProductionShape.test.ts (2 tests) 13ms

 Test Files  3 passed (3)
      Tests  46 passed (46)
```

## Why the bug was invisible until now

The chain tests mock `readStateHistory` ABOVE the decoder (typed numeric
rows flow in, the real `rowToStateLogRow` never runs); the stateLog
tests pinned the pure builder and the upsert OPTIONS but never the
value ENCODING, and had zero coverage of the reader. The new
`intelligenceChainProductionShape.test.ts` runs the REAL reader against
PostgREST-shaped snake_case rows with legacy string values — only the
Supabase client is mocked — closing the seam gap permanently.

## Scope guard

- No threshold touched, no verdict manufactured, no excluded transition
  added to any ledger (the breakdown counts exclusions, never promotes
  them).
- No second parser, schema, cache, router, endpoint, or history system;
  A1 contract untouched (old cached artifacts remain valid).
- `changeIdOf` is unchanged — the deterministic identity is computed
  from the RAW value, so the repaired writer produces the SAME
  change_ids as before (idempotency preserved; the same observation
  re-appended still collapses to one row).
- Residual ambiguity of the legacy decode (a future native text value
  that happens to be valid JSON of another type) is documented at the
  decoder and bounded away from the intelligence chain (quote-path
  fields are numbers or SQL NULL by construction).

## Union resolution (parallel-session collision, the documented pattern)

While this PR was cadence-blocked, the parallel session's #306
(`fix/int-a8-rec`, merged `09884cc`) landed the PRESENTATION half of
both findings: the breakdown prefix "Of those excluded:" and the
InsightSummary whatChanged-empty wording ("No observed transition
qualified as material evidence in this window — the ledger records no
field change."). #306 touched no `stateLog.ts` — the root A2 JSONB
string round-trip remained. Resolution: main's line is adopted as the
base verbatim (wording, comments, and their reconciliation test); this
branch re-lands from `09884cc` carrying ONLY the unique value — the
root value-fidelity repair (writer native + reader legacy decode), the
boundary tests, the production-shape suite, and the whyItMatters
count-reconciliation + empty-by-verdict explanation (complementing
#306's UI-side empty state with the artifact-prose side). The original
superseded branch/PR (#307) is closed; its fail-first evidence stands
above unchanged.
