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

\echo '── X3-07: portfolio imports and positions are private to their owner'
-- Behavioral proof of "RLS on all tables" for X3-07: user B cannot
-- read user A's imports or positions, cannot forge rows owned by A,
-- and the idempotency constraint (user_id, content_hash) rejects the
-- same content twice for one user.
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  imp_a uuid;
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'a-x307@example.test'),
    (user_b, 'b-x307@example.test');

  INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
    VALUES (user_a, repeat('a', 64), 'holdings-csv', 'a.csv', 1, 0)
    RETURNING id INTO imp_a;
  INSERT INTO public.portfolio_positions (user_id, import_id, symbol, quantity, avg_price)
    VALUES (user_a, imp_a, 'SBIN', 100, 550.25);

  -- As user B: no read, no update-nothing, no delete.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);

  SELECT count(*) INTO seen FROM public.portfolio_imports WHERE id = imp_a;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-07 FAILED: user B READ user A''s import (% rows)', seen;
  END IF;
  SELECT count(*) INTO seen FROM public.portfolio_positions WHERE import_id = imp_a;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-07 FAILED: user B READ user A''s positions (% rows)', seen;
  END IF;
  DELETE FROM public.portfolio_positions WHERE import_id = imp_a;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-07 FAILED: user B DELETED user A''s positions (% rows)', seen;
  END IF;
  DELETE FROM public.portfolio_imports WHERE id = imp_a;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'X3-07 FAILED: user B DELETED user A''s import (% rows)', seen;
  END IF;

  -- As user B: cannot forge rows owned by A.
  BEGIN
    INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
      VALUES (user_a, repeat('b', 64), 'holdings-csv', 'forge.csv', 0, 0);
    RAISE EXCEPTION 'X3-07 FAILED: user B INSERTED an import owned by user A';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL;
  END;
  BEGIN
    INSERT INTO public.portfolio_positions (user_id, import_id, symbol, quantity, avg_price)
      VALUES (user_a, imp_a, 'FORGE', 1, 1);
    RAISE EXCEPTION 'X3-07 FAILED: user B INSERTED a position owned by user A';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      NULL;
  END;

  -- As user A: own rows reachable (policies scope, not block).
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  SELECT count(*) INTO seen FROM public.portfolio_imports WHERE id = imp_a;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'X3-07 FAILED: user A cannot READ own import (% rows)', seen;
  END IF;

  -- Idempotency: the SAME content hash for the SAME user is rejected
  -- (unique violation). A different user MAY import the same content
  -- (switch identity first — we are still authenticated as user A).
  BEGIN
    INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
      VALUES (user_a, repeat('a', 64), 'holdings-csv', 'a-again.csv', 1, 0);
    RAISE EXCEPTION 'X3-07 FAILED: duplicate (user_id, content_hash) was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL; -- expected
  END;
  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);
  INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
    VALUES (user_b, repeat('a', 64), 'holdings-csv', 'b.csv', 1, 0);

  RESET ROLE;
END
$$;

\echo '── X3-07 invariants: all passed'

\echo '── B3: per-user row caps hold at the DATABASE (founder Round-15)'
-- Behavioral proof of the founder's acceptance: "on the Postgres harness,
-- the 51st screen insert as authenticated fails." Plus the two portfolio
-- caps (<= 20 imports per user, <= 500 positions per import), the
-- per-user scoping of the screens cap (user B is not affected by user
-- A hitting it), and the upsert nuance (saving an EXISTING name at the
-- cap must still work — that is an UPDATE, not growth).

