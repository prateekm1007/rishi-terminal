# INT-D3 REMOVAL — the stock-page dossier section (round 45, 2026-10-10)

## Founder order (verbatim scope)

Remove the stock-page `Rishi Intelligence — <SYMBOL>` dossier section (the D3
mount with its badges, summary, why-it-matters, what-changed, evidence,
uncertainty, invalidators, investigations, and provenance line) from
`/stock/[symbol]`. Product-surface removal only. The substrate stays untouched:
chain, `/api/intelligence`, cache, A8 primitives, fixture route, B1 panel, C1
brief, and D2 drawer all remain working. Remove the mount, never the
architecture.

## What was removed (the single removal commit)

| Path | Change |
|---|---|
| `app/stock/[symbol]/page.tsx` | the `IntelligenceDossier` import, its INT-D3 comment block, and the `<IntelligenceDossier symbol={key} />` mount |
| `components/stock/IntelligenceDossier.tsx` | DELETED (142 lines) — dead product-surface code after the mount removal (rule 17); zero remaining importers |
| `test/intelligenceStockDossier.test.ts` | RETIRED with the founder order named (rule 23 permits retirement on removal, never silent deletion) — EXCEPT the four Ask Rishi component-contract pins, which target the SURVIVING component and moved VERBATIM to `test/intelligenceDashboardBrief.test.ts` |
| `test/smoke/dossier.spec.ts` | RETIRED with the founder order named — the B1 panel positive control continues in `test/smoke/a8-presentation.spec.ts` |
| `test/intelligenceDashboardBrief.test.ts` | the exact-surface scan SHRUNK to the three remaining consumers {B1 panel, C1 brief, D2 drawer} (the pin updated, never the gate deleted) + the NEW absence pins (file gone, page source clean, surviving neighbors intact) + the moved Ask Rishi contract pins |
| `test/smoke/dossier-removed.spec.ts` | NEW — the rendered-page absence spec (atomic positive controls: B1 panel settled + council visible; the section-skeleton absence pin) |
| `docs/INTELLIGENCE_ROADMAP.md` | INT-D3 row → REMOVED-per-founder-direction with the substrate-intact note |
| `docs/intelligence/stockDossier.md` | superseded banner (rule 30) — historical text preserved verbatim |
| this file + the two raw outputs | the round-dated removal record |

## Fail-first in reverse (rule 21) — raw evidence

Both runs on the SAME tree states, command + exit code pasted:

- **RED** (`red-d3-removal.txt`) — the absence pins written FIRST, run on the
  mounted tree BEFORE the removal:
  `npx vitest run test/intelligenceDashboardBrief.test.ts` → **exit 1,
  3 failed / 10 passed**: the file-absence pin failed (the component file
  existed), the page-source pin failed (the page still mounted it), and the
  shrunk exact-surface scan failed (it saw the fourth consumer,
  `components/stock/IntelligenceDossier.tsx`). The 10 passing include the
  moved Ask Rishi pins (the surviving component's contract) and the C1
  positive controls.
- **GREEN** (`green-d3-removal.txt`) — after the removal:
  `npx vitest run test/intelligenceDashboardBrief.test.ts` → **exit 0,
  13 passed / 13**: the absence pins pass, the shrunk scan sees EXACTLY
  {DashboardBrief, IntelligenceDrawer, IntelligencePanel}, the moved Ask
  Rishi pins pass verbatim.

The Playwright counterpart (`test/smoke/dossier-removed.spec.ts`) asserts the
same absence on the rendered page: the dossier component ALWAYS rendered its
`<section data-dossier-insight=... aria-label="Rishi stock dossier">`
skeleton (even in the pre-window honest-absent phase), so the DOM absence pin
genuinely bit pre-removal (1 section present) and only passes post-removal.
Positive controls FIRST per B-18: the B1 panel settles and the Rishi Council
renders unchanged.

## What stays (substrate-intact verification)

- The chain, `/api/intelligence` (capability=thesis AND the designed-404
  capability=insight), the insight cache, the A8 primitives
  (`lib/intelligence/evidence.ts` + `components/intelligence/`), the fixture
  route (`/evidence-fixtures` with its Ask Rishi mount), the B1 panel, the C1
  brief, the D2 drawer — no endpoint change, no data change, no migration.
- `components/stock/AskRishi.tsx` — its surviving consumer is the fixture
  route; its component contract pins moved, not deleted.
- `components/intelligence/ReadyComposition.tsx` — the three remaining
  consumers (Panel, Drawer, Brief) keep it alive.

## Sequencing (C8)

The removal PR lands in its own cadence window AFTER #323 (WP1, merged
14:28Z as `0761446b`) and #324 (RISHI-COUNT, merged 15:36Z as `eec450b3`)
cleared in order — one production-relevant merge per hour, green re-runs on
exact heads, merge-guard gates 0–6, `/api/version` proofs at every step.

## Revert range

The removal is ONE commit (this record rides in it). Revert with:

```
git revert <THE_REMOVAL_COMMIT_SHA>
```

(the concrete SHA is pinned in the PR description's Rollback section at open
time; no other commit belongs to this item).

## Live closure proof (C6) — raw probes

Pasted post-deploy in the PR description: the production stock page shows NO
dossier section with the surrounding sections unchanged (B1 panel, council);
`/api/intelligence?capability=thesis&subject=RELIANCE` returns 200 and the
capability=insight endpoint keeps its designed 404 (zero spend, endpoint
unchanged); the B1/C1/D2 surfaces still render; hydrated real-browser
screenshots.
