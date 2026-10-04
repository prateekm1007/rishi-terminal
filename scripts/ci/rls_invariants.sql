-- ============================================================
-- rls_invariants.sql — N2 acceptance assertions, run AFTER the
-- migrations 001…NN are applied (see .github/workflows/ci.yml job
-- "migrations"). Same queries as the live verification (spec N2
-- "Accept (CI and live)").
--
-- Every check RAISES on violation, so psql -v ON_ERROR_STOP=1 fails
-- the CI job. A check that cannot fail is theatre (Constitution 24):
-- each block below was verified to fail before migration 010 existed.

\echo '── N2.1: every public table has row-level security enabled'
DO $$
DECLARE
  missing text;
BEGIN
  FOR missing IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    RAISE EXCEPTION 'N2.1 FAILED: table % has no row-level security', missing;
  END LOOP;
END
$$;

\echo '── N2.2: client-facing roles hold no direct privileges on the hardened tables'
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.ingestion_log', 'INSERT') THEN
    RAISE EXCEPTION 'N2.2 FAILED: anon can INSERT into ingestion_log';
  END IF;
  IF has_table_privilege('anon', 'public.rishi_snapshots', 'INSERT') THEN
    RAISE EXCEPTION 'N2.2 FAILED: anon can INSERT into rishi_snapshots';
  END IF;
  IF has_table_privilege('anon', 'public.financial_annual', 'INSERT') THEN
    RAISE EXCEPTION 'N2.2 FAILED: anon can INSERT into financial_annual';
  END IF;
  IF has_table_privilege('anon', 'public.signal_history', 'INSERT') THEN
    RAISE EXCEPTION 'N2.2 FAILED: anon can INSERT into signal_history';
  END IF;
  IF has_table_privilege('authenticated', 'public.rishi_snapshots', 'DELETE') THEN
    RAISE EXCEPTION 'N2.2 FAILED: authenticated can DELETE rishi_snapshots';
  END IF;
END
$$;

\echo '── N2.3: a forged ingestion_log row as anon is rejected'
DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE anon;
    INSERT INTO public.ingestion_log (job_name, status)
    VALUES ('forged-by-anon', 'success');
    RAISE EXCEPTION 'N2.3 FAILED: anon INSERT into ingestion_log succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- expected: permission denied (REVOKE) or RLS denial (42501)
  END;
END
$$;

\echo '── N2.4: rishi_snapshots is append-only, including for service_role (S2-07)'
-- Seed one snapshot row as the migration role, then prove no role can
-- rewrite history. BEFORE ROW triggers only fire for matched rows, so
-- the UPDATE/DELETE below target the seeded row on purpose.
INSERT INTO public.rishi_snapshots
  (symbol, asset_category, snapshot_date, consensus_score, signal)
VALUES
  ('RLSY-INVARIANT-PROBE', 'stock', current_date, 50, 'HOLD');

DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE service_role;
    UPDATE public.rishi_snapshots
       SET consensus_score = 999
     WHERE symbol = 'RLSY-INVARIANT-PROBE';
    RAISE EXCEPTION 'N2.4 FAILED: service_role UPDATE of rishi_snapshots succeeded';
  EXCEPTION
    WHEN check_violation THEN
      NULL; -- expected: append-only trigger (010)
  END;
END
$$;

DO $$
BEGIN
  BEGIN
    SET LOCAL ROLE service_role;
    DELETE FROM public.rishi_snapshots
     WHERE symbol = 'RLSY-INVARIANT-PROBE';
    RAISE EXCEPTION 'N2.4 FAILED: service_role DELETE of rishi_snapshots succeeded';
  EXCEPTION
    WHEN check_violation THEN
      NULL; -- expected: append-only trigger (010)
  END;
END
$$;

\echo '── N2 invariants: all passed'

