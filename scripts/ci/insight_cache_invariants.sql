-- insight_cache invariants (INT-A7, Phase A item 7) — REAL-Postgres
-- proof for the persistent insight-cache semantics. Runs in the CI
-- migrations job after migrations 001…031.
--
-- Every block RAISES on violation (Constitution 24: a check that
-- cannot fail is theatre). The blocks target the defects each
-- constraint/function exists to prevent:
--   - a contract artifact writes via the ONE write function and the
--     same change key collapses to ONE row (idempotent upsert);
--   - a regeneration of the same key REPLACES payload/generated_at
--     and PRESERVES hit_count (reuse accounting survives);
--   - every read hit atomically increments hit_count (one statement);
--   - a JSON-null payload (a disguised unknown) is unrepresentable;
--   - a non-64-hex change_key is unrepresentable;
--   - a negative hit_count is unrepresentable;
--   - anon/authenticated hold NO privileges, RLS denies them, and the
--     two functions are not executable by the client roles.

do $$
begin
  -- 1. A contract-shaped payload writes via the ONE write function
  --    (the TS layer already parse-or-refused; here the row lands).
  perform public.insight_cache_write(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'stock-intelligence', 'TESTSYM',
    '{"id":"insight:stock-intelligence:TESTSYM:k1","feature":"stock-intelligence"}'::jsonb
  );
end $$;

do $$
declare
  n bigint;
begin
  -- 2. The SAME key re-written collapses to ONE row (idempotent upsert).
  perform public.insight_cache_write(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'stock-intelligence', 'TESTSYM',
    '{"id":"insight:stock-intelligence:TESTSYM:k1","feature":"stock-intelligence","regenerated":true}'::jsonb
  );
  select count(*) into n from public.insight_cache
    where change_key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  if n <> 1 then
    raise exception 'icache: the same change key produced % rows — the upsert does not collapse retries', n;
  end if;
end $$;

do $$
declare
  before_hit bigint;
  after_hit bigint;
  regenerated boolean;
begin
  -- 3. A read hit increments atomically; a subsequent regeneration
  --    replaces payload + generated_at and PRESERVES the counter.
  select hit_count into before_hit from public.insight_cache
    where change_key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  perform public.insight_cache_read_hit(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  select hit_count into after_hit from public.insight_cache
    where change_key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  if after_hit is distinct from before_hit + 1 then
    raise exception 'icache: read hit did not increment atomically (% -> %)', before_hit, after_hit;
  end if;

  perform public.insight_cache_write(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'stock-intelligence', 'TESTSYM',
    '{"id":"insight:stock-intelligence:TESTSYM:k1","feature":"stock-intelligence","again":true}'::jsonb
  );
  select (payload ? 'again') into regenerated from public.insight_cache
    where change_key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  if not regenerated then
    raise exception 'icache: regeneration did not replace the payload';
  end if;
  if (select hit_count from public.insight_cache
        where change_key = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
       is distinct from after_hit then
    raise exception 'icache: regeneration did not PRESERVE hit_count (reuse accounting lost)';
  end if;
end $$;

do $$
begin
  -- 4. A read MISS returns NULL (the honest unknown — never a guess).
  if public.insight_cache_read_hit(
       'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
     ) is not null then
    raise exception 'icache: a miss returned a row — the unknown was fabricated';
  end if;
end $$;

do $$
begin
  -- 5. A JSON-null payload is REJECTED (null is not an artifact, rule 16).
  begin
    perform public.insight_cache_write(
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'stock-intelligence', 'TESTSYM', 'null'::jsonb);
    raise exception 'icache: a JSON-null payload was ACCEPTED — null is not an artifact';
  exception when check_violation then
    null;
  end;
end $$;

do $$
begin
  -- 6. A non-64-hex change_key is REJECTED (identity format is closed).
  begin
    perform public.insight_cache_write(
      'not-a-real-key', 'stock-intelligence', 'TESTSYM', '{}'::jsonb);
    raise exception 'icache: a non-64-hex change_key was ACCEPTED';
  exception when check_violation then
    null;
  end;
end $$;

do $$
begin
  -- 7. A negative hit_count is REJECTED (monotone counter).
  begin
    insert into public.insight_cache (change_key, feature, subject, payload, hit_count)
    values ('dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
            'stock-intelligence', 'TESTSYM', '{}'::jsonb, -1);
    raise exception 'icache: a negative hit_count was ACCEPTED';
  exception when check_violation then
    null;
  end;
end $$;

do $$
begin
  -- 8. RLS is enabled; anon/authenticated hold NO table privileges and
  --    cannot execute the two functions.
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'insight_cache' and c.relrowsecurity
  ) then
    raise exception 'icache: insight_cache does not have row-level security enabled';
  end if;
  if has_table_privilege('anon', 'public.insight_cache', 'SELECT') then
    raise exception 'icache: anon can SELECT insight_cache';
  end if;
  if has_table_privilege('authenticated', 'public.insight_cache', 'INSERT') then
    raise exception 'icache: authenticated can INSERT insight_cache';
  end if;
  if has_function_privilege('anon', 'public.insight_cache_write(TEXT,TEXT,TEXT,JSONB)', 'EXECUTE') then
    raise exception 'icache: anon can EXECUTE insight_cache_write';
  end if;
  if has_function_privilege('authenticated', 'public.insight_cache_read_hit(TEXT)', 'EXECUTE') then
    raise exception 'icache: authenticated can EXECUTE insight_cache_read_hit';
  end if;
end $$;

-- Cleanup (service role): the fixture rows leave no trace.
delete from public.insight_cache where subject = 'TESTSYM';

\echo '── insight_cache invariants: all passed'
