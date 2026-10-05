# E5 — fresh production AI reliability/latency battery (2026-10-05)

The audit's highest-value product measurement, run after deployment
closure. Baseline-first discipline: no prompt, validator, tool-budget,
provenance or grounding change was made before or during this run.

## Run conditions

- Artifact: `ai-battery-r16-fresh.json` (this directory, full raw rows).
- Bound to production across the run window 15:14-17:35 UTC; the chat
  path is untouched by the merges that landed inside the window
  (#182 payload slimming, #202 CI harness, #184 alerts — none touch
  `lib/ai/**` or `app/api/chat/**`), and the artifact's version field
  records `87deecf` (the last chunk's binding; earlier chunks ran
  against `5ca757f` — same chat code).
- Measurement mode: ANONYMOUS — the X7 challenge is live in production
  (deployed with migrations 023-026), so the battery solved the hashcash
  PoW in-loop exactly like the browser client (solve cost 11-129 ms
  native per solve, recorded per row as `powMs`, included in wallMs).
  Authenticated mode was measured first and is NOT usable today: the
  global token pool's unchallenged share is exhausted for the IST day
  (counter `chat:global:tok:2026-10-05` = 1,318,236 settled tokens of
  the 1.6M unchallenged limit; a fresh request reserves 288,576 —
  refused, 503, quota refunded). The X7 reserved slice worked exactly
  as designed: challenge-passers were admitted all day. This is the
  first battery to measure the REAL anonymous user experience.
- Effective sample: 55 of 70 (14 rows lost to burst-429 — the challenge
  doubles requests per question and the per-IP 12/60s window trips
  under battery pacing; every lost row's attempt statuses are in the
  artifact). Pacing 18 s, backoffs 60 s.

## Headline numbers (vs the R15 runs of 2026-10-04)

| Metric | R15 baseline | R15 after | R16 fresh (this) |
|---|---|---|---|
| effective / n | 69/70 | 68/70 | 55/70 |
| firstPassGrounded | 10 (14.5%) | 4 (5.9%) | **6 (10.9%)** |
| eventual grounded | 17 (24.6%) | 22 (32.4%) | **17 (30.9%)** |
| repaired rows | — | 38 | 31 (56% of effective) |
| wall P50 / P95 | 9.8s / 24.4s* | 7.8s / 21.9s | 11.1s / 25.0s |

(*R15 baseline P95 field naming differed; the artifact is the record.)

Repair causes (R16 fresh, 31 repaired rows): unsupported-numeric-prose
11, malformed-json 7, field-value-mismatch 7, missing-claims 5,
provenance-wording 1. The distribution matches R15-after — the R15-L
canonical-values repair feedback (merged after the R15-after run) shows
in first-pass improvement (5.9% → 10.9%) but the DOMINANT class is
unchanged: numeric-prose compliance and JSON shape discipline in the
model loop, 18 of 31 repairs.

By class: financial 12/19 grounded (5 first-pass), toolRequest 3/6,
multitool 0/5, hostile 2/3, philosophy 0/10 (context-only mode — the
grounding validator cannot ground claim-free prose; reported as
measured, NOT reclassified, per the audit's do-not-touch list),
invalid 0/8 (correct: no grounded claims from invalid inputs).

## Latency

wallP50 11.1s / wallP95 25.0s / avg 12.6s (includes the X7 challenge
round-trip and solve — the honest anonymous-user number). Stage
averages and provider attempts are in the artifact. 132 provider
attempts for 55 effective rows (2.4/row — the repair loop's cost).

## What this measures and what it does not

- It measures the deployed AI loop end to end: server persona/identity,
  evidence assembly, tool execution, structured output, repair,
  grounding verdicts, and the anonymous admission path including X7.
- It does NOT measure provider-failure injection (not injectable
  client-side; observed only — providerFailureRows 66 reflects the
  429-heavy request environment, not provider outages).
- The 14 burst-lost rows are a measurement-environment artifact of the
  doubled request rate, not a product defect; the next battery should
  pre-solve admission (or run authenticated against a fresh IST day)
  for a cleaner sample.

## Next scoped work (dominant failure class, per the audit's order)

1. numeric-prose compliance in the repair loop (11/31) — the model
   writes numeric claims the evidence does not carry; the fix belongs
   in the loop's feedback, NOT in grounding strictness (protected).
2. malformed-json discipline (7/31) — schema-adjacent output shape.
Both are model-loop work; grounding strictness, tool budget,
provenance rules and the server-generated verified surface remain
untouched (audit E5 protected list).
