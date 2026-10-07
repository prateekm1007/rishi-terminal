-- ============================================================
-- account_erasure_invariants.sql — G1 (founder round 23): the LIVE
-- account-deletion proof on a real Postgres.
-- ============================================================
-- Runs AFTER pg_harness.sql + migrations 001…NN inside the CI
-- "migrations" job (see .github/workflows/ci.yml). psql runs with
-- ON_ERROR_STOP=1, so every RAISE EXCEPTION fails the job.
--
-- Founder acceptance, verbatim: "Build one isolated CI Postgres test
-- that creates a disposable test user, inserts one row into every
-- table in the canonical user-data coverage registry, deletes that
-- user through the same supported deletion mechanism, and asserts
-- zero rows remain. Include chat_usage explicitly. Include the ugly
-- paths: missing row, repeated delete, rollback/failure, and
-- unauthorized deletion attempt where practical."
--
-- The supported deletion mechanism (app/api/account/delete/route.ts)
-- is service.auth.admin.deleteUser(user.id) — GoTrue removes the
-- auth.users row, and the FK cascade chain empties every covered
-- table. The SQL-level equivalent of that mechanism is exactly
--   DELETE FROM auth.users WHERE id = <uuid>;
-- which is what this test executes. No production data is touched:
-- every uuid here is generated inside this file and removed by it.
--
-- Why a live test at all (the gate this file adds):
--   test/account.delete.test.ts proves the registry/migration TEXT
--   agrees with itself; this file proves the DELETING BEHAVIOR on the
--   schema the migrations actually produce. Migration 015 dropped
--   chat_usage's FK (anonymous quota identities cannot satisfy it) —
--   the static test still passed vacuously because its regex saw
--   005's original CREATE clause, while account deletion silently
--   stopped erasing chat_usage. Only a live deletion catches that
--   class of defect. Fixed by migration 028 (trigger sweep); this
--   test is the permanent guard.
--
-- One authoritative deletion invariant (no hand-maintained table
-- list in this file): the swept table set is DERIVED from the live
-- information_schema (every public table with a user_id column,
-- exactly the L5-02 derivation). A new user-owned table must be
-- seeded below (the pre-deletion positive control fails otherwise)
-- and must actually empty on deletion (the post-deletion sweep fails
-- otherwise). lib/account/coverage.ts remains the single registry.
-- ============================================================

\echo '── G1: live account erasure — seed, ugly paths, delete, assert zero'

DO $$
DECLARE
  -- The disposable account under test.
  v_uid       uuid := gen_random_uuid();
  -- A second account whose data must survive every unauthorized attempt.
  v_victim    uuid := gen_random_uuid();
  -- The authenticated attacker (signed-in as themselves).
  v_attacker  uuid := gen_random_uuid();
  v_portfolio uuid;
  v_import    uuid;
  v_trigger   uuid;
  t           text;
  n           int;
