# INT-B1 stock-page surface removal — round 45, second founder-ordered removal (2026-10-10)

## The founder order

After PR #325 removed the D3 dossier section, the founder looked at the live
stock page and issued a second removal order, verbatim:

> it s still there remove it

What was "still there" was verified on production before any code moved
(`https://rishi-terminal.vercel.app/stock/RELIANCE`, deployed SHA
`0e200a1e…`): the D3 dossier markers were gone (`data-dossier-insight` = 0,
`aria-label="Rishi stock dossier"` = 0), but the page still rendered one
section headed **"Rishi Intelligence"** — the B1 `IntelligencePanel` mount
(`<section class="stock-intelligence-panel" data-intelligence-panel=...
aria-label="Rishi intelligence"><h2>Rishi Intelligence</h2>…`), the D3
dossier's surviving neighbor. The order removes that surface. Product surface
only — the removal removes the mount and its now-dead component, never the
architecture.

## What was removed

| Item | Disposition |
|---|---|
| `app/stock/[symbol]/page.tsx` — the `<IntelligencePanel key={key} subject={key} />` mount, its `INT-B1` comment block, and the import | removed |
| `components/stock/IntelligencePanel.tsx` (119 lines; sole importer was the removed mount — rule 17 dead-code deletion) | DELETED |
| `test/intelligenceNewsWiring.test.ts` — the five INT-B1 panel pins (component contract + the mount positive control) | RETIRED with this order named (rule 23: retirement on removal, never silent deletion); the file's news-evidence substrate pins (items 1–4) and the two route deps-pass pins are untouched |
| `test/smoke/a8-presentation.spec.ts` — the stock-page panel honest-state leg | RETIRED with this order named; the brief/drawer/fixture legs carry the styling discipline on |
| `test/intelligenceEvidencePresentation.test.ts` — the panel entries in the surface loop and the state-marker pins | removed with the subject; surviving surfaces carry the pin |
| the exact-surface scan (`test/intelligenceDashboardBrief.test.ts`) | SHRUNK from the three to the TWO remaining consumers {C1 brief, D2 drawer} — the pin updated, never the gate deleted |
| `test/smoke/dossier-removed.spec.ts` — the B1-panel positive control | the council control carries it now (the panel joined the removal) |

## What stays (substrate intact)

The news-evidence substrate (`lib/intelligence/newsMatch.ts`, the deps pass
`lib/intelligence/newsEvidence.ts` feeding the chain — production-proven in
the B1 CLOSED record), the chain, the ONE `/api/intelligence`
(capability=thesis included — no endpoint change), the cache, the A8
primitives, the fixture route (with its Ask Rishi mount), the **C1 brief**
(dashboard) and the **D2 badge/drawer** (screener) — the two remaining
declared product surfaces. The stock page keeps its council, commentary and
peers sections (the positive controls that prove the page was not the thing
removed).

## Fail-first in reverse (rule 21)

The absence pins were written FIRST and watched fail on the mounted tree,
then the removal landed, then they passed. Raw outputs in this directory:

- `red-b1-vitest.txt` — the new INT-B1 absence describe (file-absence,
  page-source-absence) + the shrunk exact-surface scan, on the mounted tree:
  **3 failed / 12 passed, EXIT=1**.
- `red-b1-dom.txt` — the new `test/smoke/b1-panel-removed.spec.ts` on the
  mounted-tree build (build EXIT=0, panel skeleton present in the SSR
  bytes): the spec fails exactly at the first absence pin
  (`section[data-intelligence-panel]` count 1 ≠ 0), **EXIT=1** — the pin
  genuinely bites pre-removal.
- `green-b1-dom.txt` — the same spec post-removal: **2 passed, EXIT=0**
  (B1 absence + the D3 regression spec on the rebuilt page).
- `green-b1-vitest.txt` + `green-b1-battery.txt` — the full battery on the
  removal tree: tsc 0; eslint 0 errors / 283 warnings = baseline 283 EXACT;
  vitest **198 files / 2201 tests** PASS (2204 − 5 retired panel pins + 2
  new absence pins); encoding / validateStocks / scoreParity /
  aiLoopAudit / routeAudit all exit 0; build 0; ISR PASS; bundle
  `/stock/[symbol]` **169.6 kB** vs the 171.2 kB ratchet (the panel chunk
  off the page); `.env` check shows only `.env.example`.
