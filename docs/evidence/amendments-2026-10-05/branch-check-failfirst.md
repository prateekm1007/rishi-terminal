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
