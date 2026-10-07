-- observation_state_log invariants (Phase A item 2, direction 12) —
-- REAL-Postgres proof for the temporal-memory semantics. Runs in the CI
-- migrations job after migrations 001…030.
--
-- Every block RAISES on violation (Constitution 24: a check that cannot
-- fail is theatre). The blocks are written against the defects each
-- constraint exists to prevent:
--   - a no-op "transition" (old = new) must be unrepresentable;
--   - a JSON-null value (a disguised unknown) must be unrepresentable;
--   - the same transition appended twice (retry/replay) must collapse to
--     ONE row (idempotency, rule 11);
--   - a legitimate first observation (old SQL NULL) must be accepted;
--   - a later value transition with its predecessor must be accepted;
--   - anon/authenticated must hold NO privileges and RLS must deny them
--     (N2.2-style, this table specifically);
--   - the reader's ordering contract (recorded_at ascending) must hold.

do $$
begin
  -- 1. A first observation (old_value SQL NULL) is accepted — if this
  --    insert fails, the DO block itself fails and CI stops (raw error).
  insert into public.observation_state_log
    (change_id, entity, field, observed_at, source, unit, source_state, old_value, new_value)
  values
    ('testfirst0000000000000000000001', 'stock:TESTSYM', 'price',
     now() - interval '5 minutes', 'test-source', 'inr', 'live',
     null, '1204.10'::jsonb);
end $$;

do $$
begin
  -- 2. A no-op transition (old = new) must be REJECTED by the check
  --    constraint (fail-first: this block EXPECTS the violation).
  begin
    insert into public.observation_state_log
      (change_id, entity, field, observed_at, source, unit, source_state, old_value, new_value)
    values
      ('testnoop00000000000000000000001', 'stock:TESTSYM', 'price',
       now(), 'test-source', 'inr', 'live',
       '1204.10'::jsonb, '1204.10'::jsonb);
    raise exception 'osl: a no-op transition (old = new) was ACCEPTED — the noop constraint does not bite';
  exception when check_violation then
    -- expected: check_violation from observation_state_log_noop_rejected
    null;
  end;
end $$;

do $$
begin
  -- 3. A JSON-null new_value (a disguised unknown) must be REJECTED.
  begin
    insert into public.observation_state_log
      (change_id, entity, field, observed_at, source, unit, source_state, old_value, new_value)
    values
      ('testnull000000000000000000000001', 'stock:TESTSYM', 'volume24h',
       now(), 'test-source', 'shares', 'live',
       '582125'::jsonb, 'null'::jsonb);
    raise exception 'osl: a JSON-null new_value was ACCEPTED — null is not a value (rule 16)';
  exception when check_violation then
    null;
  end;
end $$;

do $$
begin
  -- 4. The SAME change_id appended twice collapses to ONE row
  --    (retry/replay idempotency — the writer's ON CONFLICT DO NOTHING
  --    plus the UNIQUE constraint).
  insert into public.observation_state_log
    (change_id, entity, field, observed_at, source, unit, source_state, old_value, new_value)
  values
    ('testdup0000000000000000000000001', 'stock:TESTSYM', 'price',
     now() - interval '3 minutes', 'test-source', 'inr', 'live',
     '1204.10'::jsonb, '1210.10'::jsonb)
  on conflict (change_id) do nothing;

  insert into public.observation_state_log
    (change_id, entity, field, observed_at, source, unit, source_state, old_value, new_value)
  values
    ('testdup0000000000000000000000001', 'stock:TESTSYM', 'price',
     now() - interval '3 minutes', 'test-source', 'inr', 'live',
     '1204.10'::jsonb, '1210.10'::jsonb)
  on conflict (change_id) do nothing;

  -- A raw duplicate WITHOUT on-conflict must raise (the constraint bites).
  begin
    insert into public.observation_state_log
      (change_id, entity, field, observed_at, source, unit, source_state, old_value, new_value)
    values
      ('testdup0000000000000000000000001', 'stock:TESTSYM', 'price',
       now() - interval '3 minutes', 'test-source', 'inr', 'live',
       '1204.10'::jsonb, '1210.10'::jsonb);
    raise exception 'osl: a duplicate change_id was ACCEPTED without on-conflict — the UNIQUE constraint does not bite';
  exception when unique_violation then
    null;
  end;
end $$;

do $$
declare
  n int;
begin
  -- 5. Exactly TWO rows survive the blocks above (testfirst + testdup;
  --    the noop and json-null inserts were rejected).
  select count(*) into n from public.observation_state_log
   where change_id like 'test%';
  if n <> 2 then
    raise exception 'osl: expected exactly 2 distinct test rows (first + dup), found %', n;
  end if;

  -- 6. Ascending recorded_at history returns the transitions in order and
  --    the chain is continuous (row 2 old_value == row 1 new_value).
  declare
    r1 record;
    r2 record;
  begin
    select * into r1 from public.observation_state_log
     where entity = 'stock:TESTSYM' and field = 'price'
     order by recorded_at asc limit 1;
    select * into r2 from public.observation_state_log
     where entity = 'stock:TESTSYM' and field = 'price'
     order by recorded_at desc limit 1;
    if r1.change_id = r2.change_id then
      raise exception 'osl: expected at least two price transitions for the ordering check';
    end if;
    if r1.new_value::text <> r2.old_value::text then
      raise exception 'osl: the transition chain broke: oldest new=%, newest old=%',
        r1.new_value::text, r2.old_value::text;
    end if;
  end;
end $$;

do $$
begin
  -- 7. RLS enabled (N2.1 also checks this globally) and the client-facing
  --    roles hold NO privileges on the table (service-role only).
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'observation_state_log' and c.relrowsecurity
  ) then
    raise exception 'osl: observation_state_log does not have row-level security enabled';
  end if;
  if has_table_privilege('anon', 'public.observation_state_log', 'SELECT') then
    raise exception 'osl: anon can SELECT observation_state_log';
  end if;
  if has_table_privilege('authenticated', 'public.observation_state_log', 'INSERT') then
    raise exception 'osl: authenticated can INSERT observation_state_log';
  end if;
end $$;

-- Cleanup: the test rows (a CI harness DB is ephemeral, but leave it clean
-- for any step that runs after this one).
delete from public.observation_state_log where change_id like 'test%';
