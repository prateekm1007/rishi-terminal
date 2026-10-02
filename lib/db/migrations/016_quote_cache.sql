-- 016_quote_cache.sql — U2 (founder round 6): shared quote cache
--
-- ADDITIVE ONLY (lesson from 007/008: no ALTER FUNCTION ... OWNER statements).
--
-- quote_cache: the SHARED last-observation store for equity quotes. The
-- founder's U2 decision supersedes the earlier storage-rights restraint for
-- THIS table specifically: quotes are cached to make upstream calls O(1) per
-- TTL across users and instances (founder accepted the unofficial-source
-- risk — the served labels stay "DELAYED · unofficial"). RLS deny-all for
-- anon/authenticated (no policies on purpose); reads and writes go through
-- the service role only. One refresher at a time per symbol shard takes
-- pg_try_advisory_lock; everyone else serves stale-while-revalidate.
--
-- Columns: symbol (registry symbol), price, change (percent, NULL when the
-- source disclosed none — Rule 16), currency, source (provider id),
-- observed_at (the UPSTREAM's own observation time — never the fetch time),
-- refreshed_at (when our refresher stored it), ttl_seconds (the freshness
-- window this row was stored under).

create table if not exists quote_cache (
  symbol       text primary key,
  price        numeric not null,
  change       numeric,
  currency     text not null default 'INR',
  source       text not null,
  observed_at  timestamptz,
  refreshed_at timestamptz not null default now(),
  ttl_seconds  integer not null default 60
);

create index if not exists quote_cache_refreshed_idx on quote_cache (refreshed_at);

-- RLS: deny-all for anon/authenticated (no policies defined on purpose) —
-- same pattern as provider_cache (009). Service role bypasses RLS.
alter table quote_cache enable row level security;

-- Refresh coordination. The founder asked for pg_try_advisory_lock; that
-- primitive is SESSION-scoped, and under Supabase's transaction-mode pooler
-- the unlock can land on a DIFFERENT connection than the lock — a leaked
-- lock starves every later refresher. The pool-safe equivalent is an atomic
-- time-expiring refresh CLAIM: one winner per claim window, no session
-- affinity, no release step (a crashed refresher simply lets the claim
-- expire). Same guarantee the advisory lock was meant to provide: at most
-- ONE upstream refresher per window.
alter table quote_cache add column if not exists refresh_claim timestamptz;

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
  update quote_cache
     set refresh_claim = now()
   where symbol = p_symbol
     and (refresh_claim is null or refresh_claim < now() - make_interval(secs => greatest(p_claim_seconds, 5)))
  returning true;
$$;

-- Defense in depth (Rule 13): the RPC is service-role-only in practice —
-- RLS denies anon/authenticated reads of the table, and these revocations
-- stop direct RPC calls with the public keys.
revoke execute on function try_quote_cache_refresh(text, integer) from anon, authenticated;
