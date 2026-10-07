-- ============================================================
-- 030_observation_state_log.sql — Phase A item 2 (founder direction
-- 12, 2026-10-07): TEMPORAL MEMORY — the append-only observation-state
-- model. `quote_cache` holds only the CURRENT observation; ChangeSince,
-- Watchtower, the Management Truth Tracker and Since-Last-Visit all
-- need state HISTORY, without creating separate history systems.
--
-- One row = one VALUE TRANSITION of one FIELD of one ENTITY:
--   entity            'stock:RELIANCE' | 'tile:BTC' | 'portfolio:<id>' …
--   field             'price' | 'change' | 'volume24h' | 'pe' …
--   observed_at       the UPSTREAM's own observation time (null when the
--                     upstream disclosed none — never fabricated, G4B)
--   recorded_at       append time (this platform's clock)
--   source            the observation source id, verbatim ('yahoo-bulk'…)
--   unit              the closed unit taxonomy value ('inr', 'percent'…)
--   source_state      the CLOSED provenance vocabulary shared with the
--                     evidence layer (lib/ai/schemas AiSourceState)
--   old_value         the previous canonical value (null on the FIRST
--                     observation — an honest beginning, not a zero)
--   new_value         the new canonical value
--   change_id         deterministic transition identity (see
--                     lib/intelligence/stateLog.ts changeIdOf): the same
--                     observation re-appended by a retry is ONE row
--                     (UNIQUE) — idempotent by construction (rule 11)
--
-- WRITE discipline: INSERT only. There are no UPDATE/DELETE pathways and
-- no grants for them; a correction is a NEW transition (append-only
-- traceability). Gaps are detectable (row N+1's old_value vs row N's
-- new_value) and never fabricated.
--
-- A re-observation with an UNCHANGED value is NOT a transition — the
-- no-op check constraint rejects it at the database level.
--
-- RLS (Constitution 13 + N2.1): enabled, NO policies — deny-by-default
-- for anon/authenticated. The service role (server routes only) reads
-- and writes; no client-facing surface queries this table directly.
-- ============================================================

CREATE TABLE public.observation_state_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Deterministic identity: sha256(entity|field|observedAt|null|newValue)
  -- computed by the writer — a retried append of the SAME transition
  -- collides and is dropped (ON CONFLICT DO NOTHING), never duplicated.
  change_id TEXT NOT NULL UNIQUE
    CHECK (length(change_id) BETWEEN 16 AND 64),
  entity TEXT NOT NULL
    CHECK (length(entity) BETWEEN 3 AND 120),
  field TEXT NOT NULL
    CHECK (length(field) BETWEEN 1 AND 60),
  observed_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL
    CHECK (length(source) BETWEEN 1 AND 60),
  unit TEXT NOT NULL
    CHECK (length(unit) BETWEEN 1 AND 20),
  source_state TEXT NOT NULL CHECK (
    source_state IN ('live', 'live-undated', 'derived', 'seed', 'unavailable')
  ),
  old_value JSONB,
  new_value JSONB NOT NULL,
  -- An append-only log of CHANGE: old = new is not a transition.
  CONSTRAINT observation_state_log_noop_rejected
    CHECK (old_value IS DISTINCT FROM new_value),
  -- SQL NULL old_value = the FIRST observation (an honest beginning,
  -- never a zero). A JSON `null` literal is neither a first observation
  -- nor a value — the writer only appends real values (the quote path's
  -- isRealQuote guard), so the literal is rejected on both sides.
  CONSTRAINT observation_state_log_json_null_rejected
    CHECK (
      (old_value IS NULL OR jsonb_typeof(old_value) <> 'null')
      AND jsonb_typeof(new_value) <> 'null'
    )
);

CREATE INDEX observation_state_log_entity_field_idx
  ON public.observation_state_log (entity, field, recorded_at DESC);

ALTER TABLE public.observation_state_log ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default for the client-facing roles (fail closed,
-- Constitution C2). The service role bypasses RLS and is the only
-- reader/writer — user-scoped intelligence routes project from this table
-- server-side; users never query it directly.

REVOKE ALL ON public.observation_state_log FROM anon, authenticated;
