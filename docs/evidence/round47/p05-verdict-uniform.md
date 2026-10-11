# Round-47 P0-5 — the uniform verdict gate (founder order 2026-10-11)

**Item:** founder round-47 order 1 + 2: "Build one verdict gate. It
returns verdict or no-verdict from dataQuality, and every surface calls
it: /stocks, stock pages, dashboard, Council Today and /rishis cards.
Test: for every symbol, the list score is blank exactly when the detail
page shows no verdict, and no row with PE 0 or ROE 0 gets a score."

## What was already true (P0-1 + #337 + #338, verified not rebuilt)

The stock side renders from ONE gate: `verdictsAllowed(dq)` on
`getStockScore`'s `dataQuality`. `/stocks` (slimIndex), the stock page
(RishiScoreDual / RishiGrid / RishiCouncil under the same boolean),
and the dashboard ranked trio (rankings.ts) all null on seed records.

## What this PR adds

1. **The asset-side derivation** — `dataQualityFromAssetInputs`
   (lib/dataQuality.ts): the same closed vocabulary for crypto /
   commodity / forex / bond records. Reference indicators + live price
   overlay = mixed provenance = "seed" (the stock-side rollup rule).
2. **The asset-side gate** — `gateAssetVerdict` (lib/gurus/gate.ts):
   seed/missing quality withholds the verdict (score null, the honest
   category label, no comps). Wired into /api/gurus (crypto + commodity
   list and detail), the forex macro-rishi cards, and the bond rishi
   cards.
3. **A real fabricated-zero fix** — the commodity consensus hero's
   `avgScore` fell back to a neutral **0** when no scorer scored
   ("Rishi Consensus: 0/100"); it is null now (rule 16).
4. **The founder's acceptance, pinned end-to-end** —
   `test/verdictGate.uniform.test.ts`:
   - 896-symbol parity: the LIST score is blank exactly when the DETAIL
     page shows no verdict, through the real `getSlimIndex()` +
     `getStockScore()` paths (the list value IS the detail value);
   - the dashboard ranked trio renders the honest disabled state;
   - no row with PE 0 or ROE 0 gets a score — the dataset pin (the
     placeholder classes are null) plus the synthetic regression catch
     (a reintroduced typed zero scores nothing on any surface);
   - RELIANCE: seed quality, null consensus on both surfaces, no
     summary scores;
   - the asset gate: reference-indicator records are seed quality with
     or without a live price; the every-live path stays open (a future
     live indicator feed re-opens verdicts — pinned).

## Fail-first proof (rule 21)

RED on the mounted pre-fix tree — `red-p05-verdictuniform-vitest.txt`:
module `@/lib/gurus/gate` absent, EXIT=1.
GREEN on the fixed tree — `green-p05-verdictuniform-vitest.txt`:
10/10 passed, EXIT=0.

## Full Tier-2 battery (GREEN)

tsc 0 · vitest **2255/2255** · eslint 0 errors / ratchet 283 exact ·
validateStocks all gates · scoreParity 0/896 · encoding PASS · build
1019 pages · ISR manifest PASS (896 baked routes).

## Rule-23 re-pins (each names the founder order)

`test/gurusNullSemantics.test.ts` — the two crypto §14 pins read the
route's insight strings, which the gate now withholds (seed quality:
no verdict text renders at all). Re-pinned to assert the GATED wire
shape (score null, "No Verdict — Seed Data" label, no comps); the §14
scorer-input fallback path in the route is unchanged and the pins note
it renders again verbatim the day live indicators land.

## Rollback

`git revert` of the single commit; the gate is additive on the wire
shape (a `dataQuality` field plus null scores the clients already
render honestly — the T11 null-safe pattern).
