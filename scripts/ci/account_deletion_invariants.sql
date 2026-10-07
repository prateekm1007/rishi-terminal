-- ============================================================
-- account_deletion_invariants.sql — G1 (founder Round-22): the LIVE
-- CI Postgres account-erasure test.
-- ============================================================
-- Founder acceptance: create a disposable test user, insert one row
-- into EVERY table in the canonical user-data coverage registry
-- (lib/account/coverage.ts — chat_usage explicitly included), delete
-- that user through the SAME supported deletion mechanism the delete
-- route uses, and assert ZERO rows remain.
--
-- Deletion mechanism: /api/account/delete calls
-- service.auth.admin.deleteUser(id) — GoTrue removes the auth.users
-- row and every user-data table empties through its ON DELETE CASCADE
-- chain. This test performs the same database-level operation:
--   DELETE FROM auth.users WHERE id = <user>
-- (the pg_harness auth.users stub stands in for GoTrue; the 002
-- trigger on_auth_user_created stands in for first sign-in).
--
-- Mechanical completeness (Constitution 14 — no second coverage list):
--   * BEFORE deletion, EVERY public table that information_schema
--     reports with a user_id column must hold a fixture row. A new
--     user-owned table that skipped the registry (caught by
--     rls_invariants.sql L5-02, which runs before this file) or this
--     fixture sweep fails here.
--   * AFTER deletion, the same information_schema sweep must report
--     zero rows for the erased user.
--   * test/account.delete.test.ts pins this file to the CI workflow
--     and requires every registry table to appear in it.
--
-- Ugly paths (founder G1): a user with no data rows deletes cleanly;
-- a repeated delete is a no-op; a BEGIN/ROLLBACK pair proves the
-- erase is transactional and reversible; an `authenticated` session
-- (user B) cannot erase user A's rows by direct DML (RLS decides,
-- Constitution 13).
--
-- CI: psql -v ON_ERROR_STOP=1 -f (statement-at-a-time semantics —
-- the explicit BEGIN/ROLLBACK blocks below rely on it). Order: after
-- rls_invariants.sql.
-- ============================================================

-- ── 0. Idempotent pre-clean (local re-runs; CI DB is fresh) ────
DELETE FROM auth.users WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

-- ── 1. Fixtures: one row in EVERY registry table for user A ────
-- aaaaaaaaaaaa-… = the erasure subject. The auth stub insert fires
-- on_auth_user_created (the production first-sign-in path), so the
-- public.users row exists; the explicit insert below is idempotent.
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ci-erasure-a@example.com');
INSERT INTO public.users (id, email, name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ci-erasure-a@example.com', 'CI Erasure A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO portfolios (id, user_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
-- Transitive-cascade control: holdings has NO user_id column (it rides
-- portfolios) — a real deletion must empty it too. It is deliberately
-- NOT a registry change; the registry stays the single source of truth.
INSERT INTO holdings (portfolio_id, symbol, shares, avg_price)
VALUES ('11111111-1111-1111-1111-111111111111', 'RELIANCE', 1, 1);

INSERT INTO watchlist (user_id, symbol)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RELIANCE');
INSERT INTO alerts (user_id, symbol, alert_type, condition_value)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RELIANCE', 'price_above', 1);
INSERT INTO fno_strategies (user_id, name, underlying_symbol, strategy_type, legs)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ci-strategy', 'BANKNIFTY', 'long_call', '[]'::jsonb);
INSERT INTO backtest_results (user_id, symbol, start_date, end_date, total_return, total_trades, results_data)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RELIANCE', DATE '2024-01-01', DATE '2024-12-31', 0, 0, '{}'::jsonb);
INSERT INTO badges (user_id, badge_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ci-badge');
INSERT INTO transactions (user_id, amount, status, tier_purchased)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100, 'created', 'student');
-- chat_usage: the cascade-via-auth-users class (FK direct to
-- auth.users), included EXPLICITLY per the founder's G1 direction.
INSERT INTO chat_usage (user_id, day, count)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', DATE '2026-10-07', 1);
INSERT INTO screens (user_id, name, query)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ci-screen', 'market_cap > 1000');
INSERT INTO portfolio_imports (id, user_id, content_hash, source, filename, rows_imported, rows_rejected)
VALUES ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        repeat('0', 64), 'holdings-csv', 'ci-fixture.csv', 1, 0);
INSERT INTO portfolio_positions (user_id, import_id, symbol, quantity, avg_price)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'RELIANCE', 1, 1);
INSERT INTO alerts_triggers (id, user_id, symbol, kind, threshold)
VALUES ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RELIANCE', 'price_above', 1);
INSERT INTO alerts_events (trigger_id, user_id, event_key, observed_value, delivery_status)
VALUES ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ci:event:0001', 1, 'pending');
INSERT INTO alerts_rate_limit (user_id, hour_bucket, delivered)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-07T03', 1);
INSERT INTO alerts_preferences (user_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ── 2. Positive control BEFORE deletion (B-18: a zero assertion
--       without a proven non-zero before it is vacuous) ──────────
DO $$
DECLARE
  n int;
  t record;
BEGIN
  SELECT count(*) INTO n FROM auth.users  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF n <> 1 THEN RAISE EXCEPTION 'FIXTURE GAP: auth.users fixture missing (% rows)', n; END IF;
  SELECT count(*) INTO n FROM public.users WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF n <> 1 THEN RAISE EXCEPTION 'FIXTURE GAP: users fixture missing (% rows)', n; END IF;
  SELECT count(*) INTO n FROM holdings WHERE portfolio_id = '11111111-1111-1111-1111-111111111111';
  IF n <> 1 THEN RAISE EXCEPTION 'FIXTURE GAP: holdings transitive control missing (% rows)', n; END IF;
  -- Mechanical completeness: EVERY live user_id table must hold the
  -- fixture row. A user-owned table absent from the fixtures fails
  -- HERE (the registry-equality net itself is rls_invariants L5-02).
  FOR t IN
    SELECT DISTINCT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'user_id'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', t.table_name)
      INTO n USING 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
    IF n < 1 THEN
      RAISE EXCEPTION 'FIXTURE GAP: user-owned table % has no fixture row for the erasure subject', t.table_name;
    END IF;
  END LOOP;
END $$;

-- ── 3. Ugly path: rollback/failure (user D) — a rolled-back ERASE
--       must leave the committed account and its data fully intact
--       (C3: a failure midway leaves a state a retry can complete).
--       D's fixtures are COMMITTED first; only the erase runs inside
--       the aborted transaction.
INSERT INTO auth.users (id, email)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ci-erasure-d@example.com');
INSERT INTO watchlist (user_id, symbol)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'RELIANCE');
BEGIN;
  DELETE FROM auth.users WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  -- Inside the transaction the cascade has already applied:
  DO $$
  DECLARE n int;
  BEGIN
    SELECT count(*) INTO n FROM watchlist WHERE user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    IF n <> 0 THEN RAISE EXCEPTION 'CASCADE DID NOT APPLY IN-TXN: watchlist still holds % rows', n; END IF;
  END $$;
