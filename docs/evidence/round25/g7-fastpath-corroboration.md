# G7 driver 1 — corroboration run: the canonical battery PASSES the ≤8 s gate (2026-10-07)

Second independent post-deploy run of the ONE canonical battery
(`scripts/aiLatencyBattery.mjs` embedding `scripts/g7CanonicalStats.mjs`,
PR #248) against the deterministic singleton fast path (#249, merged
`cf8a4c7`, live-verified). Raw artifact: `g7-fastpath-after.json` (70
rows, checkpoint-resumed across foreground chunks). The first
post-deploy measurement is `g7-driver1-fastpath.md` (+ its artifact,
merged via #254); this run corroborates it independently and adds one
honesty note the first run did not have.

## Verdict against the founder's gate (G7: P50 ≤ 8 s)

**P50 = 6,378 ms excl PoW (6,379 ms incl PoW) — PASSES the ≤ 8 s gate.**
Baseline: 15,443 ms excl PoW — FAIL. Reduction: 58.7%. P95 32,930 ms
(baseline 37,083); mean 12,325 ms.

Raw canonical block (rule 25 — the battery's embedded `canonical` block,
verbatim from the artifact):

```
usable: 51 / 70 | refusals: {'413': 1, '429': 18}
P50 excl PoW: 6378 ms | P95: 32930 ms | gate: <=8000 ms
P50 incl PoW: 6379 ms
completions 60.8 % (init 30 / post-tool 19.9 / repair 10.9) unattributed 37.4 %
financial: usable=16/22 p50=4615ms
philosophy: usable=8/11 p50=6529ms
invalid: usable=8/11 p50=4372ms
hostile: usable=5/8 p50=8080ms
financialNoSymbol: usable=5/6 p50=7250ms
toolRequest: usable=5/6 p50=32930ms
multitool: usable=4/6 p50=17892ms
repairCauses: missing-claims 1, schema-mismatch 2, unsupported-numeric-prose 1,
              provenance-wording 1, malformed-json 1, field-value-mismatch 1
toolStatusCounts: ok 31, unknown-symbol 8
```

Before → after (canonical, excl PoW): **P50 15,443 → 6,378 ms; completions
81.0% → 60.8% of wall (post-tool 41.4% → 19.9%, repair 18.8% → 10.9%);**
the singleton classes collapsed: financial 15,126 → 4,615 ms, invalid
14,258 → 4,372 ms. Repairs across the whole battery: 21 → 7 (first-pass
grounded rate up accordingly). The refusal profile matches the baseline's
known shape (429 ×18 + 413 ×1 vs baseline 429 ×16 + 413 ×1 — the X7
challenge doubles per-row requests exactly as documented in round 23; the
sample is comparable, not cherry-picked).

## Production smoke (C6 live proof, 19:18 UTC, `cf8a4c7`)

`POST /api/chat` "What is the latest price of INFY?" (anonymous, X7
challenge solved in-loop — never bypassed): HTTP 200, `synthesis:
"deterministic"`, `grounded: true`, ONE completion (`stages=initial:1`,
992 ms), loop wall 2,535 ms, server-generated verified surface
`price = 992 inr — live (observed/as-of 2026-10-07T09:44:59.000Z) /
change = -2.155 percent — live (...)`. The guard paths were also observed
live during the run: an unavailable-symbol row took the post-tool path
(no facts → no fast path → honest missing-claims repair → disclosed
state), and multitool rows stayed multi-completion (17.9–22.8 s).

## Honesty notes

- **Mid-run production advance**: the run bound to `cf8a4c7` at start
  (19:18 UTC) and the final rows executed after production advanced to
  `8da83ce` (#253 PA2 temporal memory + #254 docs, deployed ~20:56 UTC).
  That delta touches `lib/intelligence/stateLog.ts`,
  `lib/db/migrations/030_*`, `lib/quoteCache.ts` (+37 lines) and docs —
  it does NOT touch the chat loop path (`app/api/chat/route.ts`,
  `lib/ai/*`), so the loop under measurement is unchanged across the two
  builds. Recorded here rather than hidden.
- Class-level variance between this run and the #254 run is model-behavior
  variance (agnes-2.5-flash non-determinism on small class samples): e.g.
  this run's `toolRequest` P50 is 32.9 s (three rows exercised the full
  loop with repairs — non-seeded terms like "key metrics" have no
  deterministic seed, by design) while the #254 run's was 5.3 s. Both runs
  PASS the gate on the overall P50; the class tables in both artifacts are
  the honest record.
- The gate's P50 reading now sits on the philosophy/financialNoSymbol/
  hostile classes (6.5–8.1 s). The next drivers (per direction 10's list,
  one at a time with their own baselines) target the remaining heavy
  classes: multitool composition (14.7–22.8 s), non-seeded toolRequest
  rows, and the 37–39% unattributed/TTFB share.
- Measurement method is IDENTICAL to the baseline (same 70-question
  distribution, same 6 s pacing + 60 s backoffs, same percentile code,
  same canonical calculator). Nothing was weakened; the ≤8 s threshold was
  fixed before the baseline existed and is unchanged.
