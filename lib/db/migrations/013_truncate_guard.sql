-- ============================================================
-- 013 — TRUNCATE GUARD (audit round 4, Q1)
-- ============================================================
-- Hole (Q1): row-level triggers do not fire on TRUNCATE, and row-level
-- security never applies to TRUNCATE either. The append-only guard on
-- rishi_snapshots (010) therefore did nothing against `TRUNCATE`, and
-- every Supabase role held the privilege through the default
-- `GRANT ALL` Supabase provisions on new tables.
--
-- Reproduced on the Postgres 16 harness (audit round 4): as
-- service_role,
--   TRUNCATE public.rishi_snapshots;   -- succeeded, table emptied
--
-- Fix, three layers (Constitution art. 13: authorization lives in the
-- database too):
--   1. REVOKE TRUNCATE on every public table from anon, authenticated
--      AND service_role. service_role matters most: it is the key the
--      server actually holds.
--   2. Default privileges: future tables in this schema do not
--      silently re-acquire TRUNCATE for those roles.
--   3. BEFORE TRUNCATE statement triggers that always raise, covering
--      every role that still holds the privilege after (1)+(2) — the
--      table owner keeps TRUNCATE no matter what is revoked, so the
--      trigger is the only guard left for that path. TRUNCATE fires
--      FOR EACH STATEMENT triggers only; the 010 row-level trigger
--      never applied, which is exactly why this hole existed.
--
-- Residual risk, documented honestly (Constitution art. 1):
--   * The table owner (postgres on Supabase) and superusers can still
--     disable or drop triggers (e.g. SET session_replication_role =
--     replica; or ALTER TABLE ... DISABLE TRIGGER ...). No grant
--     system can prevent that.
--   * PITR backups are the backstop against owner/superuser-level
--     mistakes or a compromised admin path. Restore drill: L5-05.
--   * The self-check block at the bottom re-verifies (1)+(3) every
--     time this migration runs (CI re-applies migrations on every run).
--
-- Idempotent: safe to re-run.

-- ── 1. Revoke TRUNCATE on every existing public table ─────────
REVOKE TRUNCATE ON public.alerts            FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.backtest_results  FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.badges            FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.chat_usage        FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.financial_annual  FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.financial_quarters FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.fno_strategies    FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.holdings          FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.ingestion_log     FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.observed_prices   FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.portfolios        FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.provider_cache    FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.rate_limits       FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.rishi_snapshots   FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.securities        FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.signal_history    FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.symbol_history    FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.transactions      FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.universe          FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.users             FROM anon, authenticated, service_role;
REVOKE TRUNCATE ON public.watchlist         FROM anon, authenticated, service_role;

-- ── 2. Default privileges: future tables do not re-acquire it ─
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM service_role;

-- ── 3. Statement trigger: even the owner cannot TRUNCATE ──────
CREATE OR REPLACE FUNCTION public.reject_truncate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'TRUNCATE is rejected: public.% is guarded by migration 013 (row-level triggers do not fire on TRUNCATE; corrections restore from PITR, never by emptying tables)',
    TG_TABLE_NAME
  USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS alerts_no_truncate            ON public.alerts;
