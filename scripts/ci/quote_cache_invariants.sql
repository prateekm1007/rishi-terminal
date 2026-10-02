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

  -- 3. An EXPIRED claim (claim window 5 s, claim aged > 5 s) must WIN again.
  update quote_cache
     set refresh_claim = now() - interval '10 seconds'
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
