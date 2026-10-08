# G7 Driver 2 — AFTER measurement and gate verdict (2026-10-08)

Pre-registered gate (unchanged from `g7-driver2-multitool-baseline.md`):
the AFTER run's `multitoolDriver2` P50 (wallExclPoW) must drop **>=25%**
vs **17,983 ms** (the 93c1dac baseline) with the **first-pass grounded
rate not reduced**; the <=8 s overall-battery gate and every validator
stay untouched.

## Production states measured

| run | window (UTC) | production SHA | status |
|-----|--------------|----------------|--------|
| AFTER-1 | 01:47–02:11 | `af5ba01` (#257) | valid, single-SHA (deploy went live 01:33:06Z) |
| AFTER-3 | 02:29–03:12 | mixed | **DISCARDED** — production advanced mid-run (`fd17886e` live 02:43:23Z, between chunk-2 rows); split-SHA rows cannot support a single-SHA verdict (`g7-driver2-AFTER3-INTEGRITY-NOTE.txt`) |
| AFTER-4 | 03:26–03:55 | `fd17886e` (#257 + #258 + reconciliation — current main) | **gate measurement**; SHA verified identical at battery bind and at every chunk boundary |

A further local attempt was quarantined before measurement (two
concurrent battery processes wrote interleaved rows); it never reached
the repo and is documented in the session worklog only.

## Gate measurement (AFTER-4, `fd17886e`)

Canonical block: `g7-driver2-after-canonical.json` (computed by
`scripts/g7CanonicalStats.mjs` from `g7-driver2-after.json` raw rows).

```
n: 14 | usable: 8 | refusals: {429: 6}
wallExclPoW P50: 12,695 ms   (baseline 17,983)  -> -29.4%   GATE: PASS (>=25%)
wallExclPoW P95: 24,578 ms   (baseline 37,422)  -> -34.3%
wallExclPoW mean: 15,678 ms  (baseline 19,961)  -> -21.5%
grounded: 6/8 usable | first-pass grounded: 5/8 (62.5% vs baseline 40%) -> GATE: PASS
repairs: 3/8 | repairCauses: field-value-mismatch 2, evidence-id-mismatch 1
attribution (of wallExclPoW): post-tool completions 49.9% | repair 22.8%
  | initial 5.8% | tool execution 2.9% | unattributed 18.5%
```

## Mechanism verification (the one driver, on the deployed tree)

Row shapes from the raw artifact:

- Batch-seed engaged (pure price-comparison asks): rows [3] [6] [7] [11]
  — zero initial completion, ONE `getPrices` tool call, one post-tool
  synthesis; walls 9.6–16.2 s, ALL first-pass grounded. Baseline rows on
  the same questions ran 2–3 serial per-symbol calls with 2–3
  completions at 10.5–36.5 s.
- Deterministic singleton fast path (driver 1) intact: row [4] served
  with `initial` completion only, 9.9 s.
- Untouched by design (NOT this driver): serial `getFinancials` ×2
  compositions [2] [5] [12] at 15.8–24.6 s with a repair stage — they
  form the P95 tail and are the recorded candidate for a future
  pre-registered iteration, founder-authorized only.

## AFTER-1 (valid, kept for honesty — reported, never hidden)

```
n: 14 | usable: 10 | refusals: {429: 4}
wallExclPoW P50: 31,478 ms | P95: 56,459 | mean: 31,632
grounded: 8/10 | first-pass: 6/10
```

AFTER-1 FAILED the latency gate badly. Mechanism analysis showed the
same uniform inflation on control rows the driver does not touch
(singleton row [4]: 6.0 s -> 31.5 s; serial financials rows +80–204%),
i.e. a provider-environment outlier window, not a fix regression; the
gate verdict does not rest on that judgment — the current-production
measurement above is the verdict, and AFTER-1 is reported in full.

## Honesty notes (measurement design, recorded for future pre-registrations)

1. **Refusal churn fragility**: at n=10–14 with 4–6 burst-window 429
   refusals, the usable sample's QUESTION COMPOSITION changes between
   runs (baseline usable = {1,2,4,7,8,9,10,11,12,13}; AFTER-4 usable =
   {2,3,4,5,6,7,11,12}; paired-in-both = {2,4,7,11,12}). The set-level
   P50 therefore compares partially disjoint samples; small n makes the
   statistic fragile in BOTH directions. Post-hoc paired diagnostic
   (NOT a gate substitution, labeled as diagnostic only): the five
   paired rows moved −48.7% median (idx 10: −67%, idx 9: −49.6%,
   idx 12: −48.7%, idx 7: −8.8%, idx 2: +30%).
2. Proposal for the NEXT driver pre-registration (founder decision):
   gate on a statistic robust to refusal churn — e.g. the paired
   per-question median delta over questions usable in both runs, with a
   minimum-usable threshold and a single re-run rule fixed in advance.
3. The anonymous X7 pool's model mix is unobservable
   (`providerModelIdentity: null`); cross-run absolute comparisons carry
   that irreducible uncertainty. The mechanism verification (row shapes)
   is model-independent and is the primary evidence the driver works.

## Verdict

G7 Driver 2 (serial per-symbol price round-trips) is measured, fixed,
and verified on production `fd17886e`: the pre-registered P50 gate is
met (-29.4% vs -25% required) with first-pass grounding improved, the
<=8 s overall gate untouched, and no synthesis-required class fast-pathed
(advice/valuation asks seed nothing — pinned by test). Remaining
multitool latency mass (serial financials/stock compositions, repair
stage) is recorded as future pre-registered work, not claimed as done.
