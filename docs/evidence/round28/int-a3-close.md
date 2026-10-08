# INT-A3 — deterministic intelligence event projection: CLOSED (round 28)

## Merge, deploy, exact SHA

- PR #263 merged: `6c61d4ae432453d934e8003d8ca82780fe7ee07f`
  (parents `e5e75b7` = main, `ee4337b` = PR head; merged 2026-10-08T15:29:02Z).
- Deployed: production `/api/version` = `6c61d4ae432453d934e8003d8ca82780fe7ee07f`
  (verified 15:35:22Z). Docs-only commits after it carry no redeploy obligation (C6).
- CI on the merged head: 6/6 checks success (Lint/typecheck/test/validate;
  Migrations & RLS; Docker E1; Lighthouse U3; Playwright smoke; Preview comments).
  The one earlier red run was the C8 deploy-cadence gate correctly refusing a
  merge 10.2 min after #267 (earliest safe merge enforced, re-run on green at
  the opened slot) — a gate biting, not a defect.

## Strict audit (founder round-28 directions 6–7) — all verified on the merged tree

| Invariant | Evidence |
|---|---|
| observation_state_log → pure projection → IntelligenceEvent | `projectEvent(StateLogRow) → IntelligenceEvent \| null`; no other path |
| same input → same events | purity test (deep-equal across calls) + byte-stable JSON test |
| unmapped field → no event | pinned: `someFutureField`/`pe_ratio` → null / `[]` |
| seed-derived state → no event | `NON_OBSERVATION_STATES = {"seed"}`; pinned test (single row → null; mixed batch drops exactly the seed row) — repair `a065741`, fail-first on the pre-repair tree |
| no clocks / no randomness / no model / no I/O | module grep: the ONLY import is `import type { StateLogRow, StateSourceState } from "./stateLog"`; no `Date.now`, `new Date`, `Math.random`, `fetch`, `setTimeout` |
| no persistence | no table/writer/reader; the state log (A2) remains the ONE history system |
| no materiality verdict | EXACT key-set closure test: the event's keys equal precisely the 13 founder-listed fields (id, category, entity, field, unit, observedAt, recordedAt, source, sourceState, oldValue, newValue, confidence, evidenceRefs) — no `materiality`/`importance`/`impact`/`significance`/`magnitude` under any future name |
| confidence map total + deterministic | live→high; live-undated→moderate; derived→moderate; seed→low; unavailable→low (map kept total for the shared vocabulary; the projection refuses seed before confidence is ever assigned) |
| input not mutated | pinned (JSON snapshot before/after) |

## Regression on the exact shipping tree (`ee4337b` content = merged main)

```text
npx tsc --noEmit          → exit 0
npx vitest run            → Test Files 174 passed (174), Tests 1837 passed (1837)
npx eslint .              → 0 errors (283 warnings, ratchet holds)
npm run validate:encoding → passed
validateStocks            → all T12 gates passed
scoreParity               → 0 mismatches / 0 non-finite of 896
```

## Production verification — honest scope

A3 is a pure substrate module with NO importer on `main` (by design: A4–A7
are its consumers, in dependency order). The C6 live leg therefore verifies:
the exact merged SHA is what production serves, the build/bundle/Lighthouse
gates ran green on this tree, and no runtime behavior changed (no importers).
Real production execution through real surfaces begins when the first
consumer item (A4 → A7 → A8+) lands; that item's closeout carries the
end-to-end evidence through this module.

## A4 gate (next item) — FOUNDER DECISION NEEDED

`docs/INTELLIGENCE_ROADMAP.md` marks the A4 materiality thresholds PROPOSED
and requires founder confirmation before the task starts, plus a docs-only
pre-registration commit before any evaluation. Surfaced in the round-28
session reply with the roadmap's proposed set as the recommended default;
no threshold work begins until resolved.