\echo '── B3.1: screens cap (50 per user)'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'a-b3-screens@example.test'),
    (user_b, 'b-b3-screens@example.test');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  -- 50 saves land cleanly (the cap boundary itself must not reject).
  INSERT INTO public.screens (user_id, name, query)
    SELECT user_a, 'cap-' || g, 'pe > ' || g FROM generate_series(1, 50) g;
  SELECT count(*) INTO seen FROM public.screens WHERE user_id = user_a;
  IF seen <> 50 THEN
    RAISE EXCEPTION 'B3.1 FAILED: expected 50 screens for user A, found %', seen;
  END IF;

  -- The 51st (a NEW name) must FAIL with a cap violation.
  BEGIN
    INSERT INTO public.screens (user_id, name, query) VALUES (user_a, 'the-51st', 'pe > 0');
    RAISE EXCEPTION 'B3.1 FAILED: the 51st screen insert as authenticated was ACCEPTED';
  EXCEPTION
    WHEN check_violation THEN
      NULL; -- expected: the 026 cap trigger
  END;

  -- Upsert nuance: saving an EXISTING name at the cap is an UPDATE —
  -- the trigger must not brick the user's ability to edit their screens.
  UPDATE public.screens SET query = 'roe > 1' WHERE user_id = user_a AND name = 'cap-1';
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'B3.1 FAILED: same-name save at the cap did not update (% rows)', seen;
  END IF;

  -- Per-user scoping: user B is untouched by user A's 50.
  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);
  INSERT INTO public.screens (user_id, name, query) VALUES (user_b, 'b-first', 'pe > 0');
  SELECT count(*) INTO seen FROM public.screens WHERE user_id = user_b;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'B3.1 FAILED: user B insert blocked by user A''s cap (% rows)', seen;
  END IF;

  RESET ROLE;
END
$$;

\echo '── B3.2: portfolio imports cap (20 per user)'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'a-b3-imports@example.test');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
    SELECT user_a, md5(g::text) || repeat('0', 32), 'holdings-csv', 'f-' || g || '.csv', 0, 0
    FROM generate_series(1, 20) g;
  SELECT count(*) INTO seen FROM public.portfolio_imports WHERE user_id = user_a;
  IF seen <> 20 THEN
    RAISE EXCEPTION 'B3.2 FAILED: expected 20 imports for user A, found %', seen;
  END IF;

  BEGIN
    INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
      VALUES (user_a, md5('21') || repeat('0', 32), 'holdings-csv', 'f-21.csv', 0, 0);
    RAISE EXCEPTION 'B3.2 FAILED: the 21st import was ACCEPTED';
  EXCEPTION
    WHEN check_violation THEN
      NULL; -- expected: the 026 cap trigger
  END;

  RESET ROLE;
END
$$;

\echo '── B3.3: portfolio positions cap (500 per import)'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  imp uuid;
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'a-b3-positions@example.test');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
    VALUES (user_a, md5('pos') || repeat('0', 32), 'holdings-csv', 'pos.csv', 0, 0)
    RETURNING id INTO imp;

  -- 500 positions in one multi-row statement: the boundary passes, and
  -- the trigger's same-statement visibility is what trips row 501 later.
  INSERT INTO public.portfolio_positions (user_id, import_id, symbol, quantity, avg_price)
    SELECT user_a, imp, 'SYM' || g, 10, 100 FROM generate_series(1, 500) g;
  SELECT count(*) INTO seen FROM public.portfolio_positions WHERE import_id = imp;
  IF seen <> 500 THEN
    RAISE EXCEPTION 'B3.3 FAILED: expected 500 positions, found %', seen;
  END IF;

  BEGIN
    INSERT INTO public.portfolio_positions (user_id, import_id, symbol, quantity, avg_price)
      VALUES (user_a, imp, 'SYM501', 10, 100);
    RAISE EXCEPTION 'B3.3 FAILED: the 501st position was ACCEPTED';
  EXCEPTION
    WHEN check_violation THEN
      NULL; -- expected: the 026 cap trigger
  END;

  RESET ROLE;
END
$$;

\echo '── B3 invariants: all passed'