\echo '── Q1.1 (N2.5): no Supabase role holds TRUNCATE on any public table'
-- Row-level triggers do not fire on TRUNCATE, and RLS never applies to it,
-- so a TRUNCATE grant bypasses every per-row guard (audit round 4, Q1).
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    IF has_table_privilege('anon', format('public.%I', t), 'TRUNCATE') THEN
      RAISE EXCEPTION 'Q1.1 FAILED: anon can TRUNCATE public.%', t;
    END IF;
    IF has_table_privilege('authenticated', format('public.%I', t), 'TRUNCATE') THEN
      RAISE EXCEPTION 'Q1.1 FAILED: authenticated can TRUNCATE public.%', t;
    END IF;
    IF has_table_privilege('service_role', format('public.%I', t), 'TRUNCATE') THEN
      RAISE EXCEPTION 'Q1.1 FAILED: service_role can TRUNCATE public.%', t;
    END IF;
  END LOOP;
END
$$;

\echo '── Q1.2 (N2.6): TRUNCATE of rishi_snapshots is rejected for service_role'
-- Behavioral: even if a future grant re-appears, the statement trigger
-- (migration 013) must reject the TRUNCATE and the seeded row must survive.
DO $$
DECLARE
  rows_after int;
BEGIN
  BEGIN
    SET LOCAL ROLE service_role;
    TRUNCATE public.rishi_snapshots;
    RAISE EXCEPTION 'Q1.2 FAILED: service_role TRUNCATE of rishi_snapshots succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL; -- expected: REVOKE TRUNCATE (013) — permission denied
    WHEN check_violation THEN
      NULL; -- expected: statement trigger (013) — for roles that hold the privilege (e.g. owner)
  END;
  SELECT count(*) INTO rows_after FROM public.rishi_snapshots WHERE symbol = 'RLSY-INVARIANT-PROBE';
  IF rows_after <> 1 THEN
    RAISE EXCEPTION 'Q1.2 FAILED: probe row did not survive (rows_after=%) — the table was emptied', rows_after;
  END IF;
END
$$;

\echo '── Q1 invariants: all passed'

\echo '── X3-05: saved screens are private to their owner'
-- Behavioral proof of the roadmap acceptance: "user A cannot
-- read/update/delete user B's screens." Two simulated users via
-- SET ROLE authenticated + request.jwt.claim.sub (the pg_harness
-- GoTrue stand-in). Every cross-user operation must see zero rows
-- (RLS filters SELECT/UPDATE/DELETE) and same-user operations must
-- work (the policies do not over-restrict).
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  screen_a uuid;
  seen int;
BEGIN
  -- Two auth users; the handle_new_user trigger (migration 002)
  -- creates their public.users rows — inserting there again would
  -- collide on the PK.
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'a-x305@example.test'),
    (user_b, 'b-x305@example.test');

  INSERT INTO public.screens (user_id, name, query)
    VALUES (user_a, 'A screen', 'pe > 0')
    RETURNING id INTO screen_a;

  -- As user B: SELECT must not see A's screen.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);
  SELECT count(*) INTO seen FROM public.screens WHERE id = screen_a;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-05 FAILED: user B READ user A''s screen (% rows)', seen;
  END IF;

  -- As user B: UPDATE must not touch A's screen.
  UPDATE public.screens SET name = 'stolen' WHERE id = screen_a;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-05 FAILED: user B UPDATED user A''s screen (% rows)', seen;
  END IF;

  -- As user B: DELETE must not remove A's screen.
  DELETE FROM public.screens WHERE id = screen_a;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-05 FAILED: user B DELETED user A''s screen (% rows)', seen;
  END IF;

  -- As user B: INSERT for A's user_id must be rejected (WITH CHECK).
  BEGIN
    INSERT INTO public.screens (user_id, name, query) VALUES (user_a, 'forge', 'pe > 0');
    RAISE EXCEPTION 'X3-05 FAILED: user B INSERTED a screen owned by user A';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL; -- expected: RLS WITH CHECK violation
  END;

  -- As user A: same rows ARE reachable (the policies scope, not block).
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  SELECT count(*) INTO seen FROM public.screens WHERE id = screen_a;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'X3-05 FAILED: user A cannot READ own screen (% rows)', seen;
  END IF;
  UPDATE public.screens SET query = 'pe > 1' WHERE id = screen_a;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'X3-05 FAILED: user A cannot UPDATE own screen (% rows)', seen;
  END IF;

  RESET ROLE;
END
$$;

\echo '── X3-05 invariants: all passed'
