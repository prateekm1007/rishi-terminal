# INT-A8 — Evidence / Uncertainty / Contradiction UI (round 33)

Roadmap item A8; dependencies A1 (contract) + A7 (cache/changeKey),
both CLOSED. Founder scope decision 2026-10-09 (carried in the
pre-registration): primitives ship unmounted; a NON-INDEXED FIXTURE
ROUTE renders canned contract fixtures for Playwright/production
verification; Phase B–J features do the mounting.

## Race record (rule 7, disclosed)

A parallel session (this agent) independently pre-registered a
competing contract (`docs/intelligence/evidenceUI.md`, local-only,
never pushed) and built a first implementation against it. The
canonical pre-registration on `feat/int-a8-evidence-ui` (commit
`5adb0a2`) carries the founder fixture-route scope, the lib-mapping
architecture (the `lib/pricePresentation.ts` ownership precedent), and
the richer closed-state set. Per rule 7 the competing branch was
abandoned at the duplicate-search stage — reset before any push, no
remote trace, zero code survived. All A8 work continues on the
canonical contract. PR #284's body records the reconciliation.

## The sequence (per the pre-registration's verification plan)

1. **Pre-registration** (`5adb0a2`, before any evaluation):
   `docs/intelligence/evidence.md` — the ONE presentational contract,
   closed states, relationship to existing surfaces (ProvenanceChip,
   InsufficientDataRecord, AiEvidenceItem — all kept, no merges),
   explicit non-goals, verification plan.
2. **RED** (`24d1f09`): `test/intelligenceEvidence.test.ts` importing
   the absent modules — captured `Cannot find package
   '@/lib/intelligence/evidence'` (rule 21 bite).
3. **GREEN** (`0ceb11a`):
   - `lib/intelligence/evidence.ts` — the ONE presentational mapping
     (pure: no React/fetch/clock/random/model imports, pinned): evidence
     rows with verbatim fact provenance (absent source = NO claim),
     contradiction banner mirroring the contract's biconditional
     (dangling id → the refused null state, never invented text),
     provenance disclosure (deterministic → "no model involved";
     bounded-model → the full trio or refuse — the mapping defends even
     though A1's schema already refuses partial trios), exact-vocabulary
     badges (em-dash defense at the display boundary), verbatim
     uncertainty/invalidators/next-investigations.
   - `lib/intelligence/evidenceFixtures.ts` — the ONE canned fixture
     source (5 closed states: conflict-with-contradictions,
     deterministic-provenance, bounded-model-provenance,
     empty-uncertainty, minimal). Interpretation note (recorded in the
     PR): the pre-registration's "built once in the test file and
     imported by the route" cannot literally hold (vitest globals would
     enter the app bundle); the shared raw-object module preserves every
     pinned property — test-enforced parse-validity + route
     parse-or-refuse.
   - `components/intelligence/` — five thin primitives (EvidenceList,
     ContradictionBanner, UncertaintyBlock, ProvenanceLine,
     InsightBadges): server-component safe, data-* audit attributes,
     zero interpretation, zero product links.
   - `app/evidence-fixtures/page.tsx` — the founder-scoped non-indexed
     route (metadata noindex + robots.txt disallow), parse-or-refuse at
     the boundary.
   - `test/smoke/evidence-fixtures.spec.ts` — SSR positive controls,
     absence pins (no advice strings, no fetching states), non-indexing
     checks.
4. **Gate bites (rule 24)** — all recorded, all restored to 15/15:
   biconditional-mirror break → 2 failed; fallback-word invention →
   1 failed; parser-import (abandoned-branch idea) → forbidden-surface
   pin; and the repo's OWN P0-05 provenance audit caught the new route
   (the audit must list every page) → regenerated per its instruction,
   `/evidence-fixtures` classified `none` (canned fixtures, no market
   data). One honest miss inside the bite: the first regeneration ran
   before the route's commit landed and pinned a stale snapshot date
   (the audit's snapshot is the committer date of the last app/-touching
   commit, Constitution-18-deterministic) → CI refused the file as
   stale → regenerated at the correct HEAD (`f09dd36`).
5. **Battery** on `f09dd36`: tsc 0; eslint 0 errors / ratchet 283
   holds; encoding/T12/scoreParity clean; vitest **180 files / 1957
   tests all passing**. CI: all six blocking checks success on the PR
   head — including the Playwright smoke suite running the new
   evidence-fixtures spec against the built app.

## Merge + production leg (2026-10-09)

```
Merge: gates 0-6 printed -> 36e95b2 (2026-10-09 ~04:50Z; last
       production-relevant merge 197.8 min ago — cadence PASS)
Deploy: production /api/version = 36e95b2e… (polls 433cc342 -> landed)
post-deploy-smoke on 36e95b2e -> success (C2)
C6 LIVE positive control (curl, production):
  GET /evidence-fixtures (60,883 bytes SSR HTML)
  - all five fixture sections present            PASS
  - contradiction banner joined texts            PASS
  - provenance disclosure mirrored               PASS
  - honest empty states                          PASS
  - badges exact vocabulary                      PASS
  - absence pins (no BUY/SELL/HOLD/FETCHING)     PASS
  - metadata noindex                             PASS
  - robots.txt Disallow: /evidence-fixtures live PASS
CI on the merge commit: success (incl. Migrations & RLS invariants)
```

## Final tuple

| Fact | Value |
| --- | --- |
| Pre-registration | `5adb0a2` (canonical; founder fixture-route scope) |
| Implementation PR | #284 → merge commit `36e95b2` (gates 0-6) |
| Production serving | `36e95b2e…` — version, post-deploy-smoke, C6-live fixture-route controls ALL PASS |
| Tests | 15 new closed-state pins + 3 Playwright SSR controls; battery 180 files / 1957 all passing |
| Bundle delta | zero on product surfaces (no mounting; route is non-indexed and unlinked) |
| AI tokens | zero (no model surface anywhere in the mapping or primitives — pinned) |

A8 is CLOSED: the shared honesty primitives exist, are CI-pinned,
merged, deployed, and verified in real production HTML through the
founder-scoped fixture route. Mounting arrives with Phase B–J;
A9 (Ask Rishi) and A10 (/api/intelligence) are next in the frozen
sequence.
