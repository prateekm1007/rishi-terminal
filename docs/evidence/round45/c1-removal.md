# INT-C1 dashboard brief removal — round 45, third founder-ordered removal (2026-10-11)

## The founder order

After PR #325 removed the D3 dossier section and PR #329 removed the B1
stock-page panel, the founder looked at the live dashboard and issued a third
removal order, verbatim:

> remove the whole Rishi Intelligence segment

What the order removes was verified on `main` (`f7dd4db`) and on production
(`https://rishi-terminal.vercel.app`, deployed SHA `dba83dd26…`) before any
code moved: the stock page renders NO "Rishi Intelligence" string anymore
(D3 + B1 removals verified live — only the Rishi Council section remains),
but the dashboard still renders one standing section headed
**"Rishi Intelligence — <SYMBOL>"** — the C1 `DashboardBrief` mount inside
the `DashboardTail` (`<section data-dashboard-brief=...
data-dashboard-brief-subject=... aria-label="Rishi brief for today's pick">`
with the "Rishi Intelligence — <subject>" h2). It is the last standing
product segment titled "Rishi Intelligence". The order removes that segment.
Product surface only — the removal removes the mount and its now-dead
component, never the architecture.

## What was removed

| Item | Disposition |
|---|---|
| `components/dashboard/DashboardTail.tsx` — the `<DashboardBrief subject={stockOfDay.symbol} />` mount, its `INT-C1` comment block, and the import | removed (the Stock-of-the-Day section above it keeps its own `stockOfDay` uses — the removal removed one mount, not the tail) |
| `components/dashboard/DashboardBrief.tsx` (147 lines; sole importer was the removed mount — rule 17 dead-code deletion) | DELETED |
| `test/intelligenceDashboardBrief.test.ts` — the C1 component/mount pins (6) + the exact-surface scan | RETIRED with this order named (rule 23: retirement on removal, never silent deletion). The file's SURVIVING content moved rather than died: the exact-surface scan (shrunk), the Ask Rishi component contract (4 pins, moved verbatim a second time — their mount is the fixture route), and the INT-D3/INT-B1 absence describes (regression guards for the prior removals, moved verbatim) now live in `test/intelligenceScreenerDrawer.test.ts` — the surviving consumer's file |
| the exact-surface scan | SHRUNK from the two to the ONE remaining consumer {D2 drawer} — the pin updated, never the gate deleted; the scan's home moved with its file |
| `test/smoke/a8-presentation.spec.ts` — the dashboard-brief honest-state leg | RETIRED with this order named; the drawer + fixture legs carry the styling discipline on |
| `test/intelligenceEvidencePresentation.test.ts` — the brief entry in the surface loop and the brief line in the state-marker pin | removed with the subject; the surviving surface carries the pin |
| `test/smoke/b1-panel-removed.spec.ts`, `test/intelligenceNewsWiring.test.ts` | comment-accuracy updates only (the "two remaining surfaces" wording names the C1 brief; it is now the ONE) |

## What stays (substrate intact)

The chain, the ONE `/api/intelligence` (capability=thesis included — no
endpoint change), the cache, the A8 primitives, the fixture route (with its
Ask Rishi mount), and the **D2 badge/drawer** (screener) — the ONE remaining
declared product surface. The dashboard keeps every other section (the
positive controls that prove the page was not the thing removed: the
Stock-of-the-Day block, the TOP BUY SIGNALS section, the CRYPTO grid, the
RISHI WISDOM banner).

## Scope boundaries honored

- The **D2 drawer's** "Rishi intelligence" labels (`aria-label` on the
  drawer and the badge) and the **/lab page's** "Rishi Intelligence" tab
  label are SURVIVING non-segment surfaces (a user-opened drawer on the
  screener and a lab-page tab, neither a standing page segment) — not
  drive-by removals; if the founder wants those gone too, each is its own
  named order.
- No migration, no data change, no endpoint change.
- The dashboard wires NO client-side intelligence fetch anymore; the
  exact-surface scan pins the one remaining consumer mechanically.

## Fail-first in reverse (rule 21)

The absence pins were written FIRST and watched fail on the mounted tree,
then the removal landed, then they passed. Raw outputs in this directory:

- `red-c1-vitest.txt` — the new INT-C1 absence describe (file-absence,
  tail-source-absence) + the shrunk exact-surface scan, on the mounted
  tree: **3 failed / 23 passed, EXIT=1** (RED commit `3b9ebee`).
- `red-c1-dom.txt` — the new `test/smoke/dashboard-brief-removed.spec.ts`
  on the mounted-tree build (build EXIT=0): the spec fails exactly at the
  first absence pin (`section[data-dashboard-brief]` count 1 ≠ 0),
  **EXIT=1** — the pin genuinely bites pre-removal.
