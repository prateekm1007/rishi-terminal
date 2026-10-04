// lib/db/migrations/024_screens.sql
// X3-05 (Round 14): saved screener screens. One row per user-saved
// expression; RLS keyed to auth.uid() (rule 13 — assume the REST API gets
// called directly with the anon key), plus length caps mirrored in the
// API route (the DB is the last line of defence, not the first).
//
// The expression is stored as TEXT and re-validated by the server-side
// parser on every execution — a stored expression can never smuggle
// anything into evaluation (there is no evaluation path but the parser).

create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  expression text not null check (char_length(expression) between 1 and 400),
  created_at timestamptz not null default now()
);

alter table public.screens enable row level security;

create policy "screens_select_own" on public.screens
  for select using (auth.uid() = user_id);

create policy "screens_insert_own" on public.screens
  for insert with check (auth.uid() = user_id);

create policy "screens_update_own" on public.screens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "screens_delete_own" on public.screens
  for delete using (auth.uid() = user_id);

create index if not exists screens_user_created_idx
  on public.screens (user_id, created_at desc);
