-- ============================================================
-- 026_user_row_caps.sql — B3 (founder Round-15): per-user row caps
-- enforced AT THE DATABASE.
--
-- The founder's audit (2026-10-04): "Saved screens and portfolio imports
-- have no per-user row cap at the database layer. On the harness, an
-- authenticated user bulk-inserted 2,000 screens (500 chars each)
-- directly with the anon-key path. The API route may limit it; the
-- database doesn't."
--
-- Caps (founder Round-15 B3, verbatim):
--   screens            <= 50 per user
--   portfolio positions <= 500 per import
--   portfolio imports   <= 20 per user
--
-- Enforcement shape: BEFORE INSERT row triggers that count the owner's
-- rows and RAISE check_violation (23514) at the limit. RLS note: the
-- count runs under the CALLING role — for the anon-key/authenticated
-- path RLS scopes the visible rows to auth.uid() = user_id anyway, and
-- the WHERE clause is explicit on the owner, so the count is correct
-- for every role (Constitution 13: assume someone will call the REST
-- API directly).
--
-- Concurrency: pg_advisory_xact_lock keyed on the owner (or import)
-- serializes same-owner inserts inside their transactions, so two
-- parallel writers cannot both pass a count of N-1. Without it the
-- trigger cap is advisory under concurrency, not exact.
--
-- Upsert nuance (screens): saving an EXISTING name is an UPDATE at the
-- application layer (upsert on (user_id, name)). The BEFORE INSERT
-- trigger fires before conflict arbitration, so it must not reject a
-- save that would REPLACE an existing row — the same-name EXISTS check
-- below lets those through, and a plain duplicate-name INSERT is still
-- rejected by the UNIQUE constraint.
-- ============================================================

-- ── screens: at most 50 per user ────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_screens_cap() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  n int;
BEGIN
  -- A save that will REPLACE an existing row is an UPDATE, not growth.
  IF EXISTS (SELECT 1 FROM public.screens WHERE user_id = NEW.user_id AND name = NEW.name) THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('screens-cap:' || NEW.user_id::text, 0));
  SELECT count(*) INTO n FROM public.screens WHERE user_id = NEW.user_id;
  IF n >= 50 THEN
    RAISE EXCEPTION 'screens cap reached: at most 50 saved screens per user (delete one first)'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER screens_cap BEFORE INSERT ON public.screens
  FOR EACH ROW EXECUTE FUNCTION enforce_screens_cap();

-- ── portfolio_imports: at most 20 per user ──────────────────────────
CREATE OR REPLACE FUNCTION enforce_portfolio_imports_cap() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('imports-cap:' || NEW.user_id::text, 0));
  SELECT count(*) INTO n FROM public.portfolio_imports WHERE user_id = NEW.user_id;
  IF n >= 20 THEN
    RAISE EXCEPTION 'imports cap reached: at most 20 portfolio imports per user (found %)', n
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER portfolio_imports_cap BEFORE INSERT ON public.portfolio_imports
  FOR EACH ROW EXECUTE FUNCTION enforce_portfolio_imports_cap();

-- ── portfolio_positions: at most 500 per import ─────────────────────
-- A multi-row INSERT trips this at row 501: rows inserted earlier in
-- the SAME statement are visible to later BEFORE-trigger invocations
-- (the command counter advances between firings).
CREATE OR REPLACE FUNCTION enforce_portfolio_positions_cap() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('positions-cap:' || NEW.import_id::text, 0));
  SELECT count(*) INTO n FROM public.portfolio_positions WHERE import_id = NEW.import_id;
  IF n >= 500 THEN
    RAISE EXCEPTION 'positions cap reached: at most 500 positions per import'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER portfolio_positions_cap BEFORE INSERT ON public.portfolio_positions
  FOR EACH ROW EXECUTE FUNCTION enforce_portfolio_positions_cap();
