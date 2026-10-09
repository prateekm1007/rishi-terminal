# INT-A8 — Evidence / Uncertainty / Contradiction UI (shared primitives): pre-registration

Roadmap item: A8; Dependencies: A1 (contract), A7 (cache/changeKey).
Founder scope decision 2026-10-09: **fixture route** — primitives ship
unmounted; a non-indexed fixture route renders canned contract fixtures
for Playwright/production verification. Zero product-surface change;
Phase B–J features do the mounting.

## What A8 is (execution rule 4 for this item)

A8 means a pure presentational contract over the A1 `RishiInsight` +
thin shared React primitives that render ONLY its closed states —
never "LLM decides what the evidence means", never a new data fetch,
never numbers composed in JSX.

## The ONE presentational contract

`lib/intelligence/evidence.ts` (new; pure, no React, no fetch, no
clock, no randomness, no model imports — pinned by a static source
scan in the suite, A7 precedent). Input: `RishiInsight` (already
zod-validated at the boundary by A1's `parseRishiInsight`; the module
takes the parsed type, never re-parses). Output: closed display
states —

- **Evidence rows**: `evidence[].text` + fact-level provenance labels
  from the fact `source` enum (`live`/`derived`/`seed`; absent source
  renders no provenance claim, never a default). Numbers reach the
  screen only through `evidence[].facts` values and the
  `whatChanged[]` change strings the deterministic layer composed —
  the mapping never arithmetics, never formats a number from parts.
- **Uncertainty block**: `uncertainty[]` rendered verbatim as a
  labelled list; empty array renders the honest "no stated
  uncertainties" state, never invented caveats.
- **Contradiction banner**: rendered if and only if
  `status === "conflict"` — the display MIRRORS the contract's
  biconditional (contradictions exist <=> status is "conflict"), never
  re-derives it. Each contradiction cites the evidence ids the
  contract already validated; the mapping resolves ids to row text
  for display and refuses (returns null state) on a dangling id.
- **Provenance line**: mirrors `provenance.synthesisPath`
  (`deterministic` → "deterministic artifact, no model involved";
  `bounded-model` → provider + model + synthesizedAt, all three, else
  refuse). Deterministic artifacts never render a model label (A1
  honesty coupling, display-side).
- **Badges**: status / confidence / materiality / modelStatus render
  their exact vocabulary words (5 / 3 / 3 / 5 closed sets); unknown
  stays unknown — a missing optional renders an em dash (C1/R9),
  never a fallback word.
- **Invalidators / next investigations**: labelled verbatim lists
  (never advice: the product contract is investigation, not buy/sell;
  pinned by an absence assertion — no BUY/SELL/HOLD strings in the
  module or primitives).

## Relationship to existing surfaces (no duplicates, rule 7/14)

- `ProvenanceChip` (field-level price provenance) stays: different
  concept from insight-artifact provenance. No merge.
- `InsufficientDataRecord` (page-level contradiction gate) stays: a
  page gate, not a shared primitive. No merge.
- No second evidence format: `InsightEvidenceItem` is already the
  structural mirror of `AiEvidenceItem` (A1 §8 note). The mapping
  consumes it as-is.
- `lib/pricePresentation.ts` (Round 9) is the precedent for ownership:
  all interpretation lives in the ONE lib module; JSX renders closed
  states only.

## Shared primitives

`components/intelligence/` (new directory): one thin component per
closed state (evidence list, uncertainty block, contradiction banner,
provenance line, badge set). Props are the mapping's output types —
a component receiving anything else fails typecheck by construction.
`'use client'` only where interactivity demands; otherwise server
components.

## Fixture route (founder-scoped)

`app/evidence-fixtures/page.tsx` (server component): renders the
primitives over CANNED `RishiInsight` fixtures (one per closed state:
conflict-with-contradictions, bounded-model provenance,
deterministic provenance, empty-uncertainty, minimal artifact) built
once in the test file and imported by the route — fixtures are
`parseRishiInsight`-valid by construction (the route refuses to render
a fixture that fails the parse; a failing fixture is a build-time
error, never a runtime guess). `metadata` carries
`robots: { index: false }` + `robots.ts` gains the disallow entry.
No link from any product surface; no sitemap entry.