- Environment disclosure (pre-existence proven, not a diff regression): the
  a8-presentation **dashboard-brief** leg fails in this sandbox (19.4 s
  settled-state poll) because upstream egress is broken here (Yahoo 401 /
  NSE 403 / ETIMEDOUT in the webServer log) and `/` SSR stalls past the
  poll. The SAME leg fails on the CLEAN base tree (`origin/main` = `3b63a11`,
  stash-verified run: BASE_EXIT=1). The leg is untouched by this diff; CI
  (real network) passed it 5/5 on the #325 merge run and re-runs the full
  battery on this PR's head.

## Scope boundaries honored

- The C1 brief's own "Rishi Intelligence — {subject}" heading on the
  dashboard and the D2 badge/drawer "Rishi intelligence" labels are
  SURVIVING declared surfaces (the round-45 order kept them; no new order
  touches them) — not drive-by removals.
- No migration, no data change, no endpoint change.
- The stock page renders no client-side intelligence fetch anymore; the
  exact-surface scan pins the two remaining consumers mechanically.

## Revert range

The removal is ONE commit (this record rides in it). Revert with:

```
git revert <THE_REMOVAL_COMMIT_SHA>
```

(the concrete SHA is pinned in the PR description's Rollback section at
open-time; no other commit belongs to this item).

## Post-merge legs (to be appended)

- Merge + deploy proof (`/api/version` = the merge SHA).
- C6 live legs on the deployed site: zero `Rishi Intelligence` strings /
  `data-intelligence-panel` sections in the SSR bytes; positive controls
  (council, commentary, peers) render; `/api/intelligence?capability=thesis`
  still 200; C1 brief + D2 badge still render on their own pages; hydrated
  screenshots.

## Post-merge legs (appended 2026-10-10 — the section pre-declared above)

- **Merged**: PR #329, head `fc3ffffa26ff…` → merge commit `dba83dd26b393b406c4435d1a79c64e3bcadf01d`, merge-guard gates 0–6 PASS (all five blocking checks success on the exact head; cadence 69.9 min after #326 PRICING-CLAIM, which had merged mid-flight and moved this branch's earliest safe merge — the stale-base refusal + rebase onto `e0921a1c` + full battery re-run on the rebased head are recorded in the PR body). CI history on this PR: three cadence bites honored (55.7 min, 58.8 min — reruns fired early; 18:08Z attempt before the moved window) before the in-window run went five-green. Raw RED/GREEN committed above; the PR thread carries the Appendix C template, the novelty row, and the C6 comment.
- **Deployed**: `/api/version` = `dba83dd26b39…` verified 19:12:20Z.
- **Live (C6)** — raw output in the PR thread (session-local `scripts/round45/c6-b1-live-probe-output.txt` + `c6-b1-hydrated-legs-output.txt`):
  - SSR: `Rishi Intelligence` strings = 0, `data-intelligence-panel` = 0, `aria-label="Rishi intelligence"` = 0 on `/stock/RELIANCE` (deployed bytes, 184,739 B).
  - Positive controls: council present; `/api/intelligence?capability=thesis&subject=RELIANCE` → 200 ok:true; `/stocks` openers = 896; dashboard served.
  - Hydrated (Playwright Chromium, exit 0): stock page ZERO panel sections + ZERO "Rishi Intelligence" headings post-hydration; council visible; C1 brief settles `phase=ready` on `/`; D2 opener visible on `/stocks`.
  - Substrate: `/evidence-fixtures` 200 (A8 + Ask Rishi mount alive); `capability=insight` → designed 404 (zero spend, endpoint unchanged).
  - Correction disclosed (rule 1): the probe's leg 5b byte heuristic was an invented threshold and wrong by construction (the A1 B-24 slim + the ssr:false tail chunk make SSR bytes the wrong instrument for the brief) — replaced by the hydrated leg B1; the probe's honest exit code (1, on that heuristic leg) is quoted in the PR thread alongside the correcting run.
- **Screenshots** (this directory, `screens/`): `b1-removal-stock.png` (stock page, no Rishi Intelligence section, council visible), `b1-removal-home.png` (dashboard brief ready), `b1-removal-stocks.png` (D2 opener).
