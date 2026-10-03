# X1 evidence — deployment budget (Round 11, item 1)

Date: 2026-10-03 (UTC) · Task: X1 · PR: #112 (`fix/x1-deploy-budget`) ·
Merged as `b6049ebaa333a2f274e4c19f18d4bc3c2f80e488`.

## Pre-fix state (verified, raw)

- Production served `751d5b6507184244648f5a16fe1b508e5e658775`; `main` was
  `66f5835` (evidence-only ahead); the `66f5835` production deploy was
  rejected by the Hobby-plan deployment rate limit while the staging
  mirror consumed the slot:

```
$ curl -s .../commits/66f5835.../status
state: failure
  Vercel – rishi-terminal: failure 'Deployment rate limited — retry in 24 hours.'
  Vercel – rishi-terminal-staging: success 'Deployment has completed'
```

- Deployment list (v6 API) at the time: staging had deployed `66f5835` to
  its production target at 14:37:20Z (`dpl_4ZXgcx4wZm`), i.e. the quota-only
  mirror took the slot the production project needed.

## What X1 shipped

1. `vercel.json` `ignoreCommand` → `scripts/ci/vercel-ignore.sh`:
   docs-only changesets (`docs/**`, `*.md`, `scripts/ci/**`) skip
   deployment; anything else builds; fail-safe direction is build.
2. Staging suspension, repo-side: every deployment whose
   `VERCEL_PROJECT_NAME`/`VERCEL_PROJECT_ID` is the staging project is
   skipped. (The Vercel setting `gitProviderOptions.createDeployments:
   "disabled"` was verified NOT to stop deployments — staging built
   preview `dpl_7S2Gob3Pyy` for the first X1 push after that setting was
   already in place.)
3. `docs/RELEASE.md` "Deployment budget" policy (limits, batching,
   founder decision point).
4. Unit gate `test/vercelIgnore.test.ts` (13 tests, both directions) +
   `scripts/commitScopeAudit.mjs` accepts the Round-11 `X<n>` tokens.

## Post-merge verification (raw)

- Merge `b6049eba` → GitHub integration deployed production:

```
rishi-terminal (production): dpl_4moniPLt1LMfDfSGn2TQvJ3rALbs
                            READY · production · main · b6049ebaa333 (19:45:00Z → ~19:50Z)
rishi-terminal-staging:     dpl_9T5mgTGqQCzHJ6fkNhkgantwtRko
                            CANCELED by Ignored Build Step (main · b6049ebaa333)
```

- Identity chain (three-way):

```
$ git rev-parse origin/main
b6049ebaa333a2f274e4c19f18d4bc3c2f80e488

$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"b6049ebaa333a2f274e4c19f18d4bc3c2f80e488","now":"2026-10-03T19:48:16.845Z","node":"v24.21.0"}

$ curl -s .../commits/b6049eba.../status
state: success
  Vercel – rishi-terminal: success 'Deployment has completed'
  Vercel – rishi-terminal-staging: success 'Canceled by Ignored Build Step'
```

- Staging skip observed across the whole round: after the skip landed,
  the staging project created NO new deployment for branch pushes
  (`b0de3ab`, `00f7836`, `a77e0bc`) nor for the `main` merge (`b6049eba`,
  canceled by the ignored build step). Its last built deployment remains
  `dpl_7S2Gob3Pyy` (the pre-fix push `eaa0584`).

## Quota events consumed by this round (visible deployments)

19:29:59Z prod preview eaa0584 · 19:30:01Z staging preview eaa0584
(pre-skip) · 19:33:51Z prod preview b0de3ab · 19:34:19Z prod preview
00f7836 · 19:43:31Z prod preview a77e0bc (X2 branch) · 19:44:42Z prod
preview f44b78a (parallel X2 branch) · 19:45:00Z prod production
b6049eba (+1 staging event, canceled). Staging events after the skip are
creation-only (canceled before build); the counter may still count them —
unknown, flagged in RELEASE.md as a monitoring point.

## Residuals (honest)

- Whether CANCELED (ignored-build-step) deployments still count against
  the 100/day counter is not observable from the API; watch the next 402.
- Production-project per-PR previews still consume quota for CODE PRs
  (intentional — review surface; auditor sanctioned disabling only the
  staging project's).
- `FOUNDER DECISION NEEDED`: upgrade the Vercel plan vs. batching
  (RELEASE.md, Deployment budget #5).
