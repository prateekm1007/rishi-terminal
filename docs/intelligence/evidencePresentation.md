# INT-A8-PRES — the shared intelligence presentation repair (pre-registration)

Roadmap lineage: A8 (the shared primitives, CLOSED) — corrective
presentation record opened by the founder's audit 2026-10-09 (the
Dashboard Brief screenshot). Dependencies: A1 (contract, untouched —
schema unchanged), A4 (verdict reasons — read only), A10 (route,
untouched), B1/C1/D2 (the mounted surfaces — composition grows in the
same PR, declared here). This document is committed BEFORE any
evaluation (the A5–C1 precedent). Historical evidence files are not
rewritten; the gap is recorded HERE.

## The discovered gap (source-level, reproduced)

1. **No shared selectors exist for the semantic A8 classes.** The five
   primitives render `insight-surface`, `insight-surface__badges`,
   `insight-badge`, `insight-surface__title`, `insight-surface__list`,
   `insight-surface__item`, `insight-surface__text`,
   `insight-surface__facts`, `insight-fact`, `insight-fact__value`,
   `insight-fact__provenance`, `insight-surface__empty`,
   `insight-surface__provenance` — none of these selectors is defined
   in `app/globals.css` (the repo's ONE stylesheet; there is no
   utility-CSS pipeline — proven by the D2 production legs: utility
   class names in this tree render dead). Every mounted surface
   therefore falls back to browser defaults: default list bullets,
   stacked unstyled badges, no hierarchy, excessive spacing. The
   defect is at the CANONICAL OWNER (the shared layer), not at any
   surface — patching the three surfaces independently would create
   three competing designs.
2. **The artifact's prose fields are not displayed.** The A1 contract
   carries `summary`, `whyItMatters`, `whatChanged[]` (all REQUIRED,
   server-or-deterministic composed). The A8 mapping exposes only
   `whatChanged` (computed, never rendered by a shared component);
   `summary` and `whyItMatters` are not exposed at all. The surfaces
   show badges + provenance + (empty) evidence + uncertainty — the
   actual WHAT/WHY of the artifact is invisible.
3. **The empty-evidence wording conflates two things.** The chain's
   uncertainty line merges "below every pre-registered threshold" and
   "refused fail-closed" into one sentence, and `<EvidenceList>`'s
   empty state says "No evidence recorded." — technically compatible
   with hundreds of observed transitions, but the interface fails to
   explain that the transitions were EXCLUDED by verdict, not absent.
4. **No visible focus state** is defined for the interactive controls
   of the mounted surfaces (the five shared primitives themselves render
   none — verified at source; the interactive controls are the D2 badge
   and the drawer close button, and neither defines one — the browser's
   default outline is the only indication, never a designed state).

## The fix contract (canonical owner, one shared approach)

1. **Centralized selectors in `app/globals.css`** for the EXISTING
   semantic A8 classes (no new dead utility classes, no per-surface
   patches): the section block (border, surface background, spacing),
   a horizontal badge row (`display: flex`, `list-style: none`), pill
   badges mirroring the design system's `.badge` vocabulary, title
   hierarchy, clean lists (no browser bullets), fact rows, provenance
   line, honest empty state, and a `:focus-visible` rule SCOPED to the
   mounted intelligence surfaces (the shared composition block and the
   drawer panel) so every interactive control inside them has a
   visible, designed focus state — the rule never restyles controls
   outside the intelligence surfaces (no drive-by). Responsive: the
   section stack collapses gracefully on narrow viewports (fluid
   padding, wrapping badge row).
