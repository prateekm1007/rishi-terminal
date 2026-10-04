-- ============================================================
-- portfolio_rls_invariants.sql — X3-07 acceptance assertions for the
-- portfolio_imports / portfolio_transactions tables, run AFTER migrations
-- 001…025 are applied (see .github/workflows/ci.yml job "migrations").
--
-- Every check RAISES on violation, so psql -v ON_ERROR_STOP=1 fails the
-- CI job. Rule 24: the cross-user blocks were verified to fail against a
-- draft of migration 025 whose transaction policies were missing.

\echo '── X3-07.1: both portfolio tables exist with RLS enabled'
DO $$
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['portfolio_imports', 'portfolio_transactions'])
  LOOP
    IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = 'public' AND c.relname = tbl AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'X3-07.1 FAILED: table % missing or RLS not enabled', tbl;
    END IF;
  END LOOP;
END
$$ LANGUAGE plpgsql;

\set userA '11111111-1111-1111-1111-111111111111'
\set userB '22222222-2222-2222-2222-222222222222'

\echo '── X3-07.2: user A imports; the SAME file (same hash) does NOT double-count'
BEGIN;
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', :'userA', true);
INSERT INTO public.portfolio_imports (user_id, source_name, source_hash, rows_ok, rows_failed)
VALUES (:'userA'::uuid, 'cas.csv', 'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8', 2, 0);
INSERT INTO public.portfolio_transactions (user_id, import_id, trade_date, symbol, side, quantity, price)
SELECT :'userA'::uuid, id, '2024-01-15', 'RELIANCE', 'buy', 10, 2500.50 FROM public.portfolio_imports;
DO $$
DECLARE imports int; txs int;
BEGIN
  SELECT count(*) INTO imports FROM public.portfolio_imports;
  SELECT count(*) INTO txs FROM public.portfolio_transactions;
  IF imports <> 1 OR txs <> 1 THEN
    RAISE EXCEPTION 'X3-07.2 FAILED: imports=% transactions=% (expected 1/1)', imports, txs;
  END IF;
END
$$;
-- the UNIQUE (user_id, source_hash) index makes the duplicate insert fail
DO $$
BEGIN
  BEGIN
    INSERT INTO public.portfolio_imports (user_id, source_name, source_hash, rows_ok, rows_failed)
    VALUES (current_setting('request.jwt.claim.sub', true)::uuid, 'cas.csv', 'a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8', 2, 0);
    RAISE EXCEPTION 'X3-07.2 FAILED: duplicate source_hash was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL; -- expected
  END;
END
$$;
ROLLBACK;

\echo '── X3-07.3: user B cannot read or delete user A''s portfolio rows'
BEGIN;
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', :'userA', true);
INSERT INTO public.portfolio_imports (user_id, source_name, source_hash, rows_ok, rows_failed)
VALUES (:'userA'::uuid, 'cas.csv', 'b1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8', 1, 0);
SELECT set_config('request.jwt.claim.sub', :'userB', true);
DO $$
DECLARE imp int; txs int;
BEGIN
  SELECT count(*) INTO imp FROM public.portfolio_imports;
  SELECT count(*) INTO txs FROM public.portfolio_transactions;
  IF imp <> 0 OR txs <> 0 THEN
    RAISE EXCEPTION 'X3-07.3 FAILED: user B sees % imports / % transactions of user A', imp, txs;
  END IF;
END
$$;
DELETE FROM public.portfolio_transactions;
DELETE FROM public.portfolio_imports;
SELECT set_config('request.jwt.claim.sub', :'userA', true);
DO $$
DECLARE imp int;
BEGIN
  SELECT count(*) INTO imp FROM public.portfolio_imports;
  IF imp <> 1 THEN
    RAISE EXCEPTION 'X3-07.3 FAILED: user B''s deletes removed user A''s rows';
  END IF;
END
$$;
ROLLBACK;

\echo '── X3-07.4: anon sees nothing'
BEGIN;
SELECT set_config('role', 'anon', true);
DO $$
DECLARE imp int; txs int;
BEGIN
  SELECT count(*) INTO imp FROM public.portfolio_imports;
  SELECT count(*) INTO txs FROM public.portfolio_transactions;
  IF imp <> 0 OR txs <> 0 THEN
    RAISE EXCEPTION 'X3-07.4 FAILED: anon sees % imports / % transactions', imp, txs;
  END IF;
END
$$;
ROLLBACK;