\echo '── B3.4: import deletion cascades positions; cross-user delete is a no-op'
-- The DELETE /api/portfolio/import/[id] route (B3 follow-up) rides the
-- 025 DELETE policies + the FK cascade. Behavioral proof: user A's
-- delete removes the import AND its positions in one statement; user B's
-- attempt on the same id removes nothing (RLS filters the row).
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  imp uuid;
  pos uuid;
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'a-b34-del@example.test'),
    (user_b, 'b-b34-del@example.test');

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO public.portfolio_imports (user_id, content_hash, source, filename, rows_imported, rows_rejected)
    VALUES (user_a, md5('b34') || repeat('0', 32), 'holdings-csv', 'b34.csv', 1, 0)
    RETURNING id INTO imp;
  INSERT INTO public.portfolio_positions (user_id, import_id, symbol, quantity, avg_price)
    VALUES (user_a, imp, 'SBIN', 10, 100)
    RETURNING id INTO pos;

  -- User B cannot delete user A's import (RLS: the row is invisible).
  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);
  DELETE FROM public.portfolio_imports WHERE id = imp;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'B3.4 FAILED: user B deleted user A''s import (% rows)', seen;
  END IF;

  -- User A's delete cascades the positions.
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  DELETE FROM public.portfolio_imports WHERE id = imp;
  GET DIAGNOSTICS seen = ROW_COUNT;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'B3.4 FAILED: user A''s own delete did not match (% rows)', seen;
  END IF;
  SELECT count(*) INTO seen FROM public.portfolio_positions WHERE id = pos;
  IF seen <> 0 THEN
    RAISE EXCEPTION 'B3.4 FAILED: position row survived the import delete (cascade broken)';
  END IF;

  RESET ROLE;
END
$$;

\echo '── B3.4 invariants: all passed'

\echo '── X3-08: alerts v2 — idempotent events, persistent rate limit, RLS'
-- The database-level halves of the founder's acceptance (the evaluator
-- halves are test/x3-08.alerts.test.ts):
--   * "trigger fires once across two evaluator runs" = the UNIQUE
--     (trigger_id, event_key) rejects the second insert.
--   * "rate limit enforced (persistent counter)" = the SECURITY DEFINER
--     RPC increments atomically and refuses past the cap.
--   * RLS: another user's triggers/events are invisible.
--   * The 25-trigger cap bites at the 26th insert.

\echo '── X3-08.1: the same event inserts exactly once (idempotency)'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  trig uuid;
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (user_a, 'a-x308@example.test');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);

  INSERT INTO alerts_triggers (user_id, symbol, kind, threshold)
  VALUES (user_a, 'RELIANCE', 'price_above', 2500) RETURNING id INTO trig;

  INSERT INTO alerts_events (trigger_id, user_id, event_key, observed_value, delivery_status)
  VALUES (trig, user_a, 'price_above:RELIANCE:2500:2026-10-05', 2600, 'pending');

  -- The SECOND evaluator run inserts the same key: must be rejected.
  BEGIN
    INSERT INTO alerts_events (trigger_id, user_id, event_key, observed_value, delivery_status)
    VALUES (trig, user_a, 'price_above:RELIANCE:2500:2026-10-05', 2600, 'pending');
    RAISE EXCEPTION 'X3-08.1 FAILED: the duplicate event was ACCEPTED';
  EXCEPTION
    WHEN unique_violation THEN NULL; -- expected
  END;

  SELECT count(*) INTO seen FROM alerts_events WHERE trigger_id = trig;
  IF seen <> 1 THEN
    RAISE EXCEPTION 'X3-08.1 FAILED: expected 1 event, found %', seen;
  END IF;

  RESET ROLE;
END
$$;

\echo '── X3-08.2: the rate-limit RPC counts persistently and caps (service role only)'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  allowed boolean;
  n int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (user_a, 'b-x308@example.test');

  -- The RPC is SECURITY DEFINER service-role-only: authenticated is denied.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  BEGIN
    PERFORM alerts_consume_rate_limit(user_a, '2026-10-05T05', 2);
    RAISE EXCEPTION 'X3-08.2 FAILED: authenticated could call the rate-limit RPC';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- expected (fail-closed grants)
  END;
  RESET ROLE;

  SET LOCAL ROLE service_role;
  SELECT alerts_consume_rate_limit(user_a, '2026-10-05T05', 2) INTO allowed;
  IF allowed IS NOT TRUE THEN RAISE EXCEPTION 'X3-08.2 FAILED: first delivery refused'; END IF;
  SELECT alerts_consume_rate_limit(user_a, '2026-10-05T05', 2) INTO allowed;
  IF allowed IS NOT TRUE THEN RAISE EXCEPTION 'X3-08.2 FAILED: second delivery refused'; END IF;
  -- The counter PERSISTED: the third call in the same hour is over the cap.
  SELECT alerts_consume_rate_limit(user_a, '2026-10-05T05', 2) INTO allowed;
  IF allowed IS NOT FALSE THEN RAISE EXCEPTION 'X3-08.2 FAILED: the cap did not bite'; END IF;
  -- A different hour bucket starts fresh.
  SELECT alerts_consume_rate_limit(user_a, '2026-10-05T06', 2) INTO allowed;
  IF allowed IS NOT TRUE THEN RAISE EXCEPTION 'X3-08.2 FAILED: new bucket refused'; END IF;
  SELECT delivered INTO n FROM alerts_rate_limit WHERE user_id = user_a AND hour_bucket = '2026-10-05T05';
  IF n <> 3 THEN RAISE EXCEPTION 'X3-08.2 FAILED: counter expected 3, found %', n; END IF;
  RESET ROLE;