BEGIN
  -- ── 1. Create the disposable account ──────────────────────────
  -- INSERT into auth.users is the supported sign-up path; migration
  -- 002's handle_new_user trigger creates the public.users row (the
  -- registry's `users` entry — inserting there directly would collide
  -- on the PK).
  INSERT INTO auth.users (id, email) VALUES
    (v_uid,      'g1-erasure@example.test'),
    (v_victim,   'g1-victim@example.test'),
    (v_attacker, 'g1-attacker@example.test');

  -- ── 2. One row in EVERY registry table ─────────────────────────
  INSERT INTO public.portfolios (user_id, name) VALUES (v_uid, 'G1 portfolio')
    RETURNING id INTO v_portfolio;
  -- holdings is user data transitively (portfolio-scoped, no user_id
  -- column, therefore outside the registry enumeration) — seeded and
  -- asserted here as well, labelled as the transitive case.
  INSERT INTO public.holdings (portfolio_id, symbol, shares, avg_price)
    VALUES (v_portfolio, 'RELIANCE', 1, 1);
  INSERT INTO public.watchlist (user_id, symbol) VALUES (v_uid, 'RELIANCE');
  INSERT INTO public.alerts (user_id, symbol, alert_type, condition_value)
    VALUES (v_uid, 'RELIANCE', 'price_above', 1);
  INSERT INTO public.fno_strategies (user_id, name, underlying_symbol, strategy_type, legs)
    VALUES (v_uid, 'G1 strategy', 'NIFTY', 'custom', '[]'::jsonb);
  INSERT INTO public.backtest_results
    (user_id, symbol, start_date, end_date, total_return, total_trades, results_data)
    VALUES (v_uid, 'RELIANCE', '2026-01-01', '2026-01-02', 0, 0, '{}'::jsonb);
  INSERT INTO public.badges (user_id, badge_id) VALUES (v_uid, 'g1-badge');
  INSERT INTO public.transactions (user_id, amount, status, tier_purchased)
    VALUES (v_uid, 100, 'created', 'seeker');
  -- chat_usage: the founder asked for it EXPLICITLY (015 removed its
  -- FK for anonymous quota identities; 028 restored erasure via the
  -- users delete trigger — this row is the live proof of that fix).
  INSERT INTO public.chat_usage (user_id, day, count)
    VALUES (v_uid, CURRENT_DATE, 1);
  INSERT INTO public.screens (user_id, name, query) VALUES (v_uid, 'G1 screen', 'pe > 0');
  INSERT INTO public.portfolio_imports
    (user_id, content_hash, source, filename, rows_imported, rows_rejected)
    VALUES (v_uid, repeat('a1b2c3d4', 8), 'holdings-csv', 'g1.csv', 1, 0)
    RETURNING id INTO v_import;
  INSERT INTO public.portfolio_positions
    (user_id, import_id, symbol, quantity, avg_price)
    VALUES (v_uid, v_import, 'RELIANCE', 1, 1);
  INSERT INTO public.alerts_triggers (user_id, symbol, kind, threshold)
    VALUES (v_uid, 'RELIANCE', 'price_above', 1)
    RETURNING id INTO v_trigger;
  INSERT INTO public.alerts_events
    (trigger_id, user_id, event_key, observed_value, delivery_status)
    VALUES (v_trigger, v_uid, 'g1:event:1', 1, 'pending');
  INSERT INTO public.alerts_rate_limit (user_id, hour_bucket, delivered)
    VALUES (v_uid, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24'), 1);
  INSERT INTO public.alerts_preferences (user_id) VALUES (v_uid);
  -- Victim-owned rows the attacker will try to delete.
  INSERT INTO public.watchlist (user_id, symbol) VALUES (v_victim, 'SBIN');
  INSERT INTO public.screens (user_id, name, query) VALUES (v_victim, 'Victim screen', 'pe > 1');

  -- ── 3. Pre-deletion positive controls (no vacuous pass) ────────
  SELECT count(*) INTO n FROM public.users WHERE id = v_uid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: public.users row for the test account was not created by the sign-up trigger (found %)', n;
  END IF;
  SELECT count(*) INTO n FROM public.chat_usage WHERE user_id = v_uid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: chat_usage row not seeded (found %)', n;
  END IF;
  -- Every live user_id table must hold at least one row for the test
  -- account, otherwise the post-deletion sweep below would pass
  -- vacuously for that table (Constitution C10: a zero-count
  -- assertion needs a positive control).
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id'
    WHERE nsp.nspname = 'public' AND c.relkind = 'r' AND NOT a.attisdropped
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', t) INTO n USING v_uid;
    IF n < 1 THEN
      RAISE EXCEPTION 'G1 FAILED: user-data table % holds no seeded row — seed it in this test or the erasure sweep passes vacuously', t;
    END IF;
  END LOOP;

  -- ── 4. Ugly path: unauthorized deletion attempts ───────────────
  -- The attacker is a fully signed-in authenticated user (harness
  -- GoTrue stand-in: SET LOCAL ROLE + request.jwt.claim.sub).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_attacker::text, true);

  -- (a) The auth.users root itself must be unreachable (no grants on
  -- the auth schema for client roles — fail closed, Constitution C2).
  BEGIN
    DELETE FROM auth.users WHERE id = v_victim;
    RAISE EXCEPTION 'G1 FAILED: an authenticated role DELETED an auth user — the erasure root is not closed';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- expected: permission denied
  END;

  -- (b) Cross-user deletes through public tables: RLS must scope the
  -- attacker to their own rows (zero rows affected, no error).
  DELETE FROM public.users WHERE id = v_victim;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: authenticated role deleted a public.users row (% rows) — users has no DELETE policy', n;
  END IF;
  DELETE FROM public.watchlist WHERE user_id = v_victim;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: authenticated role deleted another user''s watchlist rows (% rows)', n;
  END IF;
  DELETE FROM public.screens WHERE user_id = v_victim;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: authenticated role deleted another user''s screens rows (% rows)', n;
  END IF;

  -- (c) The anon role must not reach the erasure root either.
  SET LOCAL ROLE anon;
  BEGIN
    DELETE FROM auth.users WHERE id = v_victim;
    RAISE EXCEPTION 'G1 FAILED: the anon role DELETED an auth user';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- expected
  END;
  RESET ROLE;

  -- The victim lost nothing (checked as superuser — the attacker's
  -- RLS view legitimately hides the victim's rows).
  SELECT count(*) INTO n FROM public.users WHERE id = v_victim;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: victim''s public.users row disappeared without authorization (found %)', n;
  END IF;
  SELECT count(*) INTO n FROM public.watchlist WHERE user_id = v_victim;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: victim''s watchlist row disappeared without authorization (found %)', n;
  END IF;
  SELECT count(*) INTO n FROM public.screens WHERE user_id = v_victim;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: victim''s screens row disappeared without authorization (found %)', n;
  END IF;

  -- ── 5. Ugly path: rollback/failure must be atomic ──────────────
  -- Sabotage the cascade chain (a BEFORE DELETE trigger that raises,
  -- standing in for any mid-deletion failure) and prove the whole
  -- deletion rolls back: no partial erasure, retry-safe (C3).
  CREATE OR REPLACE FUNCTION public.g1_sabotage_cascade()
  RETURNS trigger LANGUAGE plpgsql AS $sab$
  BEGIN
    RAISE EXCEPTION 'g1 sabotage: simulated mid-cascade failure';
  END
  $sab$;
  CREATE TRIGGER g1_sabotage
    BEFORE DELETE ON public.portfolios
    FOR EACH ROW EXECUTE FUNCTION public.g1_sabotage_cascade();

  BEGIN
    DELETE FROM auth.users WHERE id = v_uid;
    RAISE EXCEPTION 'G1 FAILED: the deletion SUCCEEDED under the sabotage trigger — the failure path was not exercised';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('g1 sabotage' in SQLERRM) = 0 THEN
        RAISE; -- an unexpected error: surface it, do not swallow it
      END IF;
  END;

  DROP TRIGGER g1_sabotage ON public.portfolios;
  DROP FUNCTION public.g1_sabotage_cascade();

  -- Everything survived the failed deletion (atomicity).
  SELECT count(*) INTO n FROM auth.users WHERE id = v_uid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: auth.users row vanished during a ROLLED-BACK deletion (found %)', n;
  END IF;
  SELECT count(*) INTO n FROM public.users WHERE id = v_uid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: public.users row vanished during a ROLLED-BACK deletion (found %)', n;
  END IF;
  SELECT count(*) INTO n FROM public.chat_usage WHERE user_id = v_uid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: chat_usage row vanished during a ROLLED-BACK deletion (found %)', n;
  END IF;
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id'
    WHERE nsp.nspname = 'public' AND c.relkind = 'r' AND NOT a.attisdropped
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', t) INTO n USING v_uid;
    IF n < 1 THEN
      RAISE EXCEPTION 'G1 FAILED: user-data table % lost rows during a ROLLED-BACK deletion (found %)', t, n;
    END IF;
  END LOOP;

  -- ── 6. THE DELETION (the supported mechanism's cascade root) ──
  DELETE FROM auth.users WHERE id = v_uid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 FAILED: the deletion of the test account affected % rows (expected 1)', n;
  END IF;

  -- ── 7. Zero rows remain ────────────────────────────────────────
  SELECT count(*) INTO n FROM auth.users WHERE id = v_uid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: auth.users still holds the deleted account (% rows)', n;
  END IF;
  SELECT count(*) INTO n FROM public.users WHERE id = v_uid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: public.users still holds the deleted account (% rows)', n;
  END IF;
  -- chat_usage, explicitly (founder requirement — the 015/028 defect
  -- class this test exists to guard).
  SELECT count(*) INTO n FROM public.chat_usage WHERE user_id = v_uid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: chat_usage still holds % row(s) for the deleted account (015 dropped the FK; the 028 trigger sweep must erase it)', n;
  END IF;
  -- The transitive case.
  SELECT count(*) INTO n FROM public.holdings WHERE portfolio_id = v_portfolio;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: holdings still holds % row(s) for the deleted account''s portfolio', n;
  END IF;
  -- The authoritative sweep: EVERY live user_id table is empty for
  -- the deleted account. A future user-owned table that does not
  -- cascade fails HERE (and its seeding fails section 3) — this is
  -- the mechanically-enforced coverage invariant, live half.
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id'
    WHERE nsp.nspname = 'public' AND c.relkind = 'r' AND NOT a.attisdropped
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', t) INTO n USING v_uid;
    IF n <> 0 THEN
      RAISE EXCEPTION 'G1 FAILED: user-data table % still holds % row(s) for the deleted account — erasure is incomplete', t, n;
    END IF;
  END LOOP;

  -- ── 8. Ugly path: missing row ──────────────────────────────────
  DELETE FROM auth.users WHERE id = gen_random_uuid();
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: deleting a non-existent account affected % rows (expected 0)', n;
  END IF;

  -- ── 9. Ugly path: repeated delete ──────────────────────────────
  DELETE FROM auth.users WHERE id = v_uid;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: repeated deletion affected % rows (expected 0 — the account is already gone)', n;
  END IF;
  SELECT count(*) INTO n FROM public.chat_usage WHERE user_id = v_uid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'G1 FAILED: chat_usage reappeared after the repeated delete (% rows)', n;
  END IF;

  -- ── 10. Cleanup (the test leaves nothing behind) ───────────────
  DELETE FROM auth.users WHERE id IN (v_victim, v_attacker);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN
    RAISE EXCEPTION 'G1 FAILED: cleanup deleted % account(s) (expected 2)', n;
  END IF;
END
$$;

\echo '── G1 invariants: all passed'
