# A1 fail-first evidence (Constitution rules 21/24) — test/smoke/ssr-content.spec.ts

## Pre-fix (origin/main @ c29dd81, `npm run build` then `next start`, unfixed build)

Command: `npx playwright test ssr-content`

```
  ✘  1 test/smoke/ssr-content.spec.ts:39:5 › stock page serves the content sections in the raw SSR HTML (84ms)
  ✘  2 test/smoke/ssr-content.spec.ts:44:5 › Y4 null-not-zero holds in the SSR HTML of a bank page (positive + negative control) (84ms)
    Error: raw HTML must contain "Pillar Breakdown"
    expect(received).toContain(expected) // indexOf
    > 40 |     expect(html, `raw HTML must contain "${section}"`).toContain(section);
    Error: expect(received).toContain(expected) // indexOf
  2 failed
EXIT: 1
```

The Y4 test also failed pre-fix because its positive control ("hidden for banks" —
the rendered isBank branch of MetricsPanel) is absent from the pre-fix HTML:
the whole panel was ssr:false. Exactly the vacuousness the auditor flagged.

## Post-fix (same spec, same commands, after the A1 change)

```
  ✓  1 test/smoke/ssr-content.spec.ts:41:5 › stock page serves the content sections in the raw SSR HTML (42ms)
  ✓  2 test/smoke/ssr-content.spec.ts:50:5 › Y4 null-not-zero holds in the SSR HTML of a bank page (positive + negative control) (15ms)
  2 passed (648ms)
```

## Intermediate measurement note (why dynamic() without ssr:false was rejected)

With `next/dynamic` WITHOUT ssr:false (loading: skeleton), a clean rebuild baked
the SKELETONS into the static HTML while the content stayed out:

```
metricsSkeleton(430px):        1   <- Suspense fallback baked
railSkeleton(600px):           1   <- Suspense fallback baked
scoreSkeleton(280px):          1   <- Suspense fallback baked
"Pillar Breakdown" (content):  0   <- content absent
```

Measured on this Next 16.2.4 / Turbopack build: a lazy boundary cannot put
content into a STATIC prerender. The content components therefore became
static imports (they ship JS and hydrate) — the only mechanism that puts
them in the first byte.
