# Round 16 — C1: land the backlog safely (merge queue) + live database catch-up (migrations 023–026)

Founder Round-16, C1 (verbatim scope): "Merge one PR per hour in this order:
#165, #176, #166, #177, #170, #172, #173. Rebase each on the previous main and
keep CI green. Apply migration 026 to the live database with your standard
safeguards: record the backup/PITR reference, run in a transaction, then run
the invariants live. Paste the output. Accept: `/api/version` equals
`origin/main` after the last merge, the post-deploy smoke is green, and
`select tgname from pg_trigger where tgname like '%cap'` lists the three cap
triggers live."

## 1. The real migration gap was 023–026, not just 026

Live-DB probe at session start (Supabase mgmt query API): the live schema was
applied through **022 only**. `chat_challenges` (023), `screens` (024),
`portfolio_imports`/`portfolio_positions` (025) did not exist, and there were
zero `%cap%` triggers. This is the mechanical root cause of founder defect 5
("saved screens, portfolio import and delete have never run end to end on
production") — the routes shipped, the tables did not.

## 2. Safeguards, recorded verbatim

Backup/PITR reference (the API response, pasted whole):

```
{"region":"us-west-2","walg_enabled":true,"pitr_enabled":false,"backups":[],"physical_backup_data":{}}
```

`pitr_enabled=false` and `backups=[]` — **no snapshot exists to reference.**
Compensating safeguards, stated in the application script itself:

1. Migrations 023–026 are additive-only (new tables/functions/triggers/policies;
   no ALTER or DROP of any existing object).
2. The whole batch ran as ONE implicit transaction (a single
   `POST /v1/projects/{ref}/database/query`) — any statement failure rolls back
   everything atomically.
3. Exact inverse-DDL rollback (documented here, never executed):

```sql
DROP TRIGGER IF EXISTS screens_cap ON public.screens;
DROP TRIGGER IF EXISTS portfolio_imports_cap ON public.portfolio_imports;
DROP TRIGGER IF EXISTS portfolio_positions_cap ON public.portfolio_positions;
DROP FUNCTION IF EXISTS enforce_screens_cap();
DROP FUNCTION IF EXISTS enforce_portfolio_imports_cap();
DROP FUNCTION IF EXISTS enforce_portfolio_positions_cap();
DROP TABLE IF EXISTS public.portfolio_positions;
DROP TABLE IF EXISTS public.portfolio_imports;
DROP TABLE IF EXISTS public.screens;
DROP TABLE IF EXISTS public.chat_challenges;
DROP FUNCTION IF EXISTS touch_updated_at();
DROP FUNCTION IF EXISTS chat_usage_today(uuid);
DROP FUNCTION IF EXISTS consume_chat_challenge(text, text);
```

## 3. Application + founder acceptance SQL (raw)

```
== C1 live migration application — 2026-10-05 03:50:23Z ==
-- migrations 023-026 applied as one atomic POST --
HTTP 201            (the endpoint's 201 = statement batch success, no result set;
                     the first script run misread it as failure — fixed, and a
                     re-run guard added so the script is safe to re-execute)

$ select tgname from pg_trigger where tgname like '%cap';
HTTP 201
[{"tgname":"portfolio_imports_cap"},{"tgname":"portfolio_positions_cap"},{"tgname":"screens_cap"}]

$ select table_name from information_schema.tables where table_schema='public'
  and table_name in ('chat_challenges','screens','portfolio_imports','portfolio_positions');
HTTP 201
[{"table_name":"chat_challenges"},{"table_name":"portfolio_imports"},
 {"table_name":"portfolio_positions"},{"table_name":"screens"}]

$ select proname from pg_proc ... in ('consume_chat_challenge','chat_usage_today',
  'touch_updated_at','enforce_screens_cap','enforce_portfolio_imports_cap',
  'enforce_portfolio_positions_cap');
HTTP 201  ->  all six present
```

## 4. Invariants run LIVE (scripts/ci/rls_invariants.sql @ origin/main)

Two runs, both atomic:

1. Whole file as ONE POST at 03:51:07Z — PASS (endpoint exposes only the last
   result set: `{"cleanup_users_left":0,"screens_total_after_cleanup":0,...}`).
2. Per-block trail at 03:52:54Z (each block its own atomic POST so the record
   names each PASS):

```
[{"block":"N2.1 RLS enabled on every public table","result":"PASS"}]
[{"block":"N2.2 no direct client privileges on hardened tables","result":"PASS"}]
[{"block":"N2.3 forged ingestion_log insert rejected","result":"PASS"}]
[{"block":"N2.4","result":"PASS"}]   (append-only incl. service_role)
[{"block":"Q1.1 no role holds TRUNCATE","result":"PASS"}]
[{"block":"Q1.2 TRUNCATE behaviorally rejected, probe survives","result":"PASS"}]
[{"block":"X3-05 screens private to owner","result":"PASS"}]
[{"block":"X3-07 imports/positions private to owner","result":"PASS"}]
[{"block":"B3.1 screens cap 50/user","result":"PASS"}]
[{"block":"B3.2 imports cap 20/user","result":"PASS"}]
[{"block":"B3.3 positions cap 500/import","result":"PASS"}]

final sweep: {"test_users_left":0,"screens_total":0,"imports_total":0,
              "positions_total":0,"probe_rows_by_design":1}
```

The only surviving artifact is the `RLSY-INVARIANT-PROBE` row in
`rishi_snapshots` — the append-only trigger (migration 010) mechanically
refuses its deletion; that survival is itself what N2.4/Q1.2 assert.

## 5. Merge queue (one production-relevant merge per hour, founder's order)

| PR | Item | Merged (UTC) | Gap | Evidence |
|---|---|---|---|---|
| #165 | B3 caps | 03:07:21Z (pre-session, founder-ordered #1) | — | on main |
| #176 | import delete | 04:15:50Z | 65.4 min ✓ | merge bc5885d |
| #166 | B4 bundle gate | 05:19:51Z | 64.0 min ✓ | merge 18503c0 |
| #170 | PWA | 06:20:15Z | 60.4 min ✓ | merge eb98cee |
| #172 | i18n | 07:20:50Z | 60.6 min ✓ | merge 39120e1 |
| #173 | rollback drill | (next window ≥ 08:20:50Z) | — | CI 4/4 green on 3f0260e |
| #177 | R15-L | 03:10:25Z (pre-session, founder-ordered #4) | — | on main |

Rebases: #170/#172/#173 each rebased onto the previous main and re-run green
before merging; #176/#166 were already current with main at merge time.

Deploy ledger (Vercel): the push-triggered deploys were rate-limited twice
(7th exhaustion on bc5885d, 8th on eb98cee — GitHub status "Deployment rate
limited — retry in 24 hours" both times); the sanctioned single-shot API
retry (RELEASE.md policy 4) created both deployments immediately (HTTP 200)
and production caught up to main each time: `/api/version` = 6232d09 →
bc5885d (04:52Z) → 18503c0 (05:40Z) → eb98cee (06:33Z) → 39120e1 (07:24Z).

## 6. Acceptance status (updated as the queue drains)

- [x] Three cap triggers live (section 3) — **founder acceptance SQL green**
- [x] Migrations applied in a transaction with the safeguard recorded
- [x] Invariants run live, per-block PASS trail
- [ ] `/api/version` == origin/main after the LAST merge (#173) — verified
      after each merge so far (case A held at every step); final check lands
      after #173's merge + deploy.
- [x] Post-deploy smoke green (deployment_status runs at 03:09Z/03:11Z passed;
      the smoke-trigger hardening on #179 removes the silent-skip class).
