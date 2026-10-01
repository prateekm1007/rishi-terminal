-- ============================================================
-- 014 — UNIVERSE: NAME_MISMATCH data quality (audit round 4, Q3)
-- ============================================================
-- The Q3 name-agreement gate needs a visible home for seed records whose
-- name disagrees with the official listing for the same symbol:
--
--   seed "Power Mech" bound to symbol POWERINDIA, while the official
--   listing maps POWERINDIA to "Hitachi Energy India Limited".
--
-- Binding by symbol equality alone attached one company's seed numbers to
-- another company's identity. Reviewed disagreements land in
-- data/security-master/name_overrides.json (with sources); UNREVIEWED ones
-- are flagged universe.data_quality = 'NAME_MISMATCH' with both names in
-- reason — visible, queryable, and CI-failing (security_master_invariants
-- D1-02.7) until curated.
--
-- 012's CHECK constraint only allowed ('UNRESOLVED','PENDING_DATA','OK',
-- 'QUARANTINED'), so the flag needs this migration before populate.sql
-- can carry it. Schema first, code second (docs/RELEASE.md).
--
-- Idempotent: safe to re-run.

-- The 012 CHECK is an inline column constraint, so Postgres auto-named it
-- `universe_data_quality_check` (the literal name `universe_data_quality`
-- was never attached). Drop every existing data_quality check on universe
-- regardless of naming, then add exactly one canonical constraint —
-- re-running 014 must not leave the old 4-value rule behind (it would
-- reject the very rows this migration exists to allow).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.universe'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%data_quality%'
  LOOP
    EXECUTE format('ALTER TABLE public.universe DROP CONSTRAINT %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.universe ADD CONSTRAINT universe_data_quality_check
  CHECK (data_quality IN ('UNRESOLVED', 'PENDING_DATA', 'OK', 'QUARANTINED', 'NAME_MISMATCH'));

COMMENT ON COLUMN public.universe.data_quality IS
  'OK is granted only by D1-09 after D1-07 validation and D1-08 reconciliation. UNRESOLVED rows have isin NULL and a symbol + reason. NAME_MISMATCH rows (audit round 4, Q3) mark seed records whose name disagrees with the official listing for the same symbol — binding suspended until a sourced entry exists in data/security-master/name_overrides.json.';
