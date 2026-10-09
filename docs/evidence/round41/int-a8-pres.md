# INT-A8-PRES — the shared intelligence presentation repair (round 41)

Pre-registration: `docs/intelligence/evidencePresentation.md` (PR
#301, merged `4285ae6`, committed BEFORE any evaluation — the
founder-audit corrective record). Implementation PR **#302** (RED
`4b7419b`, ratchet re-lock `33e8315`, GREEN `944de09`, harness fix
`4425345`; branch merged with main `5540d35` after the CI-mirror fix
#303 → head `e21916b` → merge `aea75f6a`, merge-guard gates 0–6 with
the pinned head SHA).

## What shipped (summary; the binding contract is #301)

- `app/globals.css` — the canonical selectors for the EXISTING semantic
  A8 classes (section block, horizontal pill badge row, title
  hierarchy, clean lists, fact rows, provenance line, honest empty
  states) + the `:focus-visible` rule SCOPED to the mounted
  intelligence surfaces (the shared composition block and the drawer
  panel). No control outside the intelligence surfaces is restyled.
- `components/intelligence/InsightSummary.tsx` — the SIXTH shared
  primitive: the A1 prose fields rendered verbatim under labels
  (Summary / Why it matters / What changed — `field: change` lines
  verbatim, never composed in JSX); deterministic prose never labelled
  AI-generated (the provenance line stays the single honesty carrier).
- The pinned composition grows to SIX steps in all four mounts (fixture
  route, B1, C1, D2): InsightBadges → InsightSummary → ProvenanceLine →
  ContradictionBanner → EvidenceList → UncertaintyBlock; the surfaces'
  pins grow in the same PR.
- `lib/intelligence/chain.ts` — the conflated uncertainty sentence is
  replaced by the deterministic per-reason exclusion breakdown derived
  from A4's ACTUAL verdicts (`verdict.reason` verbatim; one total line,
  one below-threshold line when observed, one line per observed refusal
  reason in the pinned `NON_MATERIAL_REFUSAL_ORDER`); the carrier stays
  `string[]` (A1 schema untouched); the 8 refusal reasons + 1 total + 1
  below-threshold = 10 fits the A1 bound — pinned statically so a
  future A4 vocabulary change that would overflow fails in the suite.
- `<EvidenceList>`'s empty state states the exclusion truth: no
  observed transition QUALIFIED as material evidence in this window —
  never "no observations occurred", never a fabricated count.

## Fail-first (rule 21, raw captures in the PR)

RED `4b7419b`: presentation suite 6 failed, primitive suite 6/6
failed, chain breakdown 3 failed (20 existing pins unharmed),
Playwright computed-style 6 failed — on the pre-implementation tree
`globals.css` carried ZERO `insight-surface` selectors (browser
defaults: list-item bullets, 0 padding, `outline-style: auto`).

## GREEN (battery, from the PR)

vitest **191 files / 2127 tests ALL PASSING**; tsc 0; eslint 0 errors /
283 warnings (ratchet holds); encoding PASS; aiLoopAudit 8/8;
routeIntegrity PASS; freeAccessAudit PASS; build clean; ISR PASS;
smoke **46/46** (41 existing + 5 new computed-style tests); bundle
`/stock/[symbol]` 171.4 kB — +0.2 kB is the directed primitive over the
re-locked 171.2 baseline (the re-lock `33e8315` is the tool-sanctioned
`--update-baseline` on a PASSING run, recording +1.96 kB of INHERITED
within-tolerance shared-chunk drift from #299/#300, disclosed in its
own commit); the 200 kB hard budget stays fatal. CI note: the first
attempt on the merged head bit the C8 cadence gate (#303 had landed
0.4 min earlier); honored — the re-run after the window opened went
5/5 green on the exact head. The Docker Hub 429s that flaked two
earlier attempts were fixed at the runner level by #303
(mirror.gcr.io pre-seed) — zero checks weakened.

## Production legs on the exact deployed SHA `aea75f6a` (raw committed here)

- `pre-merge-probe.txt` — the fail-first production posture: 12/13
  legs PASS on `12be644` with ONLY `uncertainty-breakdown` failing
  (the old conflated sentence still served pre-#302).
- `prod-legs-api.txt` — **13/13 PASS** on `aea75f6a`: deploy gate
  (`/api/version` == exact merge SHA); thesis positive 200;
  **uncertainty-breakdown** (total line + refusal lines in the pinned
  order, ≤ 10 lines, templates exact); prose fields present
  (summary / whyItMatters / whatChanged); determinism (composed fields
  identical across calls; only the clock fields advance); honest badges
  unchanged (`unknown/low/low/deterministic`); provenance
  `synthesisPath=deterministic` + 64-hex changeKey; refusals 400/400/400
  with safe messages; capability=insight honest 404 (zero AI spend
  pre-window); latency recorded; `/evidence-fixtures` 200.
- `prod-legs-presentation.txt` — the committed
  `test/smoke/a8-presentation.spec.ts` run against production:
  **5/5 PASS** — badges a real flex row (no default bullets), pill
  badges, surface hierarchy, prose fields visible under their labels
  with non-zero-height content; the stock panel + dashboard brief
  honest states class-styled (padding from the shared stylesheet);
  the drawer close button's DESIGNED `:focus-visible` (solid,
  ≥ 2 px) and close-detaches.
- `prod-breakdown.txt` — the live artifact's breakdown on `aea75f6a`:
  total line + "885 transition(s) were refused fail-closed by the
  materiality engine (non-comparable)." — A4's actual verdicts, no
  parsing, no invention.
- Visual positive controls: `prod-drawer-ready.png` (the repaired
  composition in the D2 drawer — the exact view the founder's audit
  screenshot condemned), `prod-brief-ready.png`, `prod-panel-ready.png`.

## Honest boundaries

- Not an A1 schema change, not a route change, not a cache change, not
  a materiality change (the breakdown COUNTS exclusions, it never
  promotes them), not a relabeling of deterministic output as
  model-generated, not a per-surface redesign (B1/C1/D2 fetch/state
  machines untouched).
- The unlock semantics are untouched: insight surfaces stay
  honest-missing until the A4 baseline window (~2026-11-03).
- Open isolated item: #267 health-semantics — untouched.
