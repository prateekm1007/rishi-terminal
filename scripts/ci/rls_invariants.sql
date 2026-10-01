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
