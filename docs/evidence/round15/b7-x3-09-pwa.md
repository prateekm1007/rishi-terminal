# B7 / X3-09 — PWA (Round 15)

Evidence for the X3-09 PR (founder Round-15 B7). Roadmap acceptance,
verbatim: "manifest served and valid, service worker registers, offline
navigation shows the offline page, API responses are not cached by the
worker."

## 1. What shipped

- `app/manifest.ts` — the Next metadata-route manifest (served at
  /manifest.webmanifest): standalone display, app navy #0A0F1C, gold
  branding, `id: '/'`.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` —
  rendered as exact-size Playwright screenshots of a vector source (gold
  serif R on navy, thin ring; maskable keeps the glyph in the safe zone).
  The existing `apple-touch-icon.png` (a generic white triangle on black
  — a placeholder) is left untouched; the PWA set is on-brand.
- `public/sw.js` — the app-shell service worker: precaches ONLY /offline
  at install; cache-first for immutable static assets; network-first
  (`cache: 'no-store'`) for navigations with the offline page as the
  fallback; **`/api/**` is never intercepted and never cached** (a cached
  price or score would be a provenance violation — Constitution 3/4).
- `app/offline/page.tsx` — the prerendered offline page (no market
  claims; says data is never served from a stale cache).
- `components/shared/ServiceWorkerRegister.tsx` mounted in the root
  layout — production builds only (`next dev`'s on-demand compilation
  must not be cached).

## 2. Fail-first (rules 21/24) — the spec on the PRE-PWA build

`npx playwright test pwa` against a build without the PWA files:

```text
  4 failed
    test/smoke/pwa.spec.ts:14:7 › X3-09 PWA › manifest is served and valid
    test/smoke/pwa.spec.ts:43:7 › X3-09 PWA › service worker registers and controls the page
    test/smoke/pwa.spec.ts:57:7 › X3-09 PWA › offline navigation shows the offline page
    test/smoke/pwa.spec.ts:83:7 › X3-09 PWA › API responses are never cached by the worker
```

## 3. Post-fix — the full smoke suite (29 pre-existing + 4 new)

```text
$ npx playwright test --reporter=line   (webServer with RANKINGS_ENABLED=true, as CI runs it)
  33 passed (1.3m)
```

The four PWA assertions, from the passing run: /manifest.webmanifest
200 with valid name/icons (each icon URL fetchable, one ≥192px PNG); the
worker activates at /sw.js and controls the page; offline navigation
serves the precached offline page ("You are offline") while an offline
`fetch('/api/health')` FAILS; and after real API traffic, `caches.keys()`
inspection shows **zero /api/ URLs in any cache** — the worker's cache
holds only /offline + static chunks (verified directly: the cache
listing contained exactly `["/offline", …static chunks…]`).

## 4. Two defects found and fixed while proving the acceptance

1. **Browser HTTP cache satisfied offline navigations**: the first SW
   version used a plain `fetch(request)` for navigations — while
   "offline", Chromium served the just-visited homepage from its HTTP
   cache (status 200, homepage DOM) instead of the offline page. Fixed
   with `cache: 'no-store'` on the SW's navigation fetch: network-first
   means really asking the network; offline users get the honest offline
   screen, never a heuristically-stale page.
2. **A stashed layout edit**: a `git stash -- app components …` during
   the fail-first setup captured the layout.tsx modification (tracked
   file) while leaving the new files untracked — the first "with-PWA"
   build silently lacked the SW registration (no chunk contained
   `sw.js`). Diagnosed via `grep -rl sw.js .next/static/chunks` (empty),
   restored via `git stash pop`, rebuilt. Recorded as a session lesson:
   verify the registration marker in the built output, not just the
   source tree.

## 5. Gates

```text
$ npx tsc --noEmit            -> exit 0
$ npx eslint app/manifest.ts app/offline/page.tsx components/shared/ServiceWorkerRegister.tsx app/layout.tsx test/smoke/pwa.spec.ts
                               -> 0 problems
```