END
$$;

\echo '── X3-08.3: alerts rows are private to their owner'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  seen int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (user_a, 'c-x308@example.test'), (user_b, 'd-x308@example.test');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  INSERT INTO alerts_triggers (user_id, symbol, kind, threshold)
  VALUES (user_a, 'TCS', 'score_below', 40);

  PERFORM set_config('request.jwt.claim.sub', user_b::text, true);
  SELECT count(*) INTO seen FROM alerts_triggers WHERE user_id = user_a;
  IF seen <> 0 THEN RAISE EXCEPTION 'X3-08.3 FAILED: user B READ user A''s triggers (%)', seen; END IF;
  BEGIN
    INSERT INTO alerts_triggers (user_id, symbol, kind, threshold)
    VALUES (user_a, 'SBIN', 'price_above', 800);
    RAISE EXCEPTION 'X3-08.3 FAILED: user B INSERTED a trigger owned by user A';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN NULL; -- RLS refused
  END;
  RESET ROLE;
END
$$;

\echo '── X3-08.4: the 25-trigger cap bites at the 26th insert'
DO $$
DECLARE
  user_a uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email) VALUES (user_a, 'e-x308@example.test');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', user_a::text, true);
  INSERT INTO alerts_triggers (user_id, symbol, kind, threshold)
  SELECT user_a, 'SYM' || g, 'price_above', 10 FROM generate_series(1, 25) g;
  BEGIN
    INSERT INTO alerts_triggers (user_id, symbol, kind, threshold)
    VALUES (user_a, 'THE26TH', 'price_above', 10);
    RAISE EXCEPTION 'X3-08.4 FAILED: the 26th trigger was ACCEPTED';
  EXCEPTION
    WHEN check_violation THEN NULL; -- the 027 cap trigger
  END;
  RESET ROLE;
END
$$;

\echo '── X3-08 invariants: all passed'

\echo '── L5-02: every public table with a user_id column is covered by the account registry'
-- The LIVE information_schema half of the enumeration (the vitest half
-- parses the migration files — test/account.delete.test.ts asserts the
-- two lists are identical). A new user_id table without coverage fails
-- BOTH gates.
DO $$
DECLARE
  missing text;
  extra text;
  L5_02_EXPECTED[] := array[
    'users','alerts','backtest_results','badges','fno_strategies','portfolios',
    'transactions','watchlist','chat_usage','screens','portfolio_imports',
    'portfolio_positions','alerts_triggers','alerts_events','alerts_rate_limit',
    'alerts_preferences'
  ];
BEGIN
  -- every real user_id table is expected
  FOR missing IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id'
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND NOT a.attisdropped
      AND c.relname <> ALL (L5_02_EXPECTED)
  LOOP
    RAISE EXCEPTION 'L5-02 FAILED: table % has a user_id column but is NOT in lib/account/coverage.ts (export/delete miss it)', missing;
  END LOOP;

  -- every expected table really exists (no stale registry entries)
  FOR extra IN
    SELECT t
    FROM unnest(L5_02_EXPECTED) AS t
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = t
    )
  LOOP
    RAISE EXCEPTION 'L5-02 FAILED: registry table % does not exist in the schema', extra;
  END LOOP;
END
$$;

\echo '── L5-02 invariants: all passed'
