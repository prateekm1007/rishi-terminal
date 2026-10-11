# Round-48 — the RELIANCE seed-leak smoke probe (C5/C6)

**Founder directive 2026-10-11 (round-48 order, verbatim scope):**
"Close the live-versus-main gap first (C6). Record /api/version and the
response headers for /stock/RELIANCE. If the page is stale, purge or
redeploy, then re-probe. Add RELIANCE to the post-deploy smoke as a
seed-leak probe that fails on 'HIGH Data', 'REDUCE', or a QVPS score for
a seed record. Show that the probe fails on the old content before
relying on it (C5)."

## 1. The C6 records (live, 2026-10-11T13:56Z)

`GET https://rishi-terminal.vercel.app/api/version`:

```
{"sha":"4c9f7088cb04346d7db63648bb7a610b27427b5f","now":"2026-10-11T13:56:34.321Z","node":"v24.21.0"}
HTTP 200
```

`GET /stock/RELIANCE` response headers (abridged to the meaningful ones):

```
HTTP/2 200
age: 2568
cache-control: public, max-age=0, must-revalidate
content-type: text/html; charset=utf-8
date: Sun, 11 Oct 2026 13:13:46 GMT
etag: "smnjwrf6nf1t5t"
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-vercel-cache: STALE
x-vercel-id: hkg1::iad1::8dxnt-1791726994461-1391a2c3177f
content-length: 84621
```

**Staleness verdict: NOT STALE — no purge, no redeploy owed.** The served
build sha `4c9f7088` is the #349 merge — the latest DEPLOYMENT-RELEVANT
main SHA (main tip `932df2e` is the docs-only #351, deploy-exempt per C6
and the vercel-ignore skip scope). `x-vercel-cache: STALE` is the ISR
stale-while-revalidate serving state (stale-time 300 s), not build
staleness; the flight carries the NEW #349 content
("exchange-data license is pending", 1 hit) which is the C6 positive
control. Content re-probed after the record: the same fresh build.

## 2. The probe

`scripts/ci/postDeploySmoke.mjs` gains section 4 — `seedleak RELIANCE`,
three leak-family detectors over the comment-stripped HTML (React SSR
`<!-- -->` separators would split the strings), anchored on RENDERED tile
markup — never bare numbers — because the RSC payload can carry
precomputed results for suppressed client components (the flight-payload
trap disclosed in the round-46 P0-1 production legs):

1. the literal `HIGH Data` — the old QVPS coverage-grade badge (renamed
   to `coverage` in P0-1, rule 2);
2. `\bREDUCE\b` — the retired action vocabulary (P0-6);
3. a QVPS score for a seed record — the old badge regex
   `/v2\.0\s*·\s*(?:HIGH|MEDIUM|LOW)\s*Data/` on ANY record class, plus
   the `QVPS Score` tile label whenever the record is seed/missing (a
   seed record must render no verdict surface at all — P0-1). A record
   control (seed | missing | full-verdict marker) gates the class scoping
   and proves the page rendered (B-18).

Runs on every production deployment via the existing
`post-deploy-smoke.yml` workflow (deployment_status), no workflow change.

## 3. Rule 21/24 — the bite: the probe FAILS on the old content

The leak-era content was rebuilt from the commit production served when
the founder's audit caught the leaks live (`cab5a80` — the pre-P0-1
tree; `package.json` and `package-lock.json` identical to HEAD, empty
diff, so node_modules is shared via a hard-link copy). Built clean
(1019/1019 pages), served locally, and the NEW smoke ran against it:

```
$ node scripts/ci/postDeploySmoke.mjs --base http://127.0.0.1:3210
PASS  seedleak RELIANCE page-integrity — <h1 present: true; title marker: true; 184739 bytes
PASS  seedleak RELIANCE record-control — record class: verdict (seed=0 missing=0 verdict-sections=2/2)
FAIL  seedleak RELIANCE "HIGH Data" — 1 occurrence(s) (must be 0 — the QVPS coverage grade was renamed to coverage, P0-1 rule 2)
FAIL  seedleak RELIANCE "REDUCE" — 4 occurrence(s) (must be 0 — the action vocabulary is retired, P0-6)
FAIL  seedleak RELIANCE old QVPS badge "v2.0 · <grade> Data" — 1 occurrence(s) (must be 0 — retired markup, renders a score for a seed record)
PASS  seedleak RELIANCE QVPS score on verdict record — 0 occurrence(s) of the tile label (must be 0 on seed/missing — P0-1; 0 on the page overall)
post-deploy-smoke: FAIL — 4 failed check(s)
exit 1
```

All three founder-named leak families bite on the old content: the old
page rendered full verdicts on seed data (the pre-P0-1 record class),
carried the `v2.0 · HIGH Data` badge, and the retired REDUCE vocabulary
rendered 4 times. (The version check also honestly reports the local
build's `"sha":"unknown"` — VERCEL_GIT_COMMIT_SHA is absent off-Vercel.)

## 4. The same probe against PRODUCTION (fresh content)

```
$ node scripts/ci/postDeploySmoke.mjs
PASS  seedleak RELIANCE page-integrity — <h1 present: true; title marker: true; 84449 bytes
PASS  seedleak RELIANCE record-control — record class: seed (seed=1 missing=0 verdict-sections=0/2)
PASS  seedleak RELIANCE "HIGH Data" — 0 occurrence(s) (must be 0 — the QVPS coverage grade was renamed to coverage, P0-1 rule 2)
PASS  seedleak RELIANCE "REDUCE" — 0 occurrence(s) (must be 0 — the action vocabulary is retired, P0-6)
PASS  seedleak RELIANCE old QVPS badge "v2.0 · <grade> Data" — 0 occurrence(s) (must be 0 — retired markup, renders a score for a seed record)
PASS  seedleak RELIANCE QVPS score on seed record — 0 occurrence(s) of the tile label (must be 0 on seed/missing — P0-1; 0 on the page overall)
post-deploy-smoke: PASS (https://rishi-terminal.vercel.app, sha 4c9f7088cb04)
exit 0
```

(The full smoke — version, sections, trichotomy, nullzero — also PASSes:
16/16 lines, exit 0.)

## Risk

- Detector false positives on a future live record: the `QVPS Score`
  label is class-scoped (allowed on a verdict-allowed record — that is
  the legitimate tile), and the badge regex pins retired markup that
  cannot honestly render in any state. `REDUCE` and `HIGH Data` are
  retired vocabulary with zero legitimate renderings (P0-6/P0-1 removed
  them at the source; the grep pins live on those PRs' tests).
- The RSC payload trap is answered by markup anchoring + record-state
  control, not by naive string counts.

## Rollback

`git revert` of this branch's single commit; the smoke returns to the
round-47 four-section state (the workflow file is untouched).
