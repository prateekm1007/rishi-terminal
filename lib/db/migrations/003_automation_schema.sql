-- RISHI_AUTOMATION_SCHEMA_V1
-- Run once against your Supabase project

create table if not exists public.financial_quarters (
  id             uuid primary key default gen_random_uuid(),
  symbol         text not null,
  period         text not null,
  fiscal_year    int  not null,
  fiscal_quarter int  not null,
  quarter_end    date,
  revenue        numeric,
  net_profit     numeric,
  gross_profit   numeric,
  operating_income numeric,
  opm            numeric,
  net_margin     numeric,
  eps            numeric,
  ebitda         numeric,
  currency       text default 'USD',
  source         text default 'FMP',
  derived        boolean default false,
  fetched_at     timestamptz default now(),
  unique(symbol, fiscal_year, fiscal_quarter)
);

create table if not exists public.financial_annual (
  id             uuid primary key default gen_random_uuid(),
  symbol         text not null,
  fiscal_year    int  not null,
  revenue        numeric,
  net_profit     numeric,
  gross_profit   numeric,
  operating_income numeric,
  opm            numeric,
  net_margin     numeric,
  eps            numeric,
  ebitda         numeric,
  free_cash_flow numeric,
  total_debt     numeric,
  total_equity   numeric,
  roe            numeric,
  roce           numeric,
  currency       text default 'USD',
  source         text default 'FMP',
  derived        boolean default false,
  fetched_at     timestamptz default now(),
  unique(symbol, fiscal_year)
);

create table if not exists public.rishi_snapshots (
  id              uuid primary key default gen_random_uuid(),
  symbol          text not null,
  asset_category  text not null,
  snapshot_date   date not null,
  consensus_score numeric not null,
  signal          text not null,
  disagreement    numeric,
  philosopher_scores jsonb,
  instability     numeric,
  top_bull        text,
  top_bear        text,
  tension_spread  numeric,
  majority_view   text,
  price_at_snapshot numeric,
  price_change_1d   numeric,
  created_at      timestamptz default now(),
  unique(symbol, snapshot_date)
);

create table if not exists public.signal_history (
  id              uuid primary key default gen_random_uuid(),
  symbol          text not null,
  signal_date     date not null,
  signal          text not null,
  consensus_score numeric,
  price_at_signal numeric,
  price_30d       numeric,
  price_90d       numeric,
  price_180d      numeric,
  price_365d      numeric,
  return_30d      numeric,
  return_90d      numeric,
  return_180d     numeric,
  return_365d     numeric,
  hit_30d         boolean,
  hit_90d         boolean,
  hit_180d        boolean,
  created_at      timestamptz default now(),
  unique(symbol, signal_date)
);

create table if not exists public.ingestion_log (
  id          uuid primary key default gen_random_uuid(),
  job_name    text not null,
  symbol      text,
  status      text not null,
  records_in  int default 0,
  records_out int default 0,
  error_msg   text,
  source      text,
  started_at  timestamptz default now(),
  finished_at timestamptz
);