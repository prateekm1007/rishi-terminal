-- ============================================================
-- global_spend_invariants.sql — W3 closure (founder round-10 review,
-- 2026-10-03, defect A): the reservation/settlement hard-bound proofs
-- on a REAL Postgres.
-- ============================================================
-- Runs AFTER migrations 001…N in the CI migrations job (see
-- .github/workflows/ci.yml). Every check RAISES on violation so
-- psql -v ON_ERROR_STOP=1 fails the job (Constitution 24: a check that
-- cannot fail is theatre). The concurrency storm (the true
-- multi-session proof) runs as a sibling bash step that forks parallel
-- psql sessions; this file proves the exact boundary and settlement
-- arithmetic sequentially:
--   1. reserve admits only what fits — exact boundary values;
--   2. an amount larger than the whole limit is never admitted, even
--      on a fresh key;
--   3. settlement releases over-reservations and records overages
--      without admission semantics (the ledger is honest even past the
--      cap);
--   4. reserve + settle nets to the actual usage — no double counting;
--   5. the floor at zero bounds double releases;
--   6. the composed key carries the IST day (one source of truth).
-- Probe rows are cleaned up at the end.

-- ── G1: exact admission boundary ────────────────────────────────────
DO $$
DECLARE
  r jsonb;
BEGIN
  PERFORM reserve_rate_limit('w3i:bound', 10, 100, 90000);   -- count 10
  r := reserve_rate_limit('w3i:bound', 90, 100, 90000);      -- count 100 exactly at the limit
  IF (r->>'allowed') <> 'true' OR (r->>'count') <> '100' THEN
    RAISE EXCEPTION 'G1a FAILED: exact-fit reserve must be allowed, got %', r;
  END IF;
  r := reserve_rate_limit('w3i:bound', 1, 100, 90000);       -- 101 > 100
  IF (r->>'allowed') <> 'false' THEN
    RAISE EXCEPTION 'G1b FAILED: over-limit reserve must be refused, got %', r;
  END IF;
  -- The refusal did not move the counter.
  SELECT count INTO r FROM rate_limits WHERE key LIKE 'w3i:bound:%';
  IF (r->>0)::int <> 100 THEN
    RAISE EXCEPTION 'G1c FAILED: refused reserve must not change the count, count=%', r;
  END IF;
END
$$;

-- ── G2: an amount larger than the limit is never admitted ───────────
DO $$
DECLARE
  r jsonb;
BEGIN
  r := reserve_rate_limit('w3i:huge', 500, 100, 90000);      -- fresh key, amount > limit
  IF (r->>'allowed') <> 'false' THEN
    RAISE EXCEPTION 'G2a FAILED: amount>limit must be refused on a fresh key, got %', r;
  END IF;
  -- The fresh key must not exist (no phantom row from the refusal).
  IF EXISTS (SELECT 1 FROM rate_limits WHERE key LIKE 'w3i:huge:%') THEN
    RAISE EXCEPTION 'G2b FAILED: refused fresh-key reserve must leave no row';
  END IF;
END
$$;

-- ── G3: settlement is a ledger, not an admission ────────────────────
DO $$
DECLARE
  r jsonb;
BEGIN
  -- Release an over-reservation: reserve 50, actual 20 -> settle -30.
  PERFORM reserve_rate_limit('w3i:settle', 50, 1000, 90000);
  r := settle_rate_limit('w3i:settle', -30);
  IF (r->>'count')::int <> 20 THEN
    RAISE EXCEPTION 'G3a FAILED: reserve 50 + settle -30 must net 20, got %', r;
  END IF;
  -- An overage records honestly even past the limit.
  r := settle_rate_limit('w3i:settle', 5000);
  IF (r->>'count')::int <> 5020 THEN
    RAISE EXCEPTION 'G3b FAILED: overage settlement must record 5020, got %', r;
  END IF;
  -- ... and a subsequent reserve is refused while the ledger is over.
  r := reserve_rate_limit('w3i:settle', 1, 1000, 90000);
  IF (r->>'allowed') <> 'false' THEN
    RAISE EXCEPTION 'G3c FAILED: reserve over a blown ledger must be refused, got %', r;
  END IF;
END
$$;

-- ── G4: reserve + settle nets to the actual usage (no double count) ─
DO $$
DECLARE
  r jsonb;
  c int;
BEGIN
  PERFORM reserve_rate_limit('w3i:net', 288576, 2000000, 90000);
  PERFORM settle_rate_limit('w3i:net', 1592 - 288576);
  SELECT count INTO c FROM rate_limits WHERE key LIKE 'w3i:net:%';
  IF c <> 1592 THEN
    RAISE EXCEPTION 'G4 FAILED: reserve R + settle (A-R) must net exactly A=1592, got %', c;
  END IF;
END
$$;

-- ── G5: the floor at zero bounds a double release ───────────────────
DO $$
DECLARE
  r jsonb;
BEGIN
  PERFORM reserve_rate_limit('w3i:floor', 40, 1000, 90000);
  PERFORM settle_rate_limit('w3i:floor', -40);   -- the release
  r := settle_rate_limit('w3i:floor', -40);      -- the double release
  IF (r->>'count')::int <> 0 THEN
    RAISE EXCEPTION 'G5 FAILED: double release must floor at 0, got %', r;
  END IF;
END
$$;

-- ── G6: the key carries the IST day (one source of truth) ───────────
DO $$
DECLARE
  k text;
  today text := to_char((now() AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD');
BEGIN
  PERFORM reserve_rate_limit('w3i:daykey', 1, 10, 90000);
  SELECT key INTO k FROM rate_limits WHERE key LIKE 'w3i:daykey:%';
  IF k IS DISTINCT FROM 'w3i:daykey:' || today THEN
    RAISE EXCEPTION 'G6a FAILED: composed key must be w3i:daykey:%, got %', today, k;
  END IF;
  -- G6b: cross-check the two INDEPENDENT day implementations — 008's
  -- consume_chat_quota (chat_usage.day) and 020's reserve_rate_limit key
  -- suffix must agree on the CURRENT IST day. A future edit to either
  -- side that changes the boundary fails here.
  DECLARE
    quota_day date;
  BEGIN
    quota_day := (consume_chat_quota('00000000-0000-4000-8000-000000000020'::uuid, 1) ->> 'day')::date;
    IF quota_day IS DISTINCT FROM (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
      RAISE EXCEPTION 'G6b FAILED: 008 quota day % diverges from the IST day', quota_day;
    END IF;
    IF (split_part(k, ':', 3))::date IS DISTINCT FROM quota_day THEN
      RAISE EXCEPTION 'G6c FAILED: 020 key day % diverges from 008 quota day %', split_part(k, ':', 3), quota_day;
    END IF;
  END;
  DELETE FROM chat_usage WHERE user_id = '00000000-0000-4000-8000-000000000020'::uuid;
END
$$;

-- ── cleanup: the probe rows must not outlive the proof ──────────────
DELETE FROM public.rate_limits WHERE key LIKE 'w3i:%';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM rate_limits WHERE key LIKE 'w3i:%') THEN
    RAISE EXCEPTION 'CLEANUP FAILED: w3i probe rows remain';
  END IF;
END
$$;
