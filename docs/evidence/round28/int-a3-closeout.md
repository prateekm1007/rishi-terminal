# INT-A3 closeout — strict audit, repair, merge, deploy (round 28)

Roadmap item: **A3 (Events — deterministic intelligence event
projection)**. Dependencies: A1, A2. One roadmap item, one PR: #263.
This file is the round-28 closeout record; the audit itself is posted
verbatim on the PR thread (#263 issuecomment-6061987539).

## Timeline (all 2026-10-08 UTC)

```
05:54:41  #263 opened (parallel session, head 2fe15c1, base 2d74e06)
13:53:21  NS1 first real scheduled run (see round26/ns1-production-proof.md)
14:10     #266 merged — Phase 0 CLOSED
14:23:05  #267 merged (parallel session; NS1 health semantics — disputed,
          FOUNDER DECISION NEEDED filed on #267 thread)
14:25     strict A3 audit completed on 2fe15c1 — one hard gap + two
          strengthenings found
14:18     RED proof captured (seed test fails on 2fe15c1)
14:19     root fix committed (a065741)
14:33     branch updated with main (ee4337b, update-branch API)
15:23:32  CI re-run at cadence-window open (C8 window from #267's 14:23:05)
15:28     CI 6/6 green
15:30     #263 MERGED — main = 6c61d4ae
15:31     production /api/version == 6c61d4ae (deploy verified)
```

## The audit verdict (directives 5–7) — original head 2fe15c1

| Directive 6 invariant | Verdict |
|---|---|
| `observation_state_log` → pure projection → `IntelligenceEvent` | MET |
| same input → same events | MET (pure; now also byte-stable, pinned) |
| unmapped field → no event | MET (`FIELD_CATEGORY` fail-closed) |
| **seed-derived state → no event** | **GAP — projected with confidence "low"** |
| no clocks / no randomness / no model / no I/O / no persistence | MET (imports: types only) |
| no materiality verdict | MET (now pinned by the exact closed key set) |
| event carries all 14 required fields verbatim | MET |

Directive 7 negative-path quality: the original 8 tests covered unmapped
→ null, the 5-state confidence map, equality-stability, input-not-mutated,
and a single-word materiality ban. Missing: the seed refusal, byte
stability, and an unbypassable entropy guard.

## RED → GREEN (rule 21, raw outputs)

RED on 2fe15c1 (the new negative path, before the fix):

```
$ npx vitest run test/intelligenceEvents.test.ts
 ❯ test/intelligenceEvents.test.ts:149:56
    147|     // would launder reference data into the intelligence stream — the
    148|     // placeholder-as-live sin (B-04) at the substrate level.
    149|     expect(projectEvent(ROW({ sourceState: "seed" }))).toBeNull();
       |                                                        ^
 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
      Exit code 1
```

Root fix (a065741): `NON_OBSERVATION_STATES` gate in `projectEvent` —
the state LOG is temporal memory (seed-sourced transitions may be logged
for traceability by future reference writers); the EVENT stream is the
observation stream that A4 materiality and AI-synthesis eligibility feed
on. A seed row is reference data, not an observation.

GREEN with the fix:

```
$ npx vitest run test/intelligenceEvents.test.ts
 ✓ test/intelligenceEvents.test.ts (10 tests) 6ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
      Exit code 0
```

Also strengthened: the entropy guard is now the exact 13-key closed set
(no A4 semantic of ANY name — materiality, importance, impact,
significance, magnitude — can be attached silently); output byte
stability pinned via `JSON.stringify` identity; `eventConfidenceOf`
docstring records that its `seed → low` branch is unreachable from the
projection by design (total exported map over the closed vocabulary,
never improvised at call sites).

## Full battery on the repaired branch (a065741 / ee4337b)

```
$ npx tsc --noEmit                                    → exit 0
$ npx eslint .                                        → 0 errors, 283 warnings (ratchet holds)
$ npx vitest run                                      → 174 files / 1834 tests passed (a065741)
                                                        174 files / 1837 tests passed (ee4337b merged tree)
$ npm run validate:encoding                           → passed, no mojibake
$ npx tsx scripts/validateStocks.ts                   → all T12 gates passed
$ npx tsx scripts/scoreParity.ts                      → 896 symbols, 0 mismatches / 0 non-finite
```

Pristine branch head measured 1832 tests; the PR body's "1831" was off
by one (recorded honestly on the thread).

## CI (ee4337b, re-run at the open cadence window)

```
Lint, typecheck, test, validate   -> success   (cadence gate PASS: window from #267 14:23:05 elapsed)
Docker Space image (E1)           -> success
Migrations & RLS invariants       -> success
Playwright smoke                  -> success
Lighthouse gate (U3)              -> success
Vercel preview                    -> success (ignored-build-step skipped preview by design)
```

The first CI round on the repaired branch failed ONLY the deploy-cadence
gate (C8: #267 merged 14:23:05, one-production-merge-per-hour) — the
gate biting exactly as designed; no code failure at any point.

## Merge + deploy (C6)

```
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"6c61d4ae432453d934e8003d8ca82780fe7ee07f","now":"2026-10-08T15:31:16.770Z","node":"v24.21.0"}
```

origin/main = `6c61d4ae` = production. **A3 is merged, deployed, and
live at the exact SHA.**

## Closure statement (Definition of Complete)

Code ✅ fail-first tests ✅ (RED at import on the pre-module tree — the
PR's own proof — plus the RED seed-repair proof above) regression ✅
CI ✅ merged ✅ deployed ✅ exact production SHA ✅. A3 is a pure
substrate library with no runtime consumer by design (A4–A7 are the
consumers, in dependency order; the roadmap classified A1 the same way),
so there is no production UI surface to verify yet — the deployed-SHA
identity plus the deterministic-projection test contract IS the
production proof for this item. Latency/grounding/provenance obligations
attach to the consuming surfaces (A8+), not to the pure projection.

**A3 is CLOSED. Next: INT-A4 — BLOCKED on the founder's threshold
confirmation (see the roadmap's standing-blocked items and the escalation
posted on #263).**