CREATE TRIGGER alerts_no_truncate            BEFORE TRUNCATE ON public.alerts            FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS backtest_results_no_truncate  ON public.backtest_results;
CREATE TRIGGER backtest_results_no_truncate  BEFORE TRUNCATE ON public.backtest_results  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS badges_no_truncate            ON public.badges;
CREATE TRIGGER badges_no_truncate            BEFORE TRUNCATE ON public.badges            FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS chat_usage_no_truncate        ON public.chat_usage;
CREATE TRIGGER chat_usage_no_truncate        BEFORE TRUNCATE ON public.chat_usage        FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS financial_annual_no_truncate  ON public.financial_annual;
CREATE TRIGGER financial_annual_no_truncate  BEFORE TRUNCATE ON public.financial_annual  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS financial_quarters_no_truncate ON public.financial_quarters;
CREATE TRIGGER financial_quarters_no_truncate BEFORE TRUNCATE ON public.financial_quarters FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS fno_strategies_no_truncate    ON public.fno_strategies;
CREATE TRIGGER fno_strategies_no_truncate    BEFORE TRUNCATE ON public.fno_strategies    FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS holdings_no_truncate          ON public.holdings;
CREATE TRIGGER holdings_no_truncate          BEFORE TRUNCATE ON public.holdings          FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS ingestion_log_no_truncate     ON public.ingestion_log;
CREATE TRIGGER ingestion_log_no_truncate     BEFORE TRUNCATE ON public.ingestion_log     FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS observed_prices_no_truncate   ON public.observed_prices;
CREATE TRIGGER observed_prices_no_truncate   BEFORE TRUNCATE ON public.observed_prices   FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS portfolios_no_truncate        ON public.portfolios;
CREATE TRIGGER portfolios_no_truncate        BEFORE TRUNCATE ON public.portfolios        FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS provider_cache_no_truncate    ON public.provider_cache;
CREATE TRIGGER provider_cache_no_truncate    BEFORE TRUNCATE ON public.provider_cache    FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS rate_limits_no_truncate       ON public.rate_limits;
CREATE TRIGGER rate_limits_no_truncate       BEFORE TRUNCATE ON public.rate_limits       FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS rishi_snapshots_no_truncate   ON public.rishi_snapshots;
CREATE TRIGGER rishi_snapshots_no_truncate   BEFORE TRUNCATE ON public.rishi_snapshots   FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS securities_no_truncate        ON public.securities;
CREATE TRIGGER securities_no_truncate        BEFORE TRUNCATE ON public.securities        FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS signal_history_no_truncate    ON public.signal_history;
CREATE TRIGGER signal_history_no_truncate    BEFORE TRUNCATE ON public.signal_history    FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS symbol_history_no_truncate    ON public.symbol_history;
CREATE TRIGGER symbol_history_no_truncate    BEFORE TRUNCATE ON public.symbol_history    FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS transactions_no_truncate      ON public.transactions;
CREATE TRIGGER transactions_no_truncate      BEFORE TRUNCATE ON public.transactions      FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS universe_no_truncate          ON public.universe;
CREATE TRIGGER universe_no_truncate          BEFORE TRUNCATE ON public.universe          FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS users_no_truncate             ON public.users;
CREATE TRIGGER users_no_truncate             BEFORE TRUNCATE ON public.users             FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();
DROP TRIGGER IF EXISTS watchlist_no_truncate         ON public.watchlist;
CREATE TRIGGER watchlist_no_truncate         BEFORE TRUNCATE ON public.watchlist         FOR EACH STATEMENT EXECUTE FUNCTION public.reject_truncate();

-- ── 4. Self-check: every public table is covered, now and on re-runs ──
-- tgtype bit flags (pg_trigger): TRUNCATE = 0x20, BEFORE = 0x02, and the
-- row bit 0x01 must be clear (statement trigger).
DO $$
DECLARE
  t text;
  n int;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace nn ON nn.oid = c.relnamespace
    WHERE nn.nspname = 'public' AND c.relkind = 'r'
  LOOP
    IF has_table_privilege('anon', format('public.%I', t), 'TRUNCATE')
       OR has_table_privilege('authenticated', format('public.%I', t), 'TRUNCATE')
       OR has_table_privilege('service_role', format('public.%I', t), 'TRUNCATE') THEN
      RAISE EXCEPTION 'Q1 self-check FAILED: % is still TRUNCATE-able by a Supabase role', t;
    END IF;
    SELECT count(*) INTO n FROM pg_trigger
    WHERE tgrelid = format('public.%I', t)::regclass
      AND NOT tgisinternal
      AND (tgtype & 32) <> 0   -- TRUNCATE
      AND (tgtype & 2)  <> 0   -- BEFORE
      AND (tgtype & 1)  = 0    -- FOR EACH STATEMENT
      AND tgenabled IN ('O', 'A', 'R');
    IF n = 0 THEN
      RAISE EXCEPTION 'Q1 self-check FAILED: % has no BEFORE TRUNCATE statement trigger', t;
    END IF;
  END LOOP;
END;
$$;