2. **ONE new shared primitive** `components/intelligence/
   InsightSummary.tsx` renders the artifact's prose verbatim as
   labelled, deterministic/model-status-appropriate content:
   the `summary` paragraph (label "Summary"), the `whyItMatters`
   paragraph (label "Why it matters"), and the `whatChanged[]` list
   (label "What changed", `field: change` lines verbatim — the numbers
   are the deterministic layer's own strings, never composed in JSX).
   No advice strings; deterministic prose is never labelled
   AI-generated (the provenance line below it already carries the
   model state). The mapping grows `summary`/`whyItMatters` fields
   (verbatim strings; no interpretation).
3. **The pinned composition grows to six steps** (declared, never
   silent — the index barrel comment already demands amending the
   pre-registration in the same PR): InsightBadges → InsightSummary →
   ProvenanceLine → ContradictionBanner → EvidenceList →
   UncertaintyBlock. B1/C1/D2 surfaces and the fixture route mount the
   same shared composition; their source pins grow in this PR.
4. **The chain replaces the conflated sentence with a deterministic
   per-reason breakdown** derived from A4's actual verdicts
   (`verdict.reason` — never parsed from text, never invented):
   one total line, then one line per observed non-material reason in a
   fixed template, below-threshold distinguished from the fail-closed
   refusals. The closed A4 vocabulary has exactly 9 non-material
   reasons; 9 reason lines + 1 total line fit the A1 `uncertainty`
   bound (max 10) with no truncation — a static pin asserts this bound
   so a future A4 vocabulary change that would overflow FAILS here.
   The uncertainty carrier stays `string[]` (the A1 schema is
   untouched; old cached artifacts remain valid).
5. **`<EvidenceList>`'s empty state** states the truth the view can
   prove by construction: no observed transition QUALIFIED as material
   evidence in this window (the ledger holds only material events) —
   never "no observations occurred", never a fabricated count.

## What this repair is NOT

- not an A1 schema change, not a route change, not a cache change;
- not a materiality change: no threshold lowered, no event
  manufactured, no excluded transition added to the ledger (the
  breakdown COUNTS exclusions, it never promotes them);
- not a relabeling of deterministic output as model-generated (the
  provenance line stays the single honesty carrier);
- not a per-surface redesign: B1/C1/D2 keep their fetch/state
  machines; only the shared composition and the shared stylesheet
  change.

## Verification plan

- RED (fail-first): Playwright computed-style specs assert the
  intended presentation on the fixture route (badges grouped with no
  default bullets via computed styles, section hierarchy, focus
  visibility) and the honest no-material states on the live-shaped
  fixtures; unit pins for the mapping's prose fields, the chain's
  per-reason breakdown (including the 9+1 ≤ 10 bound pin and its
  determinism), and the EvidenceList wording — all captured failing on
  the pre-implementation tree.
- GREEN: the shared CSS + the new primitive + the chain breakdown +
  the wording fix; full battery; the three surfaces' pins grow.
- Production legs on the exact deployed SHA: the dashboard brief, the
  stock panel and the drawer render the styled shared composition
  (computed-style assertions in a real browser against the deployed
  pages), the no-material case explains the exclusion breakdown, and
  the honest unknown/low/low/deterministic states are unchanged.

## Amendment (INT-RECONCILE, 2026-10-10) — the breakdown states its partition

The founder audit (2026-10-10 directives 5+6) found the shipped breakdown
wording ambiguous: the artifact carried the TOTAL non-material count and
the single observed refusal class with the SAME number (928/928) and no
stated relation, which reads as a double-count. The partition itself was
verified exact (disjoint and complete by construction — every
non-material verdict carries exactly one reason; the per-reason counts
sum to the total). This amendment, riding the same contract:

- every breakdown line after the total is prefixed "Of those excluded:"
  (the INT-A8-REC wording, merged in #306) so the
  subset relation is explicit (the per-reason classes partition the
  total line's count; they are never additive with it);
- the total line, the summary's `excluded=` ledger count, and the
  verdict partition reconcile exactly (pinned by test — the counts are
  derived from A4's verdicts, never adjusted to match);
- `whyItMatters` states each total with its own scope (in-window
  transitions, window-start baseline rows, projected events) and, when
  nothing qualified as material, explains that `whatChanged` and the
  evidence ledger are empty by A4 verdict — never by data loss.

The A1 schema, the line-count bound (1 + 1 + 8 ≤ 10), and the carrier
(`string[]`) are untouched; historical evidence files stand unchanged.