ROLLBACK;
-- After the rollback the erase is fully undone — the account and its
-- data must be intact (this is what makes the erase retry-safe):
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM auth.users WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  IF n <> 1 THEN RAISE EXCEPTION 'ROLLBACK PROOF FAILED: auth.users row not restored (% rows)', n; END IF;
  SELECT count(*) INTO n FROM public.users WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  IF n <> 1 THEN RAISE EXCEPTION 'ROLLBACK PROOF FAILED: users row not restored (% rows)', n; END IF;
  SELECT count(*) INTO n FROM watchlist WHERE user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  IF n <> 1 THEN RAISE EXCEPTION 'ROLLBACK PROOF FAILED: watchlist row not restored (% rows)', n; END IF;
END $$;
-- Real cleanup of D (and one more live erase demonstration):
DELETE FROM auth.users WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM watchlist WHERE user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  IF n <> 0 THEN RAISE EXCEPTION 'ERASE FAILED: watchlist still holds % rows for the deleted user', n; END IF;
END $$;

-- ── 4. Ugly path: user with NO data rows + repeated delete (C) ──
INSERT INTO auth.users (id, email)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ci-erasure-c@example.com');
-- C owns no rows in any user-data table; the erase must still succeed.
DELETE FROM auth.users WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.users WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  IF n <> 0 THEN RAISE EXCEPTION 'ERASE FAILED: users still holds % rows for the empty user', n; END IF;
  -- The REPEATED delete is a no-op: 0 rows affected, no error.
  DELETE FROM auth.users WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'REPEATED DELETE NOT A NO-OP: % rows affected', n; END IF;
END $$;

-- ── 5. Ugly path: an authenticated session cannot erase another
--       user's rows by direct DML (RLS is the guard, C2/C13) ─────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  DO $$
  DECLARE n int;
  BEGIN
    DELETE FROM portfolios WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN
      RAISE EXCEPTION 'UNAUTHORIZED ERASE ALLOWED: authenticated session deleted % portfolio rows of another user', n;
    END IF;
    DELETE FROM watchlist WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN
      RAISE EXCEPTION 'UNAUTHORIZED ERASE ALLOWED: authenticated session deleted % watchlist rows of another user', n;
    END IF;
    DELETE FROM chat_usage WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN
      RAISE EXCEPTION 'UNAUTHORIZED ERASE ALLOWED: authenticated session deleted % chat_usage rows of another user', n;
    END IF;
  END $$;
ROLLBACK;

-- ── 6. THE ERASE: delete the auth user (the supported deletion
--       mechanism) and assert ZERO rows remain anywhere ──────────
DELETE FROM auth.users WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DO $$
DECLARE
  n int;
  t record;
BEGIN
  SELECT count(*) INTO n FROM auth.users  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF n <> 0 THEN RAISE EXCEPTION 'ERASE FAILED: auth.users still holds the deleted user (% rows)', n; END IF;
  SELECT count(*) INTO n FROM public.users WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF n <> 0 THEN RAISE EXCEPTION 'ERASE FAILED: users still holds % rows', n; END IF;
  -- The transitive control: holdings (no user_id column) must be empty
  -- through the portfolios chain.
  SELECT count(*) INTO n FROM holdings WHERE portfolio_id = '11111111-1111-1111-1111-111111111111';
  IF n <> 0 THEN RAISE EXCEPTION 'ERASE FAILED: holdings (transitive) still holds % rows', n; END IF;
  -- The LIVE mechanical sweep: every public user_id table reports zero
  -- rows for the erased user.
  FOR t IN
    SELECT DISTINCT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'user_id'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', t.table_name)
      INTO n USING 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
    IF n <> 0 THEN
      RAISE EXCEPTION 'ERASE FAILED: table % still holds % row(s) of the deleted user', t.table_name, n;
    END IF;
  END LOOP;
  -- The repeated erase of A is a no-op too.
  DELETE FROM auth.users WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'REPEATED DELETE NOT A NO-OP: % rows affected', n; END IF;
END $$;

-- ── 7. The attacker (B) leaves no trace either ─────────────────
DELETE FROM auth.users WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.users WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF n <> 0 THEN RAISE EXCEPTION 'ERASE FAILED: attacker users row still present (% rows)', n; END IF;
END $$;

SELECT 'account_deletion_invariants: PASSED — auth-user erase leaves zero rows in every registry table (chat_usage explicit), holdings transitive, all ugly paths honest' AS result;
