# CON-B1 — branch hygiene check: fail-first proof and positive control

Constitution v2 C7 (founder amendments 4 + 8; B-27 — the commit-scope registry is
retired as a sanctioned gate replacement, founder amendment 10). Rule 24: the gate
was proven to FAIL on deliberate violations before it was wired into CI.

## 1. Fail-first — deliberate violations (exit 1)

Scratch branch `scratch/r24-branchcheck-violation` (created from the working tree,
committed two violating subjects, then deleted after capture — never pushed):

```
$ node scripts/ci/branchCheck.mjs; echo "EXIT=$?"
branch-check: FAIL (scratch/r24-branchcheck-violation)
  ✗ commit subject 'this subject has no token at all' has no type(TOKEN): prefix (C7: fix(TOKEN): …)
  ✗ branch 'scratch/r24-branchcheck-violation' does not carry commit token 'BOGUS' (normalized 'bogus' not found in 'scratchr24branchcheckviolation') — B-25: assert the branch name before committing
EXIT=1
```

Both incident classes the registry used to catch are covered at the branch level:
a tokenless drive-by subject (B-23) and a token/branch mismatch (B-25).

## 2. Positive control — the gate passes an honest branch (exit 0)

```
$ npm run check:branch
branch-check: PASS (fix/con-b1-branch-check) — 1 token(s) [CON-B1], 1 commit(s) audited against <merge-base>
EXIT=0
```

(raw output re-pasted in the PR description from the real run)

## 3. Scope of the replacement

- Removed: `scripts/commitScopeAudit.mjs`, `scripts/ci/commit-scope-registry.json`,
  `npm run audit:commit-scope` (the push-blocking per-commit path allowlist).
- Added: `scripts/ci/branchCheck.mjs`, `npm run check:branch`, and a blocking CI
  step on every pull_request (head ref asserted against commit tokens; stale
  base is a WARNING, not a failure — stacked PRs are legitimate).
- Not weakened silently: this is the founder's amendment 10 verbatim ("Replace the
  commit-scope registry with a branch-name check, since the registry added a
  push-blocking step on every commit"), recorded in the incident log as B-27.

## 4. Historical evidence untouched

Files that mention the registry (e.g. `docs/evidence/round9/*`,
`docs/evidence/round12/y1-fast-pages.md`) are historical records and were not
edited, per Constitution v2 Appendix B ("Historical entries are never rewritten").

## 5. Deployed and live (C6, Constitution v2)

PR #153 merged as 618002b; the merge read "Deployment rate limited — retry in 24
hours" on GitHub (fourth exhaustion); the sanctioned API retry (RELEASE.md policy 4)
CREATED the deployment at 17:03:02Z on the first attempt and it reached READY.

```
$ curl -s https://rishi-terminal.vercel.app/api/version | jq -r .sha
618002bf6acf...        (= origin/main tip — deployed)
$ curl -s 'https://rishi-terminal.vercel.app/?cb=...' | grep -c 'href="/methodology"'
1                      (positive control, CI-pinned A5)
$ curl -s 'https://rishi-terminal.vercel.app/stock/SBIN?cb=...' | grep -c 'Peer Comparison'
2                      (positive control, CI-pinned SSR sections)
$ curl -s '.../?cb=...' | grep -c 'Connecting'; grep -c 'RANKINGS_ENABLED'
0 / 0                  (negative controls)
```

Process note (amendment 6 working as intended): the first live probe grepped
"Top Rishi Scores" — a stock-page marker, not a homepage string — returned 0, and
was replaced with the CI-pinned markers before any conclusion was drawn.
