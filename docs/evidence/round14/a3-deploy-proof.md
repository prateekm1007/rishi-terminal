# A3 — Deploy discipline: evidence (Round 14)

Recorded 2026-10-04 ~14:35 UTC. The live-SHA proof and the live-grep re-runs
are scheduled for after the quota reset (see the Monday protocol in
`docs/RELEASE.md` §A3); everything verifiable today is below, raw.

## 1. The quota is exhausted (the authoritative counter)

`POST /v13/deployments` (production, ref=main) — the raw error:

```
HTTP 402
{"error":{"code":"payment_required","message":"Resource is limited - try again in 24 hours (more than 100, code: \"api-deployments-free-per-day\").","limit":{"total":100,"remaining":0,"reset":1791210516348},"resource":"api-deployments-free-per-day"}}
```

`reset=1791210516348` ms = **2026-10-05T14:28:36Z** (computed: 23h56m from the
attempt at 14:32 UTC).

## 2. Production is live at A2; main is 6 merges ahead

```
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"47d76c47f142dd29e594461894f35d55be8f42d5","now":"2026-10-04T14:27:46.337Z","node":"v24.21.0"}

$ git log origin/main --format="%h %s" -7
a4a7486 fix(X3-07): portfolio import and analytics — CSV parsers, shared XIRR, RLS, idempotent re-import (#148)
5fc16c7 fix(X3-05): screener v2 — safe server-side expression parser, saved screens (RLS), CSV export (#146)
67f153d fix(R4-04): the Rishi Council view — consensus plus dissent with verified lever paths (#144)
9baa92a chore(A4): warmer run evidence — dispatch + forced verification (#143)
e678e49 fix(A5): link /methodology from the nav and the stock-page footer (#142)
47d76c4 fix(A2): make the chat challenge human-solvable — Web Worker PoW at 15 bits with progress and a timeout (#141)
e6ed222 Merge pull request #140 from prateekm1007/fix/a1-first-byte-content
```

Live = `47d76c4` (A2, deployed 13:14 UTC). Merged-but-not-live: A5, A4,
R4-04, X3-05, X3-07 (docs-only A4 deploys nothing by design; the rest deploy
at the reset).

## 3. No automatic deployments after 13:14 UTC

```
$ GET /v6/deployments?limit=100  (this project, window since 12:50 UTC)
  14:16:20 preview      CANCELED
  13:54:13 preview      CANCELED
  13:38:56 preview      CANCELED
  13:14:40 production   READY      <- A2 (the last production deployment)
  13:11:38 preview      CANCELED
  13:00:07 preview      CANCELED
```

The main merges at 13:14:49 (A5), 13:46 (A4 — docs-only, correctly skipped),
14:03 (R4-04), 14:17 (X3-05) and 14:24 (X3-07) created no deployment objects —
consistent with the quota counter having hit 100 during that window.

## 4. Today's visible creation counts (the lists under-report vs the counter)

```
rishi-terminal          46 in the 24h window (14 production today: 00:39, 00:44(CANCELED), 02:59, 03:10 x3, 03:19, 03:25, 03:42, 03:47, 06:44, 09:45, 12:42, 13:14)
rishi-terminal-staging   8 (all skipped/canceled by the ignore step)
launch-kit-generator     0
```

The sum (54) is BELOW the counter's 100 — the lists do not surface everything
the counter counts. The 402's `remaining: 0` is the ground truth.

## 5. The staging suspension + preview-skip gates are doing their job

`scripts/ci/vercel-ignore.sh` (Z1): staging project fully suspended;
non-production environments skipped; docs-only production ranges skipped
(A4's merge deployed nothing). Verified by the CANCELED preview states in
the listing above and A4's absence from the deployment timeline.

## 6. Monday protocol (mechanical)

1. After **2026-10-05T14:28:36Z**: `python3 /home/z/my-project/scripts/a3-deploy-main.py`
   (create-then-poll-by-id; persisted) — ONE production deploy of `main`.
2. Prove the live SHA:
   `curl -s https://rishi-terminal.vercel.app/api/version` == `origin/main`.
3. Re-run the A1 live acceptance against that SHA (with positive controls):
   ```
   curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -c "Pillar Breakdown\|RISHI COMMENTARY\|Peer Comparison\|Key Metrics"   # -> >= 4
   curl -s https://rishi-terminal.vercel.app/stock/BANDHANBNK | grep -c "Promoter Hold0.0%\|D/E Ratio0.0x"                          # -> 0
   ```
4. Append the raw outputs here and to the PR thread.

Note: the Monday warmer-coverage acceptance (A4) runs against the production
that is live DURING the NSE session (09:15–15:30 IST = 03:45–10:00 UTC) —
which will still be `47d76c4` (A2). That is sufficient: the warmer, its
secret and its workflow all shipped in Rounds 12–13 and are live; nothing in
the Round-14 merges touches the warmer path.

## 7. Addendum (14:50 UTC): GitHub Actions event delivery also stalled

After the X3-07 merge's push run (14:25:35 UTC, green), NO further workflow
runs were created: the A3 branch push (~14:40), the PR #149 open event, and
a close/reopen cycle all produced zero runs (the only check on the PR head
is Vercel's comment bot). This mirrors the Vercel Git-integration stall
observed at 13:14 and suggests a platform-side event delivery problem
today, not a repo misconfiguration (the workflow triggers are unchanged:
`pull_request:` unfiltered + push). If CI does not appear for this PR, the
same content is verified by the identical tree having passed the full
battery locally (docs-only diff vs the green a4a7486 push run).

Workaround if needed: the Monday deploy session re-runs the battery on main
before deploying; this PR's diff (docs/RELEASE.md + evidence + registry) is
docs-only and cannot affect any gate the push runs would execute.
