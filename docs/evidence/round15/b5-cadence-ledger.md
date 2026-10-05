# B5 — cadence violations ledger + deploy state (Round 15, this session)

Constitution C8's gate records violations as red push runs (by design —
the check run IS the audit trail; merges cannot be undone). This file is
the session's honest ledger of every violation it caused or observed,
with causes. Raw run history (2026-10-05 01:10Z):

```text
$ gh api /actions/runs?branch=main
2026-10-05T01:02:43Z b3003f2 CI -> completed failure   (#175)
2026-10-05T00:19:44Z 9f8f729 CI -> completed failure   (#169, docs-only)
2026-10-05T00:05:08Z edd236a CI -> completed failure   (#164 / B2)
2026-10-05T00:05:05Z 569f61f CI -> completed cancelled (#167, superseded — normal)
2026-10-05T00:00:38Z af3c155 CI -> completed failure   (#171)
2026-10-04T23:47:33Z 45ab89a CI -> completed failure   (#168)
```

## Violations, with owners and causes

| merge | time (UTC) | gap | owner | cause |
|---|---|---|---|---|
| #159 (9c05a96) | 22:53:40 Oct 4 → its run red | 59.55 min | parallel session | anchored on DEPLOY time, not merge time (recorded by them) |
| #161 (62fd623) | 22:54:42 Oct 4 → its run red | 56 s | FOUNDER | merged 56 s after my #163 |
| #168 (45ab89a) | 23:47:33 → red | 52.9 min | THIS SESSION | I anchored on my #163's merge (22:53) instead of the founder's #161 (22:54:42) — and 52.9 < 60 anyway |
| #171 (af3c155) | 00:00:38 → red | 66 min (cadence PASS) | parallel session | NOT a cadence failure: the midnight PROVENANCE date bug (wall-clock stamp 2026-10-04 → 2026-10-05 with zero content change). Root cause fixed in #174 |
| #164 / B2 (edd236a) | 00:05:05 → red | 4.5 min | THIS SESSION | I merged #167+#164 without noticing #171 (production-relevant: test files) had landed at 00:00:35 between my checks |
| #169 (9f8f729) | 00:19:44 → red | (audits B2's 4.5 min) | inherited | docs-only merge, but the gate audits the newest TWO relevant merges — B2's violation |
| #175 (b3003f2) | 01:02:40 → red | 57.6 min | THIS SESSION | my cadence wait loop was killed by the tool's 590 s timeout and the chained merge executed 2.5 min before the 60-min window |

Verification of the last measurement (local run of the gate itself):

```text
$ node scripts/ci/deployCadence.mjs --base origin/main
deploy-cadence: FAIL — production-relevant merge b3003f25f9e8 landed 57.6 min after edd236a9fd4e — C8 allows at most one per 60 min
EXIT 1
```

## Deploy state (the positive record)

- The quota window DRAINED ~00:20Z (the 402's `reset` claim of 14:47Z was
  worst-case — B-26's lesson holds a fifth time). Production deployed and
  now tracks main: `9f8f729` → `b3003f2` (verified via /api/version at
  01:07Z).
- **The post-deploy smoke FIRED for the first time and PASSED**
  (2026-10-05T01:04:11Z, deployment_status → success, on b3003f2's
  production deployment) — after the #175 environment-match fix
  (`startsWith 'Production'`; the real environment is
  `Production – rishi-terminal`).

## Discipline going forward (this session)

- Anchor every slot on the NEWEST production-relevant merge COMMIT
  TIMESTAMP (from `git log --first-parent --merges`), re-checked
  immediately before merging — not on remembered API response times.
- Never chain a merge behind a sleep loop that can be killed by a tool
  timeout; check the clock, then merge in a separate call.
- Next production-relevant slot: ≥ 02:02:40Z (+ margin → 02:05Z).
