-- 009_phase6_provider_cache.sql — Phase 6 (T62 persistent cache, T61 observations)
--
-- ADDITIVE ONLY. Lesson from 007/008 (Task 6): no ALTER FUNCTION ... OWNER
-- statements (Supabase 42501). Pure CREATE TABLE IF NOT EXISTS + RLS enable.
--
-- provider_cache: T62 durable last-known-observation store. Writes come only
-- from storage-entitled sources (fred-csv, exchangerate-api, ecb-fx — see
-- lib/livePrice.ts PERSISTABLE_SOURCES and docs/DATA_PROVIDER_MATRIX.md
-- "Phase 6 storage policy"). Served ONLY when the live chain fails, always
-- labelled CACHED with its original observed_at (provenance quintuple).
--
-- observed_prices: T61 historical persistence of OUR OWN observations for
-- storage-entitled sources (FRED yields, FX reference rates), captured by
-- the nightly snapshot cron. Facts we observed, attributed and timestamped;
-- internal reasoning input, not a redistribution surface.

create table if not exists provider_cache (
  key         text primary key,
  provider_id text not null,
  payload     jsonb not null,
  observed_at timestamptz not null,
  expires_at  timestamptz not null,
  updated_at  timestamptz not null default now()
);

create index if not exists provider_cache_expires_idx on provider_cache (expires_at);

create table if not exists observed_prices (
  symbol        text not null,
  observed_date date not null,
  price         numeric not null,
  source        text not null,
  observed_at   timestamptz not null,
  created_at    timestamptz not null default now(),
  primary key (symbol, observed_date)
);

create index if not exists observed_prices_date_idx on observed_prices (observed_date);

-- RLS: deny-all for anon/authenticated (no policies defined on purpose).
-- The service role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS and is the only
-- reader/writer — both tables are server-internal, never user-facing.
alter table provider_cache enable row level security;
alter table observed_prices enable row level security;
