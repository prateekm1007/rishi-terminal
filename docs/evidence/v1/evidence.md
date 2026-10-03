# V1 evidence — PUBLIC EXECUTE hole on SECURITY DEFINER functions

Local harness: embedded Postgres 16.4 (Zonky binaries), same pg_harness.sql + migrations 001…N as the CI migrations job, driven by run-v1-harness.mjs (Node pg client, one file per implicit transaction).

## RED (migrations 001…017, no 018) + GREEN (001…018)
```

══ RED: apply harness + migrations 001…017 (current code, no 018) ══
  applied: scripts/ci/pg_harness.sql
  applied: lib/db/migrations/001_initial_schema.sql
  applied: lib/db/migrations/002_supabase_auth.sql
  applied: lib/db/migrations/003_automation_schema.sql
  applied: lib/db/migrations/004_financial_quarters.sql
  applied: lib/db/migrations/005_chat_usage.sql
  applied: lib/db/migrations/006_score_engine_version.sql
  applied: lib/db/migrations/007_grant_tier_rpc.sql
  applied: lib/db/migrations/008_chat_usage_atomic.sql
  applied: lib/db/migrations/009_phase6_provider_cache.sql
  applied: lib/db/migrations/010_rls_hardening.sql
  applied: lib/db/migrations/011_health_probe.sql
  applied: lib/db/migrations/012_security_master.sql
  applied: lib/db/migrations/013_truncate_guard.sql
  applied: lib/db/migrations/014_universe_name_mismatch.sql
  applied: lib/db/migrations/015_anonymous_chat_quota.sql
  applied: lib/db/migrations/016_quote_cache.sql
  applied: lib/db/migrations/017_quote_cache_claim_and_volume.sql
── V1.1 invariant on 001…017 (must FAIL) ──
  [RED] invariant: RAISED -> P0001 V1.1 FAILED: anon/authenticated can EXECUTE SECURITY DEFINER function(s): try_quote_cache_refresh(p_symbol text, p_claim_seconds integer) [anon], try_quote_cache_refresh(p_symbol text, p_claim_seconds integer) [authenticated]
  EXPECTED MET: invariant FAILS on current code (gate bites, rule 24)
── behavioral: anon calls try_quote_cache_refresh (auditor reproduction) ──
  anon call #1 won = true
  owner (legitimate refresher) call #2 won = false
  quote_cache rows created by anon: [{"symbol":"POISONED","price":"0","source":"claim","observed_at":null}]
  EXPECTED MET: anon WON the claim (hole reproduced)
  EXPECTED MET: legitimate refresher got false (claim held by anon)
  EXPECTED MET: POISONED row exists with price 0, source='claim', observed_at null

══ GREEN: apply harness + migrations 001…018 (with 018) ══
  applied: scripts/ci/pg_harness.sql
  applied: lib/db/migrations/001_initial_schema.sql
  applied: lib/db/migrations/002_supabase_auth.sql
  applied: lib/db/migrations/003_automation_schema.sql
  applied: lib/db/migrations/004_financial_quarters.sql
  applied: lib/db/migrations/005_chat_usage.sql
  applied: lib/db/migrations/006_score_engine_version.sql
  applied: lib/db/migrations/007_grant_tier_rpc.sql
  applied: lib/db/migrations/008_chat_usage_atomic.sql
  applied: lib/db/migrations/009_phase6_provider_cache.sql
  applied: lib/db/migrations/010_rls_hardening.sql
  applied: lib/db/migrations/011_health_probe.sql
  applied: lib/db/migrations/012_security_master.sql
  applied: lib/db/migrations/013_truncate_guard.sql
  applied: lib/db/migrations/014_universe_name_mismatch.sql
  applied: lib/db/migrations/015_anonymous_chat_quota.sql
  applied: lib/db/migrations/016_quote_cache.sql
  applied: lib/db/migrations/017_quote_cache_claim_and_volume.sql
  applied: lib/db/migrations/018_security_definer_rpc_lockdown.sql
── V1.1 invariant on 001…018 (must PASS) ──
  [GREEN] invariant: PASS (no exception raised)
  EXPECTED MET: invariant PASSES after 018
── behavioral: anon probe must be permission-denied (42501), no row ──
  anon probe raised: 42501 permission denied for function try_quote_cache_refresh
  EXPECTED MET: anon probe denied with SQLSTATE 42501
  rows left in quote_cache for the denied symbol: 0
  EXPECTED MET: no poisoned row created
── poisoned-row cleanup: 018 deleted claim placeholders without observation ──
  quote_cache contents after 018 + invariant probes: [{"symbol":"V1-PROBE-SERVICE","price":"0","source":"claim","observed_at":null}]
  EXPECTED MET: no auditor-poison rows remain (any source='claim' row left is the invariant's own positive control)

V1 harness: ALL EXPECTATIONS MET (RED bites, GREEN holds)
```

