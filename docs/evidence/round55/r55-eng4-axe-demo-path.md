# Round 55 — ENG-4: the a11y gate on the demo-path states (axe-core)

Founder order (13 Oct 2026, verbatim): `dequelabs/axe-core + abhinaba-ghosh/axe-playwright (MPL-2.0 + MIT) — Accessibility gate on the demo path (ENG-4) — Don't modify axe's own files`.

## What was built

`test/demo/a11y-demo-path.spec.ts` — axe scans the demo-path STATES that the round-14 static gate (E6-08, `test/smoke/a11y-wcag.spec.ts`) never renders:

1. `/` with the search-results dropdown OPEN
2. `/stock/RELIANCE` with the wisdom tab OPEN (the honest no-verdict record)
3. `/lab?tab=watchlist` with an added row
4. the rule-24 bite leg: injects a 1.9:1-contrast node and asserts the same scan REPORTS it — permanent, in-CI proof the gate discriminates

Licence verification: dequelabs/axe-core MPL-2.0, abhinaba-ghosh/axe-playwright MIT (GitHub API, `r55-batch2-adoption-record.md`); `@axe-core/playwright` ^4.13.0 was already the in-tree dependency (axe-core arrives transitively; its files are untouched — the founder's condition).

## RED — the gate's first run caught TWO real critical violations

`npx playwright test test/demo/a11y-demo-path.spec.ts` on the pre-fix tree (exit 1):

```
axe found 2 violation kinds on /lab?tab=watchlist (watchlist row added):
    label [critical] x1 — Form elements must have labels
      e.g. input (min="1" max="10" type="range" value="5")
    select-name [critical] x1 — Select element must have an accessible name
      e.g. select
1 failed, 3 passed
```

Both defects live on the watchlist tab — a state no prior gate scanned (the static gate scans `/lab` at its default tab, which renders no symbol input, sort select, or conviction sliders — DEMO-6 documented exactly this: "a bare /lab shows no symbol input"). This is the finding ENG-4 exists to produce.

## The fixes (root cause, rule 15 — components/lab/WatchlistTab.tsx)

1. the sort `<select>`: the visible "SORT" text becomes a real `<label htmlFor="watchlist-sort">` — same words, now programmatically associated
2. the conviction range input: `aria-label="CONVICTION"` (the column's own header word; row context comes from the table semantics)

## GREEN — after the fixes

```
✓ axe: search results dropdown OPEN
✓ axe: wisdom tab OPEN — the honest no-verdict record
✓ axe: watchlist with an added row
✓ axe: the gate BITES — an injected contrast violation is reported on this build (rule 24)
4 passed (38.0s)
```

## Known-unscanned surfaces (honest scope note, rule 26)

`/lab`'s compare and holdings tabs carry inputs whose labels were NOT audited by this pass (they are not demo-path states; CompareTab has its own symbol inputs). Adding those legs is a follow-up, not part of the demo path.
