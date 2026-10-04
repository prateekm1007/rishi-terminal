-- lib/db/migrations/025_portfolio_imports.sql
-- X3-07 (Round 14): portfolio import + transactions. RLS keyed to
-- auth.uid() on BOTH tables (rule 13); a re-import of the same file is a
-- no-op at the API layer via the per-user UNIQUE constraint on source_hash
-- (the DB is the last line of defence against double-counting).

create table if not exists public.portfolio_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text not null default 'import.csv' check (char_length(source_name) between 1 and 120),
  source_hash text not null check (char_length(source_hash) = 64),
  rows_ok int not null check (rows_ok >= 0),
  rows_failed int not null check (rows_failed >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, source_hash)
);

create table if not exists public.portfolio_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.portfolio_imports(id) on delete cascade,
  trade_date date not null,
  symbol text not null check (char_length(symbol) between 1 and 32),
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price > 0)
);

alter table public.portfolio_imports enable row level security;
alter table public.portfolio_transactions enable row level security;

create policy "portfolio_imports_select_own" on public.portfolio_imports
  for select using (auth.uid() = user_id);
create policy "portfolio_imports_insert_own" on public.portfolio_imports
  for insert with check (auth.uid() = user_id);
create policy "portfolio_imports_delete_own" on public.portfolio_imports
  for delete using (auth.uid() = user_id);

create policy "portfolio_transactions_select_own" on public.portfolio_transactions
  for select using (auth.uid() = user_id);
create policy "portfolio_transactions_insert_own" on public.portfolio_transactions
  for insert with check (auth.uid() = user_id);
create policy "portfolio_transactions_delete_own" on public.portfolio_transactions
  for delete using (auth.uid() = user_id);

create index if not exists portfolio_imports_user_idx
  on public.portfolio_imports (user_id, created_at desc);
create index if not exists portfolio_transactions_user_symbol_idx
  on public.portfolio_transactions (user_id, symbol, trade_date);
