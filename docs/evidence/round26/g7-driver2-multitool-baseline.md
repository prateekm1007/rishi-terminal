# G7 Driver 2 — the multitool/composition baseline (pre-fix, 2026-10-08)

Pre-registered per founder round-26 directions 8–10: a FIXED 14-question
multitool baseline set (`MULTITOOL_DRIVER2` in
`scripts/aiLatencyBattery.mjs`, committed with the fix PR — the six
round-25 questions verbatim + eight registry-verified additions) measured
through the ONE canonical battery + calculator against production BEFORE
the driver-2 fix was merged or deployed.

- Bind: `/api/version` = `93c1dac034c97921a4b53d2e55dae9a0bf571b1e`
  (recorded at 2026-10-07T23:54:05Z, at the run start; the driver-2 fix
  was NOT on main yet — this is the honest BEFORE state).
- Raw artifact: `g7-driver2-multitool-baseline.json` (canonical block
  embedded, computed by `scripts/g7CanonicalStats.mjs` from its own rows).

## Canonical result (class `multitoolDriver2`)

```
n: 14 | usable: 10 | refusals: {429: 4}
wallExclPoW P50: 17,983 ms | P95: 37,422 ms | mean: 19,961 ms
attribution (of wallExclPoW): post-tool completions 47.5% | repair 20.6%
  | initial 13% | tool execution 3.2% | unattributed 15.7%
grounded: 7/10 usable | repaired: 6/10 | first-pass grounded: 4/10
repairCauses: unsupported-numeric-prose 2, missing-claims 2,
  forecast-advice-wording 1, field-value-mismatch 1
toolStatusCounts: ok 18 | providerFailureRows: 13
```

Consistency check: the class P50 (17,983 ms) agrees with the round-25
multitool class P50 (17,892 ms, `g7-fastpath-corroboration.md`), measured
on the six-question set — the driver-2 baseline is comparable, not
cherry-picked.

## The measured driver (one driver only)

Per-row serial signature: five usable rows executed TWO tool calls and
one executed THREE (`getPrices ×N` / `getFinancials ×N`), each extra
tool request costing one full provider completion (post-tool completions
= 47.5% of the wall; tool EXECUTION is 3.2%). Repairs add 20.6% — a
different sub-driver (E5's first-pass teaching), NOT optimized here.

## Honesty notes

- 429 ×4 final rows: the identity's burst/challenge reality (documented
  X7-era shape, round-25 corroboration); they are honest refusals, never
  dropped.
- The single-symbol row [4] ("Show SBIN's price and its promoter
  holding.") served through the driver-1 deterministic singleton fast
  path (one completion, 5,978 ms, grounded) — correct per its gate.
- Rows [7]/[8]: the model grounded after ONE tool call on a two-symbol
  ask (its own under-answer); the artifact records what the wire saw.
- Driver-2 gate (pre-registered, unchanged): the AFTER run's
  `multitoolDriver2` P50 (excl PoW) must drop ≥25% vs 17,983 ms with the
  first-pass grounded rate not reduced; the ≤8 s overall-battery gate and
  every validator stay untouched.
