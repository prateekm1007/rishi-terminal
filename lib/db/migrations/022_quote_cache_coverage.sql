-- ============================================================
-- 022 — QUOTE-CACHE COVERAGE RPC (Y2, Round 12)
-- ============================================================
-- /api/health reports how much of the warmer's sweep the shared quote
-- cache currently covers (the founder's Y2 acceptance: >= 90% of the
-- 916-symbol universe observed within the last 30 minutes during the
-- NSE session). The counts live behind one minimal, STABLE, service-
-- role-only RPC so the health route never queries quote_cache directly.
--
-- The sweep sets are PARAMETERS (p_universe / p_tiles), passed from the
-- same single derivations the warmer uses (Object.keys(STOCKS) and
-- quotePath.nonEquityTileSymbols — Constitution art. 14): the SQL never
-- hardcodes a symbol list that could drift from the warmer's sweep.
--
-- Freshness is measured on observed_at — the UPSTREAM's own observation
-- time — never on refreshed_at (a re-served stale row must not count as
-- fresh). Rows with a NULL observed_at are not fresh (an undisclosed
-- observation time cannot claim freshness; Rule 16).
--
-- The health route treats this as best-effort telemetry: a failure (or a
-- runtime older than this migration) reports quoteCache: null and never
-- changes the core status verdict.
--
-- ADDITIVE ONLY. Idempotent: safe to re-run.
--
-- Callers: /api/health via the service key only (EXECUTE revoked from
-- PUBLIC/anon/authenticated — the security-definer invariant V1.1 bites
-- otherwise). The quote_cache table itself stays RLS deny-all.

CREATE OR REPLACE FUNCTION public.quote_cache_coverage(
  p_universe      text[],
  p_tiles         text[],
  p_fresh_seconds integer DEFAULT 1800
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'equities', jsonb_build_object(
      'fresh', (SELECT count(*) FROM public.quote_cache
                 WHERE symbol = ANY (p_universe)
                   AND observed_at > now() - make_interval(secs => greatest(p_fresh_seconds, 60))),
      'total', cardinality(p_universe)
    ),
    'tiles', jsonb_build_object(
      'fresh', (SELECT count(*) FROM public.quote_cache
                 WHERE symbol = ANY (p_tiles)
                   AND observed_at > now() - make_interval(secs => greatest(p_fresh_seconds, 60))),
      'total', cardinality(p_tiles)
    ),
    'asOf', now()::text
  );
$$;

-- Executable only by service_role (the public surface is the HTTP route,
-- never the RPC itself — same pattern as health_probe 011).
REVOKE EXECUTE ON FUNCTION public.quote_cache_coverage(text[], text[], integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.quote_cache_coverage(text[], text[], integer) TO service_role;
