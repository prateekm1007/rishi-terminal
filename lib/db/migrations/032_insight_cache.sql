-- ============================================================
-- 032_insight_cache.sql — Phase A item 7 (INT-A7): the PERSISTENT
-- INSIGHT CACHE keyed by the deterministic change key. Roadmap
-- execution rule 4: "A7 means a deterministic change key + persistent
-- cache — never in-memory memoization."
--
-- One row = one GENERATED INSIGHT ARTIFACT (an A1-contract
-- RishiInsight) stored under its change key:
--   change_key     sha256(feature|subject|sorted-unique changeIds)
--                  (lib/intelligence/insightCache.ts changeKeyOf):
--                  the same evidence set always maps to ONE row
--   feature        the closed A1 registry id, enforced at the write
--                  boundary in TS (length-checked here so a registry
--                  addition is a TS-enum change, not a forced migration)
--   subject        the thing the insight is ABOUT (A1 bound: 1..80)
--   payload        the FULL RishiInsight artifact (jsonb object —
--                  parse-or-refuse happened in TS via parseRishiInsight)
--   generated_at   the DATABASE clock (NOW()) — the TS layer keeps none
--   hit_count      reuse accounting; monotone (CHECK >= 0); only the
--                  atomic read-hit function increments it
--   last_hit_at    the DATABASE clock of the last cache hit
--
-- WRITE discipline: via the two SQL functions below only (the TS
-- module calls them via rpc as the service role):
--   - insight_cache_write: INSERT … ON CONFLICT (change_key) DO
--     UPDATE payload + generated_at; hit_count PRESERVED (reuse
--     accounting survives a regeneration);
--   - insight_cache_read_hit: atomic UPDATE hit_count = hit_count + 1
--     … RETURNING * (one statement — no read-then-write race, the B-10
--     lesson).
--
-- RLS (Constitution 13 + N2.1): enabled, NO policies — deny-by-default
-- for anon/authenticated. The service role (server routes only) reads
-- and writes; no client-facing surface queries this table directly,
-- and the two functions are not executable by the client roles.
-- ============================================================

CREATE TABLE public.insight_cache (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Deterministic identity from changeKeyOf — 64-char lowercase hex.
  change_key TEXT NOT NULL UNIQUE
    CHECK (change_key ~ '^[0-9a-f]{64}$'),
  feature TEXT NOT NULL
    CHECK (length(feature) BETWEEN 1 AND 60),
  subject TEXT NOT NULL
    CHECK (length(subject) BETWEEN 1 AND 80),
  -- The full A1-contract artifact; a JSON null is not an artifact.
  payload JSONB NOT NULL
    CHECK (jsonb_typeof(payload) = 'object'),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count BIGINT NOT NULL DEFAULT 0
    CHECK (hit_count >= 0),
  last_hit_at TIMESTAMPTZ
);

CREATE INDEX insight_cache_feature_subject_idx
  ON public.insight_cache (feature, subject);

ALTER TABLE public.insight_cache ENABLE ROW LEVEL SECURITY;
-- No policies: deny-by-default for the client-facing roles (fail
-- closed, Constitution C2). The service role bypasses RLS and is the
-- only reader/writer — intelligence routes project from this table
-- server-side; users never query it directly.

REVOKE ALL ON public.insight_cache FROM anon, authenticated;

-- The ONE write path: atomic upsert. Re-writing an existing key
-- replaces payload and generated_at and PRESERVES hit_count. Returns
-- the row's current hit_count (0 on a fresh insert).
CREATE OR REPLACE FUNCTION public.insight_cache_write(
  p_change_key TEXT,
  p_feature TEXT,
  p_subject TEXT,
  p_payload JSONB
)
RETURNS BIGINT
LANGUAGE sql
VOLATILE
AS $$
  INSERT INTO public.insight_cache (change_key, feature, subject, payload)
  VALUES (p_change_key, p_feature, p_subject, p_payload)
  ON CONFLICT (change_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        generated_at = NOW()
  RETURNING insight_cache.hit_count;
$$;

-- The ONE read path: atomic hit. UPDATE … RETURNING in ONE statement —
-- the counter never loses an increment to a race (B-10: read-then-write
-- on a counter is a defect, not a shortcut). Returns NULL on a miss.
CREATE OR REPLACE FUNCTION public.insight_cache_read_hit(p_change_key TEXT)
RETURNS public.insight_cache
LANGUAGE sql
VOLATILE
AS $$
  UPDATE public.insight_cache
     SET hit_count = hit_count + 1,
         last_hit_at = NOW()
   WHERE change_key = p_change_key
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.insight_cache_write(TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.insight_cache_read_hit(TEXT)
  FROM PUBLIC, anon, authenticated;
