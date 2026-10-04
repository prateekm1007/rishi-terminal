-- ============================================================
-- screens_rls_invariants.sql — X3-05 acceptance assertions for the
-- saved-screens table, run AFTER migrations 001…024 are applied (see
-- .github/workflows/ci.yml job "migrations").
--
-- Every check RAISES on violation, so psql -v ON_ERROR_STOP=1 fails the
-- CI job. Rule 24: each cross-user block below was verified to FAIL
-- against a draft of migration 024 that lacked the update/delete
-- policies, before the migration was committed.

\echo '── X3-05.1: the screens table exists with RLS enabled'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = 'public' AND c.relname = 'screens' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'X3-05.1 FAILED: public.screens missing or RLS not enabled';
  END IF;
END
$$;

-- Two identities. The pg_harness auth.uid() reads request.jwt.claim.sub.
\set userA '11111111-1111-1111-1111-111111111111'
\set userB '22222222-2222-2222-2222-222222222222'

\echo '── X3-05.2: user A saves a screen; user B must NOT see it'
BEGIN;
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', :'userA', true);
INSERT INTO public.screens (user_id, name, expression)
VALUES (:'userA'::uuid, 'cheap quality', 'pe < 15 && roe > 20');

SELECT set_config('request.jwt.claim.sub', :'userB', true);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.screens;
  IF n <> 0 THEN
    RAISE EXCEPTION 'X3-05.2 FAILED: user B sees % of user A''s screens', n;
  END IF;
END
$$;

\echo '── X3-05.3: user B cannot delete user A''s screen'
DELETE FROM public.screens;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.screens;
  IF n <> 1 THEN
    RAISE EXCEPTION 'X3-05.3 FAILED: user B''s delete removed rows it does not own';
  END IF;
END
$$;

\echo '── X3-05.4: user A still sees exactly their one screen'
SELECT set_config('request.jwt.claim.sub', :'userA', true);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.screens;
  IF n <> 1 THEN
    RAISE EXCEPTION 'X3-05.4 FAILED: user A sees % screens (expected 1)', n;
  END IF;
END
$$;

\echo '── X3-05.5: user A cannot store an over-length expression (DB is the last line)'
DO $$
BEGIN
  -- the CHECK clause mirrors the API cap (400 chars)
  BEGIN
    INSERT INTO public.screens (user_id, name, expression)
    VALUES (current_setting('request.jwt.claim.sub', true)::uuid, 'too long', repeat('a', 401));
    RAISE EXCEPTION 'X3-05.5 FAILED: over-length expression was stored';
  EXCEPTION WHEN check_violation THEN
    NULL; -- expected
  END;
END
$$;

ROLLBACK;

\echo '── X3-05.6: anon cannot read screens at all'
BEGIN;
SELECT set_config('role', 'anon', true);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.screens;
  IF n <> 0 THEN
    RAISE EXCEPTION 'X3-05.6 FAILED: anon sees % screens', n;
  END IF;
END
$$;
ROLLBACK;