- **Disclosed RED-leg correction (rule 1):** the DOM spec's FIRST draft
  counted the brief section immediately after `page.goto("/")` and PASSED
  vacuously on the mounted tree (EXIT=0, raw probe retained in the session
  log) — the brief mounts client-side in the `ssr:false` DashboardTail
  chunk, so an early count races a not-yet-mounted section: the B-18 trap
  in reverse. A timed hydration probe (1 s intervals) established ground
  truth: at t+0 s all tail markers are 0; from t+1 s the tail's own TOP BUY
  SIGNALS section and the brief section (count 1, "Rishi Intelligence"
  heading 1, phase `unavailable` in the sandbox — no DB) appear in the SAME
  client commit. The corrected draft waits for the tail-owned TOP BUY
  SIGNALS marker FIRST (a same-commit settled-state gate) and only then
  evaluates the absence pins — and was watched FAIL (the `red-c1-dom.txt`
  above). The correction is recorded in the spec's header comment.
- `green-c1-vitest.txt` + `green-c1-battery.txt` — the full battery on the
  removal tree (appended below).
- `green-c1-dom.txt` — the same spec post-removal: **1 passed, EXIT=0**
  (896 ms). Disclosed (rule 1): the FIRST green-dom attempt exited 1 — a
  stale RED-phase server survived its kill and held port 3100
  (EADDRINUSE in the second server's log) while its `.next` had been
  swapped by the removal build, so the served chunk manifest was stale and
  hydration never mounted the tail (the failure was at the POSITIVE
  control, not an absence pin — the spec's shape made the diagnosis
  unambiguous). Server killed by PID, the removal build restarted clean,
  the re-run passed; the B1/D3 regression specs re-run on the same clean
  build: 2 passed.

## Environment disclosure (pre-existence, not a diff regression)

The sandbox has NO database env and broken upstream egress (Yahoo 401 /
NSE 403 in the server log): the brief always settles `unavailable` here
(never `ready`), and other network-dependent smoke legs may behave
differently than CI. The a8-presentation drawer leg's network behavior is
untouched by this diff; CI (real network + DB) re-runs the full battery on
this PR's head.

## Revert range

The removal is ONE commit (this record rides in it). Revert with:

```
git revert <THE_REMOVAL_COMMIT_SHA>
```

(the concrete SHA is pinned in the PR description's Rollback section at
open-time; the RED commit `3b9ebee` carries only test pins and needs no
revert). No other commit belongs to this item.

## Post-merge legs (to be appended)

- Merge + deploy proof (`/api/version` = the merge SHA).
- C6 live legs on the deployed site: zero `Rishi Intelligence` strings /
  `data-dashboard-brief` sections in the dashboard's SSR bytes AND the
  hydrated DOM; positive controls (TOP BUY SIGNALS / Stock-of-the-Day)
  render; `/api/intelligence?capability=thesis` still 200; the D2 badge
  still renders on /stocks; the fixture route still 200; hydrated
  screenshots in `screens/`.

## Post-merge legs (appended 2026-10-11 — the section pre-declared above)

- **Merged**: PR #331, head `8c3e037598de…` → merge commit
  `d824ed9c970ce5ede84e7f415848a965e759cfba`, merge-guard gates 0–6 PASS
  (branch current with `f7dd4db`; all five blocking checks success on the
  exact head; cadence 555.9 min since the last production-relevant merge —
  #329 at 19:08Z the prior day; Vercel quota 27 deployment events / 24 h,
  100/day budget). CI history on this PR: the first run failed ONE of 54
  smoke tests — the B1 spec's POSITIVE control (council visibility), a
  strict-mode violation (2 matched elements) on a route this diff does not
  touch; proven non-regression by the three-head comparison (`e0921a1`
  PASS / `dba83dd` FAIL / `34169f0` PASS on identical app code) and
  disclosed with the table on the PR thread before the job was re-run on
  the exact pinned head — the rerun passed, all six checks green, no code
  change, no rebase, SHA unchanged.
- **Deployed**: `/api/version` = `d824ed9c970c…` verified 04:33Z (poll leg
  5; four polls of the prior deploy `dba83dd26b39` before it).
- **Live (C6)** — raw output committed here
  (`c6-c1-live-probe-output.txt`, `c6-c1-hydrated-legs-output.txt`):
  - SSR (`/`, 66,569 B): `Rishi Intelligence` strings = 0,
    `data-dashboard-brief` = 0; positive controls in the flight payload
    (STOCK OF THE DAY = 1, TOP BUY SIGNALS = 1).
  - Substrate: `/api/intelligence?capability=thesis&subject=RELIANCE` →
    **200 ok:true** (wallMs 2173, endpoint unchanged);
    `capability=insight` → designed 404 (zero spend).
  - D2: `/stocks` carries **896** `data-intelligence-badge` openers (the
    ONE remaining declared surface, alive).
  - Fixture route: 200 (A8 + Ask Rishi mount alive).
  - Stock page regression control: council = 1, `Rishi Intelligence` = 0.
  - Hydrated (Playwright Chromium against production, exit 0):
    dashboard post-hydration `section[data-dashboard-brief]` = 0,
    "Rishi Intelligence" text = 0, capability=thesis calls = 0, TOP BUY
    SIGNALS visible; stock page council visible; D2 opener visible.
- **Screenshots** (this directory, `screens/`): `c1-removal-home.png`
  (dashboard, hydrated, no brief), `c1-removal-home-former-segment.png`
  (the exact area where the segment used to sit — Stock of the Day (ISEC)
  flowing toward Top Buy Signals with nothing between),
  `c1-removal-stock.png` (stock page, council intact),
  `c1-removal-stocks.png` (screener, D2 opener).
