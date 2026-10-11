## What
- `lib/licensing.ts`: the ONE fail-closed switch (`PRICE_DATA_LICENSE.status = "unresolved"`), client-safe; `priceBased` REQUIRED on all 20 scorer contracts (18 true; Damani+Munger false; Nemish true — its Valuation pillar reads P/E); `licenseRefusal` consulted by all 20 scorers after the sector + placeholder guards; stock page withholds QVPS + honest metadata while unresolved.

## Why
- Founder directive 2026-10-11: "Treat any price-based score as unresolved until NSE answers in writing" — NSE non-display policy defines automated calculations on prices as licensed usage. Roadmap P0-8 (score leg).

## Proof
- RED: `npx vitest run test/licenseGate.test.ts` → `3 failed | 4 passed` (observed row produced consensus **78**). GREEN: `7 passed (7)`. Bite: Graham consultation removed → `2 failed`, restored → `7 passed`. Battery: `203 files / 2263 tests` all pass; tsc 0; eslint 0/283 exact; parity 0/896; build clean, 896 routes. `docs/evidence/round47/p0-8-license-gate.md`.

## Risk
- Public surfaces lose price-based verdicts by design (2 fundamental-only frameworks still evaluate; refusals name the hold). Paired guard: the 8 arithmetic suites pin the licensed state unweakened (C9); one switch re-enables in the PR recording NSE's written answer.

## Rollback
- `git revert <merge-sha>` on main (single commit; no data or schema touched).