## Live database check (Supabase Management API, database/query)
```

──── 1a — SECURITY DEFINER functions in public with ACLs (live inventory) ────
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proacl::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef ORDER BY p.proname;
HTTP 201
[{"proname":"apply_tier_grant","args":"p_user_id uuid, p_tier text","proacl":"{postgres=X/postgres,service_role=X/postgres}"},{"proname":"consume_chat_quota","args":"p_user_id uuid, p_limit integer","proacl":"{postgres=X/postgres,service_role=X/postgres}"},{"proname":"enforce_tier_write_protection","args":"","proacl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"},{"proname":"grant_tier_for_payment","args":"p_order_id text, p_payment_id text, p_amount integer, p_currency text","proacl":"{postgres=X/postgres,service_role=X/postgres}"},{"proname":"handle_new_user","args":"","proacl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"},{"proname":"health_probe","args":"p_price_jobs text[], p_fundamentals_jobs text[]","proacl":"{postgres=X/postgres,service_role=X/postgres}"},{"proname":"hit_rate_limit","args":"p_key text, p_limit integer, p_window_seconds integer","proacl":"{postgres=X/postgres,service_role=X/postgres}"},{"proname":"refund_chat_quota","args":"p_user_id uuid","proacl":"{postgres=X/postgres,service_role=X/postgres}"},{"proname":"repair_tier_grant","args":"p_user_id uuid, p_tier text, p_paid_at timestamp with time zone","proacl":"{postgres=X/postgres,service_role=X/postgres}"}]
>>> EXPECTED MET: live inventory retrieved
>>> EXPECTED MET: try_quote_cache_refresh ABSENT live (016/017 never applied — premise gap)

──── 1b — quote_cache table existence on live ────
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'quote_cache';
HTTP 201
[]
>>> EXPECTED MET: quote_cache table ABSENT live (nothing to clean up there yet)

──── 2a — pre-state: anon/authenticated EXECUTE on the 002 SECURITY DEFINER trigger functions ────
SELECT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')                AS anon_hnu,
       has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')       as auth_hnu,
       has_function_privilege('anon', 'public.enforce_tier_write_protection()', 'EXECUTE')  AS anon_etwp,
       has_function_privilege('authenticated', 'public.enforce_tier_write_protection()', 'EXECUTE') AS auth_etwp;
HTTP 201
[{"anon_hnu":true,"auth_hnu":true,"anon_etwp":true,"auth_etwp":true}]
>>> EXPECTED MET: live defect confirmed: anon holds EXECUTE on SECURITY DEFINER trigger functions pre-018

──── 2b — V1.1 invariant scan pre-apply (passes: trigger functions are the documented allow-list) ────
DO $$
DECLARE fn record; offenders text;
BEGIN
  offenders := '';
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid) AS is_trigger_fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF fn.is_trigger_fn THEN CONTINUE; END IF;
    IF has_function_privilege('anon', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s%s(%s) [anon]', CASE WHEN offenders = '' THEN '' ELSE ', ' END, fn.proname, fn.args);
    END IF;
    IF has_function_privilege('authenticated', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s%s(%s) [authenticated]', CASE WHEN offenders = '' THEN '' ELSE ', ' END, fn.proname, fn.args);
    END IF;
  END LOOP;
  IF offenders <> '' THEN
    RAISE EXCEPTION 'V1.1 FAILED: anon/authenticated can EXECUTE SECURITY DEFINER function(s): %', offenders;
  END IF;
END $$;
HTTP 201
[]
>>> EXPECTED MET: invariant scan runs on live (trigger allow-list documented in the gate)

──── 3 — apply 018's trigger-function revokes to live (pure privilege reduction) ────
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_tier_write_protection() FROM PUBLIC, anon, authenticated;
HTTP 201
[]

──── 4a — post-state: client-facing EXECUTE revoked ────
SELECT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')                AS anon_hnu,
       has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')       as auth_hnu,
       has_function_privilege('anon', 'public.enforce_tier_write_protection()', 'EXECUTE')  AS anon_etwp,
       has_function_privilege('authenticated', 'public.enforce_tier_write_protection()', 'EXECUTE') AS auth_etwp;
HTTP 201
[{"anon_hnu":false,"auth_hnu":false,"anon_etwp":false,"auth_etwp":false}]
>>> EXPECTED MET: anon/authenticated EXECUTE fully revoked on live

──── 4b — V1.1 invariant scan post-apply (must PASS) ────
DO $$
DECLARE fn record; offenders text;
BEGIN
  offenders := '';
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args,
           EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid) AS is_trigger_fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF fn.is_trigger_fn THEN CONTINUE; END IF;
    IF has_function_privilege('anon', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s%s(%s) [anon]', CASE WHEN offenders = '' THEN '' ELSE ', ' END, fn.proname, fn.args);
    END IF;
    IF has_function_privilege('authenticated', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s%s(%s) [authenticated]', CASE WHEN offenders = '' THEN '' ELSE ', ' END, fn.proname, fn.args);
    END IF;
  END LOOP;
  IF offenders <> '' THEN
    RAISE EXCEPTION 'V1.1 FAILED: anon/authenticated can EXECUTE SECURITY DEFINER function(s): %', offenders;
  END IF;
END $$;
HTTP 201
[]
>>> EXPECTED MET: live invariant PASSES post-018-revokes

──── 4c — as anon: direct call must be permission denied ────
SET ROLE anon;
SELECT public.handle_new_user() AS out;
HTTP 400
{"message":"Failed to run sql query: ERROR:  42501: permission denied for function handle_new_user\n"}
>>> EXPECTED MET: anon direct call returns permission denied on live

──── 4d — reset role (connection hygiene) ────
RESET ROLE;
HTTP 201
[]

V1 LIVE CHECK: ALL EXPECTATIONS MET (safe subset applied; 016/017/018 full live application = FOUNDER DECISION NEEDED)
```
