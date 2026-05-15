-- supabase/financial_quarters.sql
-- REAL_FINANCIALS_SCHEMA_V1

-- Store real quarterly financials (you maintain these rows).
-- Currency: INR numbers typically in crores (or raw INR) — be consistent.

create table if not exists public.financial_quarters (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  quarter_end   date not null,
  fiscal_year   int  not null,
  fiscal_quarter int not null check (fiscal_quarter between 1 and 4),

  revenue       numeric not null,
  net_profit    numeric not null,
  opm           numeric,          -- Operating Profit Margin (%)

  currency      text not null default 'INR',
  source        text,             -- e.g. 'Annual Report', 'Company PR', 'Exchange Filing'
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique(symbol, fiscal_year, fiscal_quarter)
);

create index if not exists financial_quarters_symbol_end_idx
  on public.financial_quarters(symbol, quarter_end desc);

alter table public.financial_quarters enable row level security;

-- IMPORTANT:
-- We do NOT add a public SELECT policy.
-- Your Next.js API route will use the SERVICE ROLE key (server-only) which bypasses RLS.
-- This keeps the table private from anon clients.

-- Optional helper: updated_at trigger (safe to skip if you prefer manual)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_financial_quarters_updated_at on public.financial_quarters;
create trigger trg_financial_quarters_updated_at
before update on public.financial_quarters
for each row execute function public.set_updated_at();

-- Example insert (edit values to match your unit convention)
-- insert into public.financial_quarters(symbol, quarter_end, fiscal_year, fiscal_quarter, revenue, net_profit, opm, source)
-- values ('TCS', '2024-12-31', 2025, 3, 63500, 11800, 25.2, 'Exchange Filing');