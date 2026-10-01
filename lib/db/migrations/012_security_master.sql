-- ============================================================
-- 012 — SECURITY MASTER (roadmap D1-02, Phase 1)
-- ============================================================
-- The ISIN-keyed security master. Symbols change (the 43 duplicate
-- groups found in the seed dataset were exactly this); the ISIN is
-- the stable key. Everything downstream — price ingestion (D1-04),
-- point-in-time fundamentals (D1-05), the universe (D1-09) and the
-- survivorship-free backtests (S2-02) — joins on ISIN.
--
-- Numbered 012, not the 009 the roadmap sketch used: 010 (RLS
-- hardening, N2) and 011 (health probe, N8) were consumed by
-- remediation round 3 before Phase 1 started.
--
-- Tables:
--   securities     one row per security (ISIN PK). Populated from the
--                  official NSE listing snapshot (data/security-master/,
--                  see SOURCES.md there). sector stays NULL until a
--                  sourced taxonomy exists — the seed's sectors are
--                  editorial placeholders and are NOT copied (art. 6).
--   symbol_history (isin, exchange, symbol, valid_from, valid_to).
--                  Current listing rows carry the official listing
--                  date as valid_from (caveat: that is the security's
--                  listing date, which can predate a renamed symbol's
--                  first use). Seed-variant and registry-alias rows
--                  carry NULL dates and a source label — they claim
--                  resolvability, not exchange validity.
--   universe       the candidate pool. data_quality='OK' is set only
--                  by D1-09 (after D1-07 validation and D1-08
--                  reconciliation); rows start as PENDING_DATA.
--                  The symbol column is an extension to the roadmap
--                  sketch (which had only isin): UNRESOLVED seed
--                  symbols have no ISIN and still need a visible,
--                  auditable home ("unresolved rows go to
--                  universe.data_quality='UNRESOLVED' with a reason"
--                  — D1-02), which requires a symbol-keyed row.
--
-- RLS: deny-all + REVOKE, exactly the 010 pattern (N2). Only the
-- service role (BYPASSRLS) reads/writes these tables; no client
-- component may query them. Nothing in app/ touches these tables yet
-- (D1-09/D1-11 will wire serving) — they are ingestion-side today.
--
-- Idempotent: safe to re-run.

-- ── 1. securities ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.securities (
  isin             text PRIMARY KEY
                     CHECK (isin ~ '^IN[A-Z0-9]{9}[0-9]$'),
  name             text NOT NULL,
  exchange_primary text NOT NULL DEFAULT 'NSE',
  sector           text,
  listed_on        date,
  delisted_on      date,
  status           text NOT NULL DEFAULT 'ACTIVE'
                     CHECK (status IN ('ACTIVE', 'DELISTED', 'SUSPENDED', 'UNKNOWN')),
  source           text NOT NULL
);

-- ── 2. symbol_history ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.symbol_history (
  isin       text NOT NULL REFERENCES public.securities (isin) ON DELETE CASCADE,
  exchange   text NOT NULL,
  symbol     text NOT NULL,
  valid_from date,
  valid_to   date,
  source     text NOT NULL,
  CONSTRAINT symbol_history_interval CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from
  )
);

COMMENT ON TABLE public.symbol_history IS
  'Symbol→ISIN resolution history. valid_from/valid_to are exchange-validity dates where known; NULL = unbounded (no claim). The source column is the provenance of the mapping and the honesty carrier for rows derived from the seed dataset or registry aliases.';

-- One ACTIVE (valid_to IS NULL) row per (exchange, symbol): two
-- different securities must never claim the same live symbol, and a
-- seed variant must never shadow an official listing row (the
-- generator skips duplicates; this index makes violations impossible
-- to insert rather than merely detectable).
CREATE UNIQUE INDEX IF NOT EXISTS symbol_history_active_symbol_uq
  ON public.symbol_history (exchange, symbol)
  WHERE valid_to IS NULL;

CREATE INDEX IF NOT EXISTS symbol_history_symbol_idx
  ON public.symbol_history (symbol);
CREATE INDEX IF NOT EXISTS symbol_history_isin_idx
  ON public.symbol_history (isin);

-- ── 3. universe ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.universe (
  isin        text REFERENCES public.securities (isin) ON DELETE CASCADE,
  symbol      text,
  data_quality text NOT NULL
                CHECK (data_quality IN ('UNRESOLVED', 'PENDING_DATA', 'OK', 'QUARANTINED')),
  reason      text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT universe_identity_key UNIQUE NULLS NOT DISTINCT (isin, symbol),
  CONSTRAINT universe_presence CHECK (isin IS NOT NULL OR symbol IS NOT NULL)
);

COMMENT ON TABLE public.universe IS
  'Candidate pool. OK is granted only by D1-09 after validation (D1-07) and reconciliation (D1-08). UNRESOLVED rows have isin NULL and a symbol + reason — the honest, visible home for seed symbols that cannot be mapped to an official listing.';

CREATE INDEX IF NOT EXISTS universe_data_quality_idx
  ON public.universe (data_quality);

-- ── 4. RLS: deny-all, service_role only (010 pattern) ─────────
ALTER TABLE public.securities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symbol_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universe       ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.securities     FROM anon, authenticated;
REVOKE ALL ON public.symbol_history FROM anon, authenticated;
REVOKE ALL ON public.universe       FROM anon, authenticated;
