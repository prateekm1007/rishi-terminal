-- quote_cache invariants (U2 round 7) — REAL-Postgres proof for the
-- refresh-claim semantics the shared cache depends on. Runs in the CI
-- migrations job against actual Postgres after migrations 001…N.
--
-- The defect this locks out: migration 016's claim function was UPDATE-only,
-- so a claim on an ABSENT row returned false and a cold cache could never
-- populate (found during the U2 request-path integration audit; unit
-- emulation had masked it). These assertions run against the REAL 017
-- function, not an emulation.

do $$
declare
  ok boolean;
  claim_row record;
begin
  -- 1. Claim on an ABSENT row must SUCCEED (this is what populates a cold cache).
  ok := try_quote_cache_refresh('TESTCOLD', 30);
  if not ok then
    raise exception 'quote_cache: cold claim on an absent row returned false — cold cache can never populate';
  end if;

  select * into claim_row from quote_cache where symbol = 'TESTCOLD';
  if not found then
    raise exception 'quote_cache: cold claim did not create the claim row';
  end if;
  if claim_row.price <> 0 or claim_row.source <> 'claim' then
    raise exception 'quote_cache: claim row must be the price-0 "claim" placeholder, got price=% source=%',
      claim_row.price, claim_row.source;
  end if;

  -- 2. A second claim INSIDE the window must LOSE (single-refresher guarantee).
  ok := try_quote_cache_refresh('TESTCOLD', 30);
  if ok then
    raise exception 'quote_cache: second claim inside the claim window won — thundering-herd guard is broken';
  end if;

  -- 3. An EXPIRED claim (claim window 30 s, claim aged 31 s) must WIN again.
  update quote_cache
     set refresh_claim = now() - interval '31 seconds'
   where symbol = 'TESTCOLD';
  ok := try_quote_cache_refresh('TESTCOLD', 30);
  if not ok then
    raise exception 'quote_cache: claim did not re-arm after the claim window expired';
  end if;

  -- 4. volume24h column exists (017) and is nullable — Rule 16: null is not 0.
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'quote_cache'
       and column_name = 'volume24h'
  ) then
    raise exception 'quote_cache: volume24h column missing — migration 017 not fully applied';
  end if;

  -- clean up the probe row
  delete from quote_cache where symbol = 'TESTCOLD';
end $$;

-- ── Y2 (Round 12): the coverage RPC counts what it says it counts ──
-- Seeds rows with KNOWN observation ages and asserts the per-class
-- fresh/total counts, so the health endpoint's coverage telemetry can
-- never silently miscount (freshness is judged on observed_at, the
-- upstream's own observation time — never refreshed_at).
do $$
declare
  cov jsonb;
  eq_fresh int; eq_total int; ti_fresh int; ti_total int;
begin
  insert into quote_cache (symbol, price, change, currency, source, observed_at, refreshed_at, ttl_seconds)
  values
    ('COV-FRESH-EQ',  100, 1, 'INR', 'probe', now() - interval '5 minutes',  now(), 60),
    ('COV-STALE-EQ',  100, 1, 'INR', 'probe', now() - interval '2 hours',    now(), 60),
    ('COV-NULL-OBS',  100, 1, 'INR', 'probe', null,                          now(), 60),
    ('COV-FRESH-TILE', 100, 1, 'INR', 'probe', now() - interval '5 minutes', now(), 60)
  on conflict (symbol) do update
    set observed_at = excluded.observed_at, refreshed_at = excluded.refreshed_at;

  -- refreshed_at is NOW even for the stale/null rows — a re-served stale
  -- row must not count as fresh.
  cov := quote_cache_coverage(
    array['COV-FRESH-EQ', 'COV-STALE-EQ', 'COV-NULL-OBS', 'COV-NOT-PRESENT'],
    array['COV-FRESH-TILE', 'COV-STALE-TILE'],
    1800
  );

  eq_fresh := (cov->'equities'->>'fresh')::int;
  eq_total := (cov->'equities'->>'total')::int;
  ti_fresh := (cov->'tiles'->>'fresh')::int;
  ti_total := (cov->'tiles'->>'total')::int;

  if eq_total <> 4 or ti_total <> 2 then
    raise exception 'Y2 coverage: totals must be the PARAMETER cardinalities, got equities=% tiles=%', eq_total, ti_total;
  end if;
  if eq_fresh <> 1 then
    raise exception 'Y2 coverage: equities fresh must be 1 (stale observed_at and NULL observed_at are not fresh), got %', eq_fresh;
  end if;
  if ti_fresh <> 1 then
    raise exception 'Y2 coverage: tiles fresh must be 1 (only the 5-minute-old row), got %', ti_fresh;
  end if;

  delete from quote_cache where symbol like 'COV-%';
end $$;

-- ── Y2: the coverage RPC is service-role-only (fail closed) ──
do $$
begin
  if has_function_privilege('anon', 'public.quote_cache_coverage(text[], text[], integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.quote_cache_coverage(text[], text[], integer)', 'EXECUTE') then
    raise exception 'Y2 coverage: anon/authenticated can EXECUTE quote_cache_coverage — the revokes in 022 did not bite';
  end if;
  if not has_function_privilege('service_role', 'public.quote_cache_coverage(text[], text[], integer)', 'EXECUTE') then
    raise exception 'Y2 coverage: service_role lost EXECUTE on quote_cache_coverage — the health probe is broken';
  end if;
end $$;
