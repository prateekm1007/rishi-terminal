# P0-1 smoke re-pin — rule-23 gate fix (2026-10-11)

## Defect

The post-deploy smoke (`scripts/ci/postDeploySmoke.mjs`, run by
`.github/workflows/post-deploy-smoke.yml` on every production
`deployment_status`) went RED on the P0-1 deployment `3c1f096b`
(run 38118627315, 2026-10-11 06:36Z):

```
FAIL  section /stock/SBIN "RISHI COMMENTARY" — 0 occurrence(s)
FAIL  section /stock/SBIN "Pillar Breakdown" — 0 occurrence(s)
FAIL  section /stock/BANKBARODA "RISHI COMMENTARY" — 0 occurrence(s)
FAIL  section /stock/BANKBARODA "Pillar Breakdown" — 0 occurrence(s)
post-deploy-smoke: FAIL — 4 failed check(s)
```

Cause: the probes assert the pre-P0-1 verdict sections unconditionally.
The founder's P0-1 order (audit 2026-10-11): "Seed rows show no verdict"
— every stock record currently classifies `seed` (no live fundamentals
feed), so the stock page renders the honest NO VERDICT record and
suppresses RISHI COMMENTARY / Pillar Breakdown BY DESIGN. The gate is
wrong, not the page. Per rule 23 the gate is fixed in its own PR with
the retirement/re-pin named (intake §3 retirement policy).

## The re-pin (strictly stronger, not weaker)

Per probe page the gate now enforces the **P0-1 verdict trichotomy** —
exactly one of:

- (a) seed record: `NO VERDICT — ILLUSTRATIVE SEED DATA` present →
  Key Metrics + Peer Comparison present AND both verdict sections
  ABSENT (the suppression itself is asserted, not assumed);
- (b) missing record: `INSUFFICIENT DATA — NO VERDICT IS PRODUCED`
  present (whole-page record) → verdict sections absent;
- (c) live/delayed record: both verdict sections present (the original
  A1 probes, unmodified — they return when licensed live fundamentals
  cover a probe symbol; P0-8 decision pending).

The old probe only asserted presence; the re-pin additionally fails a
seed page that leaks a verdict section and fails any page showing
neither record. Version / page-integrity / price / nullzero probes
unchanged.

## Proof (raw)

RED — pre-fix probe vs production (same SHA the CI run asserted):

```
$ git show HEAD:scripts/ci/postDeploySmoke.mjs > /tmp/orig-smoke.mjs
$ node /tmp/orig-smoke.mjs --expect-sha 3c1f096bf92ba981e551e01b139a1ec4be13931c
PASS  version — live sha 3c1f096bf92b (matches expected)
PASS  page-integrity /stock/SBIN — <h1 present: true; title marker: true; 105605 bytes
PASS  section /stock/SBIN "Key Metrics" — 3 occurrence(s)
PASS  section /stock/SBIN "Peer Comparison" — 2 occurrence(s)
FAIL  section /stock/SBIN "RISHI COMMENTARY" — 0 occurrence(s)
FAIL  section /stock/SBIN "Pillar Breakdown" — 0 occurrence(s)
... (BANKBARODA identical: 2 FAILs)
post-deploy-smoke: FAIL — 4 failed check(s)      EXIT=1
```

GREEN — re-pinned probe vs the SAME production SHA:

```
$ node scripts/ci/postDeploySmoke.mjs --expect-sha 3c1f096bf92ba981e551e01b139a1ec4be13931c
PASS  version — live sha 3c1f096bf92b (matches expected)
PASS  page-integrity /stock/SBIN — <h1 present: true; title marker: true; 105605 bytes
PASS  section /stock/SBIN "Key Metrics" — 3 occurrence(s)
PASS  section /stock/SBIN "Peer Comparison" — 2 occurrence(s)
PASS  verdict-state /stock/SBIN "RISHI COMMENTARY" suppressed — 0 occurrence(s) (must be 0 on seed data — P0-1)
PASS  verdict-state /stock/SBIN "Pillar Breakdown" suppressed — 0 occurrence(s) (must be 0 on seed data — P0-1)
... (BANKBARODA identical) ... nullzero 3/3 PASS
post-deploy-smoke: PASS (https://rishi-terminal.vercel.app, sha 3c1f096bf92b)   EXIT=0
```

Rule-24 bites (scratch harness serving fake shapes, raw output in
`smoke-repin-bites.txt` in this directory):

- `neither` (page with NO record and NO verdict sections):
  `FAIL — 2 failed check(s)`, exit 1 — the trichotomy cannot be
  satisfied by a blank page.
- `leak` (seed marker present AND RISHI COMMENTARY leaks):
  `FAIL verdict-state /stock/SBIN "RISHI COMMENTARY" suppressed — 1
  occurrence(s) (must be 0 on seed data — P0-1)`, exit 1 — the new
  suppression assertion bites.
- `clean` (seed SBIN + live-shaped BANKBARODA): PASS exit 0 — both
  branches of the trichotomy are live logic, not dead code.

## Risk

CI-only file (`scripts/ci/**`): no runtime surface, no deployment (the
Vercel ignoreCommand skips scripts/ci-only ranges). The fixed probe
takes effect on the NEXT production deployment, whose
`deployment_status` run checks out the deployed SHA's copy of the
script.

## Rollback

`git revert <merge commit>` — restores the pre-P0-1 probes.
