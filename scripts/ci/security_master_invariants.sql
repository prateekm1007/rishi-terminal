-- ============================================================
-- security_master_invariants.sql — D1-02 acceptance assertions,
-- run by the CI "migrations" job AFTER data/security-master/
-- populate.sql. Plain-SQL twin of scripts/validateSecurityMaster.ts
-- (which runs the same checks against the live database via REST).
--
-- Every check RAISES on violation (psql -v ON_ERROR_STOP=1 fails the
-- job). Each block was verified to fail before population ran — a
-- check that cannot fail is theatre (Constitution art. 24).
--
-- The seed-coverage invariant (every STOCKS symbol mapped or
-- UNRESOLVED) lives INSIDE populate.sql as a DO block, generated with
-- the symbol list — so it runs wherever the population runs.

\echo '── D1-02.1: no live symbol claimed by two different ISINs'
DO $$
DECLARE
  dup record;
BEGIN
  FOR dup IN
    SELECT exchange, symbol, count(DISTINCT isin) AS n
    FROM public.symbol_history
    WHERE valid_to IS NULL
    GROUP BY exchange, symbol
    HAVING count(DISTINCT isin) > 1
  LOOP
    RAISE EXCEPTION 'D1-02.1 FAILED: live symbol % on % claimed by % ISINs', dup.symbol, dup.exchange, dup.n;
  END LOOP;
END
$$;

\echo '── D1-02.2: no symbol_history row points at an unknown ISIN'
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM public.symbol_history sh
  WHERE NOT EXISTS (SELECT 1 FROM public.securities s WHERE s.isin = sh.isin);
  IF n > 0 THEN
    RAISE EXCEPTION 'D1-02.2 FAILED: % symbol_history rows reference unknown ISINs', n;
  END IF;
END
$$;

\echo '── D1-02.3: no universe row points at an unknown ISIN'
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM public.universe u
  WHERE u.isin IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.securities s WHERE s.isin = u.isin);
  IF n > 0 THEN
    RAISE EXCEPTION 'D1-02.3 FAILED: % universe rows reference unknown ISINs', n;
  END IF;
END
$$;

\echo '── D1-02.4: the population actually ran (a security master of a few hundred rows means it did not)'
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM public.securities;
  -- The official NSE equity listing snapshot is ~2.6k rows; anything
  -- below 2000 means populate.sql was skipped or truncated.
  IF n < 2000 THEN
    RAISE EXCEPTION 'D1-02.4 FAILED: only % securities — data/security-master/populate.sql did not run (expected >= 2000)', n;
  END IF;
  SELECT count(*) INTO n FROM public.universe;
  IF n < 2000 THEN
    RAISE EXCEPTION 'D1-02.4 FAILED: only % universe rows — population did not run (expected >= 2000)', n;
  END IF;
END
$$;

\echo '── D1-02.5: client-facing roles hold no privileges on the security master'
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.securities', 'SELECT')
     OR has_table_privilege('anon', 'public.symbol_history', 'SELECT')
     OR has_table_privilege('anon', 'public.universe', 'SELECT') THEN
    RAISE EXCEPTION 'D1-02.5 FAILED: anon can read the security master (RLS/REVOKE regression)';
  END IF;
  IF has_table_privilege('authenticated', 'public.securities', 'SELECT')
     OR has_table_privilege('authenticated', 'public.symbol_history', 'SELECT')
     OR has_table_privilege('authenticated', 'public.universe', 'SELECT') THEN
    RAISE EXCEPTION 'D1-02.5 FAILED: authenticated can read the security master (RLS/REVOKE regression)';
  END IF;
END
$$;

\echo '── D1-02.6: unresolved universe rows carry a reason (visible honesty)'
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM public.universe
  WHERE data_quality = 'UNRESOLVED' AND (reason IS NULL OR reason = '');
  IF n > 0 THEN
    RAISE EXCEPTION 'D1-02.6 FAILED: % UNRESOLVED universe rows without a reason', n;
  END IF;
END
$$;
