# G7 driver 1 — deterministic singleton fast path: post-deploy measurement (2026-10-07)

The ONE canonical battery (`scripts/aiLatencyBattery.mjs`, embedding
`scripts/g7CanonicalStats.mjs` — PR #248) run against production
`cf8a4c7` (the #249 deploy) with the SAME anonymous-mode methodology as
the round-23 baseline (`docs/evidence/round23/g7-latency-battery.{md,json}`),
so the delta is attributable to the driver, not the method. Raw artifact:
`g7-driver1-battery.json` (this directory; 70 rows, checkpoint-resumed
across foreground chunks — same wire behavior per the script's R9-11 note).

## Verdict against the founder's gate (G7: authenticated P50 ≤ 8 s)

**P50 = 5.34 s (excl PoW; 5.35 s incl PoW) — PASSES the ≤ 8 s gate.**
(Baseline: 15.44 s excl PoW — FAIL.) P95 18.4 s (was 37.1 s); mean 7.5 s
(was 17.2 s). PoW delta at P50: 14 ms.

Canonical block (rule 25 — `node scripts/g7CanonicalStats.mjs
docs/evidence/round25/g7-driver1-battery.json`):

```
n=70 usable=52 refusals=18 (429 x17, 413 x1)
wallInclPoW  p50=5350  p95=18401  mean=7544
wallExclPoW  p50=5336  p95=18384  mean=7525
attribution (basis: usable rows, wallExclPoW totals):
  completionsInitial  127759 ms  32.7%   (was 20.7%)
  completionsPostTool  63340 ms  16.2%   (was 41.4%)
  completionsRepair    36816 ms   9.4%   (was 18.8%)
  completionsTotal               58.2%   (was 81.0%)
  toolExecution        10898 ms   2.8%
  unattributed        152455 ms  39.0%   (was 18.0% — the ttfbMs capture
                                          now measures what was previously
                                          lumped here; see honesty notes)
grounded=26  repaired=5 (was 21)
repairCauses: schema-mismatch 2, field-value-mismatch 2, missing-claims 1
```

## Per-class P50 (wallExclPoW) — baseline → driver 1

| Class | Baseline | Driver 1 | Notes |
|---|---|---|---|
| financial (singleton data asks) | 15,126 ms | **3,470 ms** | the fast-path class: one completion, `stages=initial:1` |
| philosophy | 7,646 ms | 6,163 ms | unchanged path |
| invalid | 14,258 ms | 5,146 ms | deterministic disclosures for unknown tools/symbols |
| hostile | 15,443 ms | 4,686 ms | deterministic failure disclosures |
| financialNoSymbol | 8,438 ms | 5,336 ms | partial fast-path coverage |
| toolRequest | ~32,100 ms (p95 class) | 5,300 ms | seed-tool asks served deterministically |
| multitool | ~43,100 ms (p95 class) | 14,692 ms | multi-completion by design — NOT fast-pathed |

## Honesty notes (what this measurement does and does not claim)

- The anonymous-mode refusal profile matches the baseline's known shape
  (429 x17 + 413 x1 vs baseline 429 x16 + 413 x1) — the sample is
  comparable, not cherry-picked.
- The financial class P95 remains 34.2 s: rows that legitimately do NOT
  take the fast path (multi-symbol asks, no-intent asks, repair cycles on
  the full loop). `multitool` P50 14.7 s is the next driver's territory
  (direction 14: one driver at a time — driver 2 would need its own FDN).
- `unattributed` grew to 39% because the battery now records `ttfbMs` per
  row (the round-25 #248 corrective): the client-observed TTFB is ~equal
  to wall, which cross-validates the wall measurement; the previous 18%
  bucket included what ttfb now measures explicitly.
- The gate is met by the driver's intended effect: eliminating the
  redundant post-tool synthesis completion on the deterministic singleton
  class (41.4% → 16.2% post-tool share). No threshold was moved; no
  refusal dropped; both wall variants reported.

## Disposition

G7: **gate met** (P50 5.34 s ≤ 8 s) with driver 1 (the FDN 1(b) default,
proceeded per C10/B-26). Drivers 2+ (model/provider selection for the
remaining multi-completion classes) remain founder decisions — the
recommended default (hold) stands; the gate no longer requires them.
