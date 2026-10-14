-- 036_verdicts_produced.sql — TODAY-VERDICTS (founder order, 2026-10-14):
-- "finish and tune it to world class now that we have permission …
--  make sure the full today panel is populated on dashboard."
--
-- ADDITIVE ONLY (the 007/008 lesson, same as 016/033/035).
--
-- verdicts_produced: the LEDGER of Rishi verdicts produced on live
-- fundamentals — one row per (symbol, IST calendar day). Written ONLY
-- by the warmer's verdicts step (the authenticated ingest path, Bearer
-- QUOTES_WARM_SECRET); read by the homepage's ISR regeneration and the
-- methodology page (service role). RLS deny-all for anon/authenticated
-- — same pattern as quote_cache (016) / market_movers (033).
--
-- The row IS the production record: the consensus number, the category,
-- the P0-1 data-quality class ('live'/'delayed' only — the gate refuses
-- seed/missing before a row can exist), the per-field source map (audit
-- trail), the fundamentals transport, and the day-0 BASELINE price the
-- forward-return calibration track (S2-03/S2-04) measures from.
--
-- Baseline columns are NULLABLE: a verdict with no usable cached quote
-- still records (the fundamentals are the verdict's inputs); the
-- tracking line discloses the missing baseline, never fabricates one
-- (Rule 16).

create table if not exists verdicts_produced (
  id                    bigint generated always as identity primary key,
  symbol                text not null,
  ist_date              text not null,
  name                  text,
  consensus             numeric not null,
  category              text not null,
  data_quality          text not null check (data_quality in ('live', 'delayed')),
  field_sources         jsonb not null,
  fundamentals_source   text,
  baseline_price        numeric check (baseline_price is null or baseline_price > 0),
  baseline_source       text,
  baseline_observed_at  timestamptz,
  produced_at           timestamptz not null default now(),
  unique (symbol, ist_date)
);

create index if not exists verdicts_produced_ist_date_idx on verdicts_produced (ist_date);
create index if not exists verdicts_produced_produced_at_idx on verdicts_produced (produced_at);

-- Single-row metadata: the disclosed candidate set and the last run's
-- outcome (the warmer's disclosure, persisted for the Today row).
create table if not exists verdicts_meta (
  id            integer primary key default 1 check (id = 1),
  candidate_set jsonb not null,
  last_run_at   timestamptz not null,
  last_outcome  jsonb
);

-- RLS: deny-all for anon/authenticated (no policies on purpose) —
-- same pattern as quote_cache (016) / market_movers (033).
alter table verdicts_produced enable row level security;
alter table verdicts_meta enable row level security;
