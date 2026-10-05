# Round 16 — C3: bundle ratchet restored beside the 200 kB hard cap

Founder Round-16, C3 (verbatim): "Restore a ratchet baseline at the measured
values (158.7 / 161.7 / 168.9 kB, +2 kB tolerance) alongside the 200 kB hard
cap, so growth is caught early. Accept: a deliberate +10 kB regression on a
scratch branch fails CI."

Defect being fixed (founder Round-16 defect 3): "B4 deletes the bundle
ratchet baseline. The 200 kB hard cap leaves about 31 kB of headroom on the
stock page that can grow silently." Verified on main: B4's PR #166 removed
`bundle-budget-baseline.json` (git diff d0a6144..18503c0: "bundle-budget-baseline.json | 9 ---").

## What landed (fix/c3-bundle-ratchet)

1. `bundle-budget-baseline.json` restored at the B4-measured values, +2 kB
   tolerance (identical numbers to the founder's audit: 158.7 / 161.7 / 168.9).
2. `scripts/bundleBudget.ts` verdict strengthened: BEFORE this PR a present
   baseline silenced the hard cap (`regressed || (!baseline && overHardBudget)`),
   so the 200 kB budget was decoration while a baseline existed. AFTER:
   `regressed || overHardBudget` — ratchet and hard cap are fatal alongside
   each other, exactly the founder's wording.

## Proof 1 — the re-locked baseline matches the founder's measured values

```
$ npm run build  (exit 0)
$ npx tsx scripts/bundleBudget.ts --port=3213
-- bundleBudget (200 kB budgets - founder-confirmed in Round-15 B4; first-load = scripts a module-capable browser downloads, nomodule polyfills excluded) --
route                first-load   budget   ratchet   verdict
/                       158.7 kB    200 kB   158.7 kB   OK  (8 scripts)
/screener               161.7 kB    200 kB   161.7 kB   OK  (8 scripts)
/stock/[symbol]         168.9 kB    200 kB   168.9 kB   OK  (10 scripts)
Ratchet: fails on increase beyond +2 kB, and the 200 kB hard budget stays fatal alongside it (C3, founder Round 16).
```

## Proof 2 — the ratchet BITES (rule 24), local reproduction

Scratch branch `fix/c3-ratchet-bite` = this PR + a deliberate 18,252-byte
incompressible (xorshift-hex, runtime-opaque guard so tree-shaking cannot
drop it) module imported by the client `components/stock/MetricsPanel.tsx`:

```
$ npx tsx scripts/bundleBudget.ts --port=3213; echo "TRUE exit: $?"
/stock/[symbol]         179.2 kB    200 kB   168.9 kB   REGRESSION vs ratchet  (10 scripts)
TRUE exit: 1
```

168.9 -> 179.2 kB = +10.3 kB — the founder's "+10 kB regression" case, exit 1.
Two tree-shaking lessons from getting this reproducible (why the bite needed
a runtime-opaque guard): a pure unused call (`void fn()`) and a folded
constant side effect (`globalThis.x = STRING.length`) are both eliminated by
Turbopack — the first two attempts measured identical 168.9 kB. The guard
(`if (new Date().getUTCFullYear() < 0) console.log(STRING)`) cannot be
proven dead, so the string ships.
(CI-level proof: the same branch's PR runs the "Bundle budget" CI step and
MUST go red — captured and linked from the PR thread before this PR merges.)

## Risk

None to app behavior: the baseline is CI-side data; the script change only
widens when the gate fails (never passes a case it previously failed).
Paired guard (C9): the gate measures first-load scripts of the SSR HTML —
the same surface A1 pinned content into — so slimming to satisfy the
ratchet cannot trade away first-byte content (it is measured, not assumed).

## Rollback

`git revert` of this PR restores B4's no-baseline state (hard-cap-only gate).
