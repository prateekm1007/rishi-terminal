# Production deploy blocker + closure runbook (2026-10-02)

## The blocker (measured, not guessed)

The Vercel account exhausted its free-tier deployment quota:

```
POST /v13/deployments → 402 payment_required
"Resource is limited - try again in 24 hours (more than 100,
 code: api-deployments-free-per-day)"
limit: { total: 100, remaining: 0, reset: 1791014427730 }
```

`reset: 1791014427730` ms = **2026-10-03T06:40:27.730Z**.

Consequences observed and verified:

- The last PRODUCTION deployment is `dpl_57re12Ehuj8NBL5vVLiVzYATr9aa`
  for main `d7a6c0c` (2026-10-02T06:23:35Z). `/api/version` returns
  `d7a6c0c46e88…f74` — verified repeatedly after every merge below.
- The main merges `424f308` (#52), `5857be6` (#53/#55), `7397a70` (#56),
  `5b3c84f` (#57) produced NO production deployments — the git
  integration's deploy creation fails silently against the same limit.
- Branch previews also stopped creating after `26de60c` (07:36Z).

This is an infrastructure capacity constraint, not a code defect. It is
the deployment-side analogue of the Agnes chat-provider free-tier limit
(NF-5): a measured, documented ceiling of the free-tier stack.

FOUNDER NOTE (no action required, decision available): the quota
auto-resets at the timestamp above. Deploying sooner, or raising the
ceiling, requires a plan change on Vercel — a vendor/billing decision
(Constitution Rule 31), not something this session may do unilaterally.

## Current state at the time of writing

| What | State |
|---|---|
| `origin/main` | `5b3c84f87206107a6ea7ec6e0de238e71b09f5ad` |
| CI on `5b3c84f` | ALL GREEN (Lint/typecheck/test/validate ✓ · Migrations/RLS ✓ · Playwright ✓ — first run flaked on a crypto-page keyboard-nav timeout under heavy external API throttling; the identical tree had passed on the PR head 10 minutes earlier; the failed job was re-run and PASSED; run 36980894968) |
| Production runtime | `d7a6c0c` (stuck — see blocker) |
| Evidence for `d7a6c0c` | COMPLETE: 36/36 free-access matrix · grounded canary PASS (positive 5/5, negative 1/3) · receipt (git = Vercel = /api/version = CI = probe, all `d7a6c0c`) — committed via PR #52 |
| Evidence for `5b3c84f` | NOT GENERATABLE until it deploys (the deterministic gate needs the `/api/probe/ai-loop` route, which does not exist in the `d7a6c0c` runtime) |

What `5b3c84f` contains beyond `d7a6c0c` (all CI-gated, merged via
#52/#53/#55/#56/#57):

- Fresh exact-SHA evidence + the receipt script that derives results from
  artifacts and queries CI live (no hand-maintained strings).
- The deterministic production AI gate (`/api/probe/ai-loop`,
  secret-gated; `probeSeedToolCall` in the router — one loop, one probe
  mechanism after the two-session arbitration) + the strengthened §6/§7
  canary contract (exact server-surface equality, structural negative)
  + §11 latency attribution on the wire.
- The attempts-2-4 root-cause fix: FINAL-ANSWER-SHAPE prompt teaching
  (agnes-2.5-flash emitted claims as evidence-id strings; raw
  diagnostics in `docs/evidence/commit-o/raw-provider-diagnostics.md`).
- `/api/gurus` null semantics (unavailable change is never 0).
- `/api/prices/batch` error contract (no upstream exception text).
- Yahoo null-not-zero change semantics (single + bulk paths).
- Request-level price deadline + parallel first-choice sources,
  measured before/after (`docs/evidence/commit-o/price-latency-*.json`).
- Dead internal links fixed + blocking route-integrity CI gate.
- Chronology corrections (O8/O8b) across the tree.
- `PROBE_SECRET` provisioned on Vercel (encrypted, production target;
  value in the local vault only — never in the repo).

## Closure runbook (execute after 2026-10-03T06:40:27Z)

Every step is a scripted command; no manual dashboard actions
(Constitution Rule 30, Coder Directions 2026-10-02 §30).

```bash
cd /home/z/rishi-terminal && git checkout main && git pull origin main
# 0. If main has advanced past 5b3c84f, close evidence for the NEW head
#    instead — the runbook is identical, only the SHA changes.
SHA=$(git rev-parse origin/main)

# 1. Trigger the production deployment (the git integration may recover
#    on its own after the reset; if /api/version already == $SHA, skip).
python3 - "$SHA" << 'EOF'
import json, sys, urllib.request
sha = sys.argv[1]
vault = dict(l.strip().split('=', 1) for l in open('/home/z/my-project/download/rishi-credentials.txt') if '=' in l)
gh = vault['GITHUB_PAT']
repo_id = json.loads(urllib.request.urlopen(urllib.request.Request(
    'https://api.github.com/repos/prateekm1007/rishi-terminal',
    headers={'Authorization': f'Bearer {gh}'})).read())['id']
body = {"name": "rishi-terminal", "project": vault['VERCEL_PROJECT_ID'],
        "target": "production",
        "gitSource": {"type": "github", "repo": "prateekm1007/rishi-terminal",
                      "repoId": repo_id, "ref": sha}}
req = urllib.request.Request(
    f"https://api.vercel.com/v13/deployments?teamId={vault['VERCEL_TEAM_SCOPE']}",
    data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {vault['VERCEL_TOKEN']}",
             "Content-Type": "application/json"}, method="POST")
print(urllib.request.urlopen(req).read().decode())
EOF

# 2. Wait until /api/version == $SHA (poll; production builds take minutes).
#    Record the Vercel deployment id + READY state (Management API v6).

# 3. Fresh free-access matrix (env: SUPABASE_URL, SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE from the vault).
node scripts/prodFreeAccessMatrix.mjs https://rishi-terminal.vercel.app "$SHA"
#    → expect 36/36 PASS, expectedShaMatch=true

# 4. Fresh grounded canary (the strengthened contract now matches the
#    deployed wire: claimsVerified + timings + rejection threading).
node scripts/prodGroundedCanary.mjs https://rishi-terminal.vercel.app "$SHA"
#    → expect PASS; attempts should now be materially fewer thanks to the
#    FINAL-ANSWER-SHAPE teaching (the attempts-2-4 root cause)

# 5. THE DETERMINISTIC GATE — the authoritative AI-loop evidence
#    (env: PROBE_SECRET from the vault).
node scripts/prodDeterministicAiGate.mjs https://rishi-terminal.vercel.app "$SHA"
#    → expect: PASS across positive (seeded tool → REAL model → grounded,
#      exact server surface) and negative (seeded unknown symbol →
#      explicit failure, zero numbers)

# 6. Fresh receipt (env: VERCEL_TOKEN, VERCEL_PROJECT_ID, GITHUB_PAT).
node scripts/prodReceipt.mjs https://rishi-terminal.vercel.app production-receipt.json
#    → verify: git = Vercel = /api/version = CI = probe = receipt, all $SHA

# 7. Commit the artifacts (docs-only) + PR + merge. Post-merge, paste the
#    raw /api/version output (the receipt binds the runtime SHA; the
#    evidence commit itself adds no runtime code — verify with
#    `git diff --stat <runtime-SHA> HEAD -- app lib components` = empty).
```

## Honest limitations of the current evidence set

- The `d7a6c0c` canary receipt (PR #52) was produced with the
  pre-strengthening canary script: it asserts `text` CONTAINS the
  verified-statement shape, not exact equality. The strengthened contract
  (`scripts/lib/groundedCanaryContract.mjs`) cannot run against `d7a6c0c`
  (the wire there has no `claimsVerified`/`timings`) — that is version
  skew, not a defect, and the runbook's step 4 regenerates it.
- The canary's nondeterminism record (502 on attempt 1; grounding
  rejections on attempts 2–4) is preserved verbatim in the receipt — it
  is the diagnostic baseline that the O2 prompt-teaching fix addresses.
- Until `5b3c84f` (or later) deploys, `production-receipt.json`'s
  `deployedCommitSha` legitimately reads `d7a6c0c` — the receipt is TRUE
  for the actual runtime. It must not be "updated" to the undeployed SHA.
