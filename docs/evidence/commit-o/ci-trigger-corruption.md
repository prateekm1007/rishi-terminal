# Commit O — ci.yml push-trigger verification (founder direction #19)

Claim from earlier reports (incl. the Commit M era): current main's
`.github/workflows/ci.yml` push trigger is corrupted to `branches: ain]`.
Founder direction #19 said the opposite: current main has the correct
`push: branches: [main]` trigger and the corruption "must not be fixed
unless reproduced".

## Verification (byte-level, 2026-10-02)

```
git show HEAD:.github/workflows/ci.yml | count(b'branches: ain]')   = 0
git show HEAD:.github/workflows/ci.yml | count(b'branches: [main]') = 1
worktree .github/workflows/ci.yml       | count(b'branches: ain]')   = 0
worktree .github/workflows/ci.yml       | count(b'branches: [main]') = 1
```

The trigger on current main IS `branches: [main]`. The founder is right.

## Root cause of the false claim

The text `branches: [main]` renders as `branches: ain]` in some terminal /
tool-output paths that strip the ANSI-CSI-lookalike `[m` sequence. Every
"sighting" of the corruption in this workspace — including the repeated
cat/grep views during this session and the claim recorded in the Commit-M
era — matches that display artifact, not the file bytes. The apparent
perpetuation of `ain]` across commits was the viewer, not the repo.

## Action taken

None on the trigger: the premise was false (Rule 28), no fix was applied,
and no commit "fixes" it. The only ci.yml change in this branch is the
addition of the blocking routeAudit step (Coder Directions #18), unrelated
to the trigger.
