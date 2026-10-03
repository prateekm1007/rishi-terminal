-- ============================================================
-- security_definer_invariants.sql — V1 (founder round 9): no
-- client-facing role may EXECUTE a SECURITY DEFINER function.
-- ============================================================
-- Runs AFTER migrations 001…N in the CI migrations job (see
-- .github/workflows/ci.yml job "migrations"). Every check RAISES on
-- violation so psql -v ON_ERROR_STOP=1 fails the job. A check that cannot
-- fail is theatre (Constitution 24): the catalog scan below was verified
-- to FAIL on migrations 001…017 (anon could EXECUTE
-- try_quote_cache_refresh) and to PASS only after 018.
--
-- Why has_function_privilege: the 016/017 defect hid behind grant paths —
-- the harness granted EXECUTE directly to anon/authenticated (Supabase-like
-- default privileges) while live Supabase kept the Postgres-default PUBLIC
-- grant. has_function_privilege() aggregates EVERY grant path, so an
-- offender is caught in both environments.
--
-- Allow-list (mechanical, not hand-maintained): SECURITY DEFINER functions
-- that pg_trigger references (trigger functions). Firing a trigger never
-- checks EXECUTE, so they need no grant — migration 018 revokes their
-- EXECUTE anyway as defense in depth; they are skipped here so the gate
-- survives a future trigger function without weakening the rule for RPCs.

-- ── V1.1 catalog scan: anon/authenticated hold no EXECUTE on any
--      SECURITY DEFINER function outside the trigger allow-list ──
DO $$
DECLARE
  fn record;
  offenders text;
BEGIN
  offenders := '';
  FOR fn IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgfoid = p.oid) AS is_trigger_fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    IF fn.is_trigger_fn THEN
      CONTINUE; -- mechanical allow-list: trigger functions (018 locks these too)
    END IF;
    IF has_function_privilege('anon', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s%s(%s) [anon]',
        CASE WHEN offenders = '' THEN '' ELSE ', ' END, fn.proname, fn.args);
    END IF;
    IF has_function_privilege('authenticated', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s%s(%s) [authenticated]',
        CASE WHEN offenders = '' THEN '' ELSE ', ' END, fn.proname, fn.args);
    END IF;
  END LOOP;
  IF offenders <> '' THEN
    RAISE EXCEPTION 'V1.1 FAILED: anon/authenticated can EXECUTE SECURITY DEFINER function(s): %', offenders;
  END IF;
END
$$;

-- ── V1.2 behavioral: as anon, the claim RPC is permission denied and
--      creates NO row (the poison path is closed end to end) ──
DO $$
DECLARE
  won boolean;
  leftover int;
BEGIN
  BEGIN
    SET LOCAL ROLE anon;
    won := try_quote_cache_refresh('V1-PROBE-SYMBOL', 5);
    RAISE EXCEPTION 'V1.2 FAILED: anon called try_quote_cache_refresh and won=% (row poisoned quote_cache)', won;
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- expected: EXECUTE revoked from PUBLIC/anon/authenticated (018)
  END;
  SELECT count(*) INTO leftover FROM quote_cache WHERE symbol = 'V1-PROBE-SYMBOL';
  IF leftover <> 0 THEN
    RAISE EXCEPTION 'V1.2 FAILED: the denied anon call left % row(s) in quote_cache', leftover;
  END IF;
END
$$;

-- ── V1.3 positive control: service_role — the only legitimate caller
--      (lib/quoteCache uses the service key) — CAN still execute it ──
DO $$
DECLARE
  won boolean;
BEGIN
  IF NOT has_function_privilege('service_role', 'public.try_quote_cache_refresh(text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'V1.3 FAILED: service_role lost EXECUTE on try_quote_cache_refresh — quote refresh is broken';
  END IF;
  BEGIN
    SET LOCAL ROLE service_role;
    won := try_quote_cache_refresh('V1-PROBE-SERVICE', 5);
    IF NOT won THEN
      RAISE EXCEPTION 'V1.3 FAILED: service_role cold claim returned false — cold cache can never populate';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'V1.3 FAILED: service_role EXECUTE was revoked too — quote refresh is broken';
  END;
END
$$;

-- ── V1.4 positive control (W3 closure): service_role retains EXECUTE on
--      the global-spend RPCs — the app's cost gates depend on them; a
--      lost grant fail-closes ALL chat, so it must bite in CI first ──
DO $$
BEGIN
  IF NOT has_function_privilege('service_role', 'public.reserve_rate_limit(text, integer, integer, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'V1.4 FAILED: service_role lost EXECUTE on reserve_rate_limit — the global spend cap is broken';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.settle_rate_limit(text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'V1.4 FAILED: service_role lost EXECUTE on settle_rate_limit — the global spend ledger is broken';
  END IF;
END
$$;
