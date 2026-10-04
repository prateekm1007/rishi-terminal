# Y1 — Restore fast pages (Round 12)

Task: make `/` and `/stock/[symbol]` static/ISR again (`revalidate <= 60`),
quote peek at regeneration, read-only; measure page TTFB before/after.
Branch: `fix/y1-fast-pages` (from `origin/main` @ `9a3e682`).

## Defect being fixed (founder Round 12, defect 1)

X3 made every stock page and the home page `force-dynamic`: 916 pages moved
from static/ISR to a server render per request, and the "114 ms warm p95"
battery measured the single-symbol price API, not page response time. No
page TTFB evidence existed before or after.

## BEFORE (production, main @ 9a3e682, force-dynamic) — 2026-10-04T00:19Z

Command: `bash scripts/measureTtfb.sh https://rishi-terminal.vercel.app 4`
(10 routes x 4 passes, one `curl -s -o /dev/null -w '%{http_code} %{time_starttransfer}'`
per hit; raw lines in the PR).

```
cold (pass 1): n=10 p50=0.322s p95=0.358s max=0.358s
warm (pass 2): n=10 p50=0.322s p95=0.399s max=0.399s
warm (all passes 2+): n=30 p50=0.315s p95=0.356s max=0.399s
```

Every hit pays a server render (`cache-control: private, no-cache, no-store`,
`x-vercel-cache: MISS` on every response — captured 2026-10-04T00:19Z):

```
== headers: / ==
age: 0
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
x-vercel-cache: MISS
== headers: /stock/SBIN ==
age: 0
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
x-vercel-cache: MISS
```

Warm p95 0.356 s FAILS the founder's proposed <= 300 ms acceptance.

## Rule 24 — the new gates were proven to fail first

Gate 1: `test/y1.isrSegmentConfig.test.ts` (source pins) against main state:

```
 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

Gate 2: `npm run verify:isr` (post-build manifest check) against the main
state build (`/` absent from `prerender-manifest.json`):

```
ISR manifest gate: FAIL — / is absent from the prerender manifest (route is dynamic?)
```

Build route table on main @ 9a3e682 (both pages Dynamic):

```
┌ ƒ /
├ ƒ /stock/[symbol]
```

## The change

- `app/page.tsx`: `dynamic = 'force-dynamic'` -> `export const revalidate = 60`.
  Build phase fetches nothing (`initialPriceSnapshot` returns `{}` while
  `NEXT_PHASE` marks a build — CI has no database); every ISR regeneration
  re-reads the shared quote cache in ONE batch read (read-only, never a
  vendor fetch).
- `app/stock/[symbol]/page.tsx`: same segment swap, plus
  `generateStaticParams()` re-added (the 916-symbol universe pre-renders)
  and the X3 peek build-phase guarded
  (`isBuildPhase() ? null : await serveCachedQuote(key)`) so the peek runs
  at regeneration only. Read-only, never a vendor fetch (unchanged from X3).
- `lib/dashboardSnapshot.ts`: header comment updated to the Y1 contract.
- New gate wired into CI quality job: `npm run verify:isr` after the build.
- `scripts/measureTtfb.sh`: the reproducible TTFB panel (home + 9 canonical
  stock pages, nearest-rank p50/p95).
- `scripts/commitScopeAudit.mjs`: token regex extended with the Round-12
  `Y<n>` series (founder directive: commit prefix `fix(Y<n>)`); registry
  gains the Y1 allowlist.

## AFTER (this branch, local build) — route table + manifest gate

```
┌ ○ /                                 1m      1y
├ ● /stock/[symbol]                   1m      1y
✓ Generating static pages using 1 worker (1012/1012) in 11.2s
ISR manifest gate: PASS — / initialRevalidateSeconds=60s, /stock/[symbol] template present, 916 baked stock routes (cap 60s)
```

## AFTER (local gates)

```
npx vitest run test/y1.isrSegmentConfig.test.ts -> 5 passed (5)
npx tsc --noEmit                                 -> exit 0
npx eslint .                                     -> 0 errors, 304 warnings (baseline 305, no re-lock — Y6 locks 304)
npx vitest run                                   -> Test Files 115 passed (115), Tests 1144 passed (1144)
npm run bundle:budget                            -> ratchet PASS (no increase; 200 kB PROPOSED budgets still exceeded — that is Y6)
npm run validate:encoding                        -> pass
npm run validate:stocks                          -> all T12 gates passed
npm run score:parity                             -> 0 mismatches / 0 non-finite of 916
npx playwright test (RANKINGS_ENABLED=true)      -> 19 passed (45.5s)
```

## Post-deploy evidence (appended after merge)

See `y1-fast-pages-production.md` (written after the production deploy) for
the after-TTFB panel, live headers, and first-byte non-regression greps.
