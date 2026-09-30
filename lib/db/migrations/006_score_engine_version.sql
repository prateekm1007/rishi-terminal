-- Remediation T10.5: persist the scoring engine version with every snapshot
-- so historical scores stay comparable across engine changes.
-- Engine versions are defined in lib/consensus/version.ts
-- (current: 'rishi-merit-v1' = Rishi Merit System v1).

alter table public.rishi_snapshots
  add column if not exists score_engine_version text;

-- Historical rows were produced by the same weighted consensus
-- (Rishi Merit System v1) before the column existed; backfill so series are
-- not split by an invisible version change.
update public.rishi_snapshots
set score_engine_version = 'rishi-merit-v1'
where score_engine_version is null;
