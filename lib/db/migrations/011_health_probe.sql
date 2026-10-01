-- ============================================================
-- 011 — HEALTH PROBE RPC (remediation round 3, N8)
-- ============================================================
-- /api/health previously made TWO service-role queries per request
-- (users count + ingestion_log read of 200 rows) with
-- Cache-Control: no-store and no rate limit — an unauthenticated
-- DB hammer. This migration collapses them into ONE minimal RPC that
-- returns timestamps only (no row counts, no payloads).
--
-- The job-name lists are PARAMETERS (p_price_jobs / p_fundamentals_jobs)
-- so lib/health/slo.ts stays the single source of truth (Constitution
-- art. 14) — the SQL never hardcodes job names that could drift.
--
-- Callers: /api/health via the service key only (EXECUTE revoked from
-- PUBLIC/anon/authenticated). The route additionally memoizes the
-- result for a short window (see lib/health/probe.ts), so 50 rapid
-- requests cause at most 1 round-trip per window.
--
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.health_probe(
  p_price_jobs        text[],
  p_fundamentals_jobs text[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    -- The call itself proves the round trip; users presence proves the
    -- core schema exists (a missing-table error surfaces as an RPC error,
    -- which the route reports as `down`).
    'users_visible', EXISTS (SELECT 1 FROM public.users),
    'last_price_ingest_at',
      (SELECT max(finished_at)::text FROM public.ingestion_log
        WHERE job_name = ANY (p_price_jobs) AND finished_at IS NOT NULL),
    'last_fundamentals_ingest_at',
      (SELECT max(finished_at)::text FROM public.ingestion_log
        WHERE job_name = ANY (p_fundamentals_jobs) AND finished_at IS NOT NULL)
  );
$$;

-- Executable only by service_role (the public surface is the HTTP route,
-- never the RPC itself).
REVOKE EXECUTE ON FUNCTION public.health_probe(text[], text[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.health_probe(text[], text[]) TO service_role;
