-- ============================================================
-- chat_global_spend_invariants.sql — W3 closure (founder round 11):
-- the global chat spend reservation is a HARD cap with ONE IST day
-- boundary computed in SQL, and it is service-role-only.
-- ============================================================
-- Runs AFTER migrations 001…N in the CI migrations job (see
-- .github/workflows/ci.yml job "migrations"). Every check RAISES on
-- violation so psql -v ON_ERROR_STOP=1 fails the job. A check that
-- cannot fail is theatre (Constitution 24): W3.2 was verified to FAIL
-- with the guard removed (unconditional increment), W3.5 to FAIL when
-- anon EXECUTE is granted back (the bite run in the PR evidence).
--
-- Scope: chat_global_spend + its two RPCs (migration 020).

-- ── W3.1 catalog: the two RPCs exist and are SECURITY DEFINER with no
--      client-facing EXECUTE (the 018/V1 rule, mechanical scan) ──
DO $$
DECLARE
  fn record;
  offenders text;
  present int;
BEGIN
  offenders := '';
  FOR fn IN
    SELECT p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN ('reserve_chat_global_spend', 'settle_chat_global_tokens')
  LOOP
    IF has_function_privilege('anon', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s(%s) [anon] ', fn.proname, fn.args);
    END IF;
    IF has_function_privilege('authenticated', fn.oid, 'EXECUTE') THEN
      offenders := offenders || format('%s(%s) [authenticated] ', fn.proname, fn.args);
    END IF;
  END LOOP;
  SELECT count(*) INTO present FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('reserve_chat_global_spend', 'settle_chat_global_tokens');
  IF present < 2 THEN
    RAISE EXCEPTION 'W3.1 FAILED: migration 020 RPCs missing (found % of 2)', present;
  END IF;
  IF offenders <> '' THEN
    RAISE EXCEPTION 'W3.1 FAILED: anon/authenticated can EXECUTE global spend RPC(s): %', offenders;
  END IF;
END
$$;

-- ── W3.2 behavioral: the reservation is a HARD cap. Sequential shaped
--      like concurrent admissions: once the counter plus the increment
--      would exceed the cap, the reserve REFUSES and writes NOTHING. ──
DO $$
DECLARE
  r jsonb;
  tokens bigint;
  requests integer;
BEGIN
  SET LOCAL ROLE service_role;
  -- cap: 3 requests, 1000 tokens; reserve 600 tokens per admission.
  r := reserve_chat_global_spend(1, 3, 600, 1000);
  IF (r->>'ok') <> 'true' THEN RAISE EXCEPTION 'W3.2 FAILED: first reservation refused: %', r; END IF;
  r := reserve_chat_global_spend(1, 3, 600, 1000);
  IF (r->>'ok') = 'true' THEN
    RAISE EXCEPTION 'W3.2 FAILED: the guarded reserve admitted 1200 against a 1000 cap — the cap is not hard';
  END IF;
  -- the refused reservation must NOT have written anything:
  SELECT g.tokens, g.requests INTO tokens, requests FROM chat_global_spend g;
  IF tokens <> 600 OR requests <> 1 THEN
    RAISE EXCEPTION 'W3.2 FAILED: refused reservation mutated the counter (tokens=%, requests=%)', tokens, requests;
  END IF;
  -- a smaller increment that still fits is admitted:
  r := reserve_chat_global_spend(1, 3, 400, 1000);
  IF (r->>'ok') <> 'true' THEN RAISE EXCEPTION 'W3.2 FAILED: fitting reservation refused: %', r; END IF;
  SELECT g.tokens INTO tokens FROM chat_global_spend g;
  IF tokens <> 1000 THEN RAISE EXCEPTION 'W3.2 FAILED: counter = %, expected exactly 1000', tokens; END IF;
  -- the request cap guard bites independently:
  r := reserve_chat_global_spend(1, 3, 1, 1000);
  IF (r->>'ok') = 'true' THEN
    RAISE EXCEPTION 'W3.2 FAILED: the request cap did not bite (4th request admitted against cap 3)';
  END IF;
  RESET ROLE;
END
$$;

-- ── W3.3 behavioral: settlement is exact — reservation subtracted,
--      actual added, floored at 0 (no double counting, no leak) ──
DO $$
DECLARE
  r jsonb;
  tokens bigint;
BEGIN
  SET LOCAL ROLE service_role;
  -- start clean for this probe
  DELETE FROM chat_global_spend;
  r := reserve_chat_global_spend(1, 3, 600, 100000);
  IF (r->>'ok') <> 'true' THEN RAISE EXCEPTION 'W3.3 FAILED: setup reservation refused: %', r; END IF;
  r := settle_chat_global_tokens(600, 137);
  IF (r->>'ok') <> 'true' OR (r->>'settled') <> 'true' THEN
    RAISE EXCEPTION 'W3.3 FAILED: settlement refused: %', r;
  END IF;
  SELECT g.tokens INTO tokens FROM chat_global_spend g;
  IF tokens <> 137 THEN
    RAISE EXCEPTION 'W3.3 FAILED: settled counter = %, expected exactly 137 (reserved - reserved + actual)', tokens;
  END IF;
  -- settling a reservation for a request whose row is gone (day rolled)
  -- is a documented no-op, not an error:
  DELETE FROM chat_global_spend;
  r := settle_chat_global_tokens(600, 137);
  IF (r->>'ok') <> 'true' OR (r->>'settled') <> 'false' THEN
    RAISE EXCEPTION 'W3.3 FAILED: a day-rolled settlement must be a no-op ok:true settled:false, got %', r;
  END IF;
  RESET ROLE;
END
$$;

-- ── W3.4 behavioral: the day is computed in SQL (IST) — the row written
--      by the RPC lands on TODAY's Asia/Kolkata date ──
DO $$
DECLARE
  stored_day date;
  r jsonb;
BEGIN
  SET LOCAL ROLE service_role;
  DELETE FROM chat_global_spend;
  r := reserve_chat_global_spend(1, 3, 1, 100000);
  IF (r->>'ok') <> 'true' THEN RAISE EXCEPTION 'W3.4 FAILED: reservation refused: %', r; END IF;
  SELECT day INTO stored_day FROM chat_global_spend;
  IF stored_day IS DISTINCT FROM (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
    RAISE EXCEPTION 'W3.4 FAILED: counter row dated %, not the IST today', stored_day;
  END IF;
  RESET ROLE;
END
$$;

-- ── W3.5 behavioral: invalid inputs write NOTHING (rule 9), and anon
--      is permission-denied on both RPCs ──
DO $$
DECLARE
  r jsonb;
  rows int;
BEGIN
  SET LOCAL ROLE service_role;
  DELETE FROM chat_global_spend;
  r := reserve_chat_global_spend(-1, 3, 1, 100000);
  IF (r->>'ok') = 'true' THEN RAISE EXCEPTION 'W3.5 FAILED: negative request increment admitted'; END IF;
  r := reserve_chat_global_spend(1, 3, NULL, 100000);
  IF (r->>'ok') = 'true' THEN RAISE EXCEPTION 'W3.5 FAILED: NULL token increment admitted'; END IF;
  r := reserve_chat_global_spend(1, 0, 1, 100000);
  IF (r->>'ok') = 'true' THEN RAISE EXCEPTION 'W3.5 FAILED: zero request cap admitted'; END IF;
  r := settle_chat_global_tokens(-5, 1);
  IF (r->>'ok') = 'true' THEN RAISE EXCEPTION 'W3.5 FAILED: negative settlement admitted'; END IF;
  SELECT count(*) INTO rows FROM chat_global_spend;
  IF rows <> 0 THEN
    RAISE EXCEPTION 'W3.5 FAILED: invalid reservations wrote % row(s)', rows;
  END IF;
  RESET ROLE;

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM reserve_chat_global_spend(1, 3, 1, 100000);
    RAISE EXCEPTION 'W3.5 FAILED: anon reserved global spend';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- expected (020 grants)
  END;
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM settle_chat_global_tokens(1, 1);
    RAISE EXCEPTION 'W3.5 FAILED: anon settled global spend';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL; -- expected
  END;
END
$$;

-- ── W3.6 cleanup: leave a clean table for any later probe ──
DELETE FROM chat_global_spend;
