-- 017_quote_cache_claim_and_volume.sql — U2 round 7: request-path integration
--
-- ADDITIVE ONLY (lesson from 007/008: no competing CREATEs, no ALTER FUNCTION
-- OWNER). Two changes, both required before quote_cache becomes the serving
-- surface for /api/prices and /api/prices/batch:
--
-- 1. COLD-CLAIM FIX (defect found during the U2 integration audit):
--    migration 016's try_quote_cache_refresh was UPDATE-only — on a symbol
--    with NO row yet it updated zero rows and returned FALSE, so a cold
--    cache could never populate: the claim winner never existed, every
--    reader saw miss forever, and the upstream was never called. The
--    unit-test emulation masked this by creating claim rows for absent
--    symbols (test/quoteCache.test.ts). The fixed function UPSERTS the
--    claim: an absent row is inserted with price 0 (readers treat price <= 0
--    as "no observation yet" — lib/quoteCache guards this), an existing row
--    claims only when its claim window has expired. Same pool-safe
--    time-expiring semantics as 016: no session affinity, no release step.
--    Real-Postgres proof: scripts/ci/quote_cache_invariants.sql (CI
--    migrations job).
--
-- 2. volume24h column: the bulk refresher (lib/nse/bulkFetch) discloses a
--    24h trading volume that the single-symbol path does not. Storing it
--    keeps the batch wire contract unchanged when equities switch to the
--    shared cache. NULL when the upstream disclosed none — Rule 16, null is
--    not 0. RLS state is unchanged (016 enabled deny-all; no policies).

alter table quote_cache add column if not exists volume24h bigint;

create or replace function try_quote_cache_refresh(
  p_symbol text,
  p_claim_seconds integer
)
returns boolean
language sql
volatile
security definer
set search_path = public
as $$
  with claimed as (
    insert into quote_cache
      (symbol, price, change, currency, source, observed_at, refreshed_at,
       ttl_seconds, refresh_claim)
    values
      (p_symbol, 0, null, 'INR', 'claim', null, now(), 0, now())
    on conflict (symbol) do update
      set refresh_claim = now()
      where quote_cache.refresh_claim is null
         or quote_cache.refresh_claim < now() - make_interval(secs => greatest(p_claim_seconds, 5))
    returning true
  )
  select exists (select 1 from claimed);
$$;

-- Defense in depth (Rule 13), re-asserted after the function replace:
-- the RPC stays service-role-only.
revoke execute on function try_quote_cache_refresh(text, integer) from anon, authenticated;
