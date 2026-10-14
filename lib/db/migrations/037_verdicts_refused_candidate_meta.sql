-- 037_verdicts_refused_candidate_meta.sql — TODAY-NIFTY (founder order,
-- 2026-10-14: "expand the candidate set toward the licensed Nifty 50
-- (the pipeline needs only a list change), add the ITC
-- promoter-shareholding fallback, and eventually rank 'Top Buy Signals /
-- Short Radar' from the verdicts ledger as coverage grows").
--
-- ADDITIVE ONLY (the 007/008 lesson, same as 016/033/035/036).
--
-- verdicts_refused: the REFUSAL BACKOFF ledger — one row per (symbol,
-- IST calendar day) a candidate refused, with the reason, the attempt
-- count, and the last-try timestamp. The warm step skips a refused
-- candidate whose last try is inside the reason-classed retry window
-- (a transient transport miss retries in 30 minutes; a structural
-- refusal — a bank balance sheet — in 6 hours): WITHOUT the backoff, the
-- Nifty-50 expansion would re-fetch every bank page on EVERY minute tick
-- (~10 refusers x ~1.5 s = a third of the 25 s budget, every tick, all
-- day — the known refusers would starve the untried tail, the exact
-- coverage this round exists to grow; C9's paired guard).
--
-- Written ONLY by the warmer's verdicts step (the authenticated ingest
-- path, Bearer QUOTES_WARM_SECRET). RLS deny-all for anon/authenticated
-- — same pattern as verdicts_produced (036).
--
-- verdicts_meta gains the candidate-set provenance columns (additive
-- ALTERs): the SOURCE the set derived from (the licensed NSE list vs the
-- founder-confirmed floor), NSE's own universe size (pre-registry-filter,
-- for the disclosure), and the IST date the NSE list was fetched (the
-- once-per-day cache — membership changes on semi-annual reviews, not
-- intraday; the fetch must not repeat every tick).

create table if not exists verdicts_refused (
  id            bigint generated always as identity primary key,
  symbol        text not null,
  ist_date      text not null,
  reason        text not null,
  attempts      int not null default 1,
  last_tried_at timestamptz not null,
  unique (symbol, ist_date)
);

create index if not exists verdicts_refused_ist_date_idx on verdicts_refused (ist_date);

alter table verdicts_refused enable row level security;

-- The candidate-set provenance (verdicts_meta is single-row, id = 1).
alter table verdicts_meta add column if not exists candidate_source text;
alter table verdicts_meta add column if not exists candidate_universe_size int;
alter table verdicts_meta add column if not exists candidate_fetched_on text;