## Verification (fail-first, C5/C10)

- RED: `test/intelligenceEvidence.test.ts` importing the absent
  module (import fail, exit 1) + closed-state pins written first.
- GREEN pins: determinism (same insight → same view model);
  contradiction iff status==="conflict" (+ dangling-id refusal);
  provenance disclosure mirroring (incl. deterministic-no-model-label
  + bounded-model-trio-or-refuse); fact-source label closure;
  em-dash unknowns; verbatim uncertainty/invalidators (no invention);
  source-scan pins (no fetch/Date/random/model imports in lib;
  no BUY/SELL/HOLD strings anywhere in the item).
- Gate bites: break the biconditional mirror, drop a disclosure
  field, invent a fallback word → tests fail → restore.
- Playwright `test/smoke/evidence-fixtures.spec.ts`: SSR-HTML
  assertions on the fixture route (positive controls per C10 — the
  expected NEW strings present; absence pins — no advice strings, no
  "FETCHING"/fetching states in first byte).
- Battery 180 files; tsc 0; eslint 0 errors + ratchet holds; encoding
  green. CI → cadence (C8; Vercel quota per `docs/RELEASE.md` before
  merging) → merge-guard → deploy → exact production SHA → prod
  fixture-route positive-control fetch (C6 Live).
- Closeout: `docs/evidence/round33/int-a8.md` + this roadmap row.

## Explicit non-goals

No mounting on product surfaces; no `/api/intelligence` (A10); no
Ask-Rishi wiring (A9); no new fetching/caching/model calls; no
redesign of existing insight displays (`RishiGrid`, `LensInsights`
untouched).

---

## 2026-10-10 gap record + repair pre-registration (INT-A8 shared-surface)

**The gap (found in production, D2 legs 2026-10-09):** the A8
components rendered semantic class names (`insight-surface*`,
`insight-badge`, `insight-fact*`) that `app/globals.css` never
defined — zero matching selectors. Every A8 surface (B1 panel, C1
brief, D2 drawer, the fixture route) fell back to browser defaults:
disc bullets on the badge row and every list, unstyled prose, no
hierarchy. Compounding it, the A1 prose contract (`summary`,
`whyItMatters`, `whatChanged`) never reached the screen — the mapping
did not carry it and no primitive rendered it — and the empty-evidence
wording ("No evidence recorded.") implied no observations occurred,
when the truth was that A4 verdicts had excluded them all.

**The repair (one PR, scoped):**

1. **Centralized selectors** in `app/globals.css` for the existing
   semantic A8 classes — one shared definition, no per-surface
   overrides, no independent redesigns in `DashboardBrief`,
   `IntelligencePanel`, `IntelligenceDrawer`. The D2 badge/drawer
   chrome stays inline (the #300 decision — this tree has no
   utility-CSS pipeline); everything inside the composition rides the
   shared selectors.
2. **The A1 prose renders verbatim** through the shared contract: the
   mapping carries `summary` / `whyItMatters` (plus the already-carried
   `whatChanged`), and two new shared primitives render them under
   fixed labels ("What changed", "Why it matters", "Field-level
   changes"). No composed numbers in JSX, no invented explanations,
   never an AI-generated label on deterministic prose (the provenance
   line owns that coupling).
3. **Honest empty-evidence state**: "No observations qualified as
   material evidence in the observation window." plus the
   deterministic A4 excluded-verdict breakdown — counts by reason
   composed by the chain into the artifact (new optional A1 field
   `excludedVerdicts`), rendered with data attributes, never parsed
   from UI text, never ledger rows.
4. **Regression tests reproducing the screenshot defects**
   (`test/smoke/a8-shared-surface.spec.ts`): computed-style
   assertions on all three product surfaces (no default bullets,
   grouped flex badges, deliberate hierarchy, visible summary /
   whatChanged, honest unknown/low/no-model states unchanged, no
   invented facts or advice) with positive controls, plus the vitest
   pins in `test/intelligenceEvidence.test.ts` (13 new pins, RED
   first on the pre-repair tree).

**Non-goals (unchanged):** no new fetching, no second parser, no
ledger changes, no threshold changes, no generated-insight surface
(still A4-gated), no redesign of the D2 chrome.
