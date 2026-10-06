# E5 — field-value-mismatch root-cause fix: live post-fix proof (Round 19, 2026-10-06)

Closes the live-verification half of PR #221 (the fail-first, implementation
and full-battery proof are in the PR description). Runs against deployed
production, not the local machine.

## Deployed chain (C6)

- Merged: #221 → merge commit `88c7a857290c7bcb9246677cd5249ecd07133ee3`
  on `origin/main` (guard-merged; cadence verdict: last production-relevant
  merge 79.5 min prior).
- Deployed: the Vercel Git integration did not fire for the merge (the B-22
  pattern — 17 min, no deployment event), so the sanctioned A3 protocol ran:
  one production deployment created via the API (`dpl_BkXTf4gsFVTht9jSFquwvwPmDGiM`,
  gitSource ref=main), polled to READY, and
  `curl https://rishi-terminal.vercel.app/api/version` →
  `88c7a857290c7bcb9246677cd5249ecd07133ee3` == `origin/main`. VERIFIED.
- Live: the 22-question FINANCIAL spot-check below, run against the deployed
  build on the authenticated path (measurement fixture, X7 skipped by design).

## Live spot-check — the battery's FINANCIAL class, post-fix

Tool: `scripts/e5-fvm-postfix-live.mjs` (the battery's 22 financial
questions, same summarization as battery rows; resumable, 6 s pacing).
Bound to `/api/version` = `88c7a85…`. 22/22 effective.

| metric | run B pre-fix (r18 battery, financial) | post-fix live |
|---|---|---|
| first-pass grounded | 9/22 (40.9%) | **16/22 (72.7%)** |
| eventual grounded | 16/22 (72.7%) | **20/22 (90.9%)** |
| field-value-mismatch repairs | 13 (7 permanent failures) | **2 (0 permanent — both recovered)** |
| wall P50 | 17.9 s | 19.5 s (unchanged regime) |

Remaining repair causes post-fix: field-value-mismatch 2 (recovered),
unsupported-numeric-prose 2, missing-claims 1, zero-tool-engagement 1.
The two residual FVM rows are the honest-rejection shape (the model's prose
states a different number than its own assertion — the validator working
correctly, per the r18 taxonomy's category 3).

Honest caveats (C1): 22 rows, single run, stochastic model output — the
rates are indicative, not a stable proportion; the deterministic guarantee
is the unit suite (`test/e5.fvmAttribution.test.ts`, fail-first in the PR).
Latency is unchanged by design (an attribution fix adds no work); the wall
regime matches run B.

## What this closes

- Founder R15 optimization order priority (1) — field-value-mismatch: the
  dominant class (14/31 repairs in the r18 full sample) is root-caused,
  fixed at the attribution layer, contract-taught, and live-verified.
- E5 quality now stands at: malformed-json 7 → 0-1, unsupported-numeric-prose
  11 → 2-4, field-value-mismatch 13 → 2 (recovered) on the financial class.
  The next residual classes by r18 counts: missing-claims (8) and
  unsupported-numeric-prose (4) — both model-output discipline issues for a
  future round, neither a validator defect.
