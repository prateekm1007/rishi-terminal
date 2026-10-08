/**
 * Freshness SLO constants for /api/health (P0-04).
 *
 * PROPOSED thresholds — the founder must confirm them via E6-06 / D1-10
 * before they become contractual (Roadmap rule: the coder never silently
 * picks a number). Until D1-04/D1-05 introduce prices_eod and
 * fundamentals_pit, freshness is derived from ingestion_log job rows; the
 * job-name lists below are the single place to update when those tasks land.
 *
 * G6 (round 23): the lists now name the jobs REAL routes write. The
 * pre-G6 lists ("ingestPrices", "ingestQuarterly", "ingestFundamentals")
 * matched no logIngestion caller, so lastPriceIngestAt /
 * lastFundamentalsIngestAt were structurally null and /api/health reported
 * "no ingestion recorded yet" forever — permanently "degraded" while the
 * warmer kept the cache fresh. Verified against the actual writers:
 * quotes-warm logs "quotes_warm" per non-skipped slice; the financials
 * route logs "ingest_financials"; the other ingestion jobs
 * (nightly_snapshot = consensus scores, reference_observations = FRED/FX)
 * carry no equity-price or fundamentals signal.
 */

/** Jobs whose latest finished_at means "prices were ingested recently". */
export const PRICE_INGEST_JOBS: readonly string[] = ["quotes_warm"];

/**
 * Jobs whose latest finished_at means "fundamentals were ingested recently".
 * Two real writer identities:
 *  - "ingest_financials"  -- the quarterly/annual financials route (G6).
 *  - "nightly_snapshot"   -- the daily consensus snapshot (NS1). The
 *    pre-registered NS1 acceptance runbook
 *    (docs/evidence/round26/ns1-acceptance-runbook.md) requires the
 *    fundamentals "no ingestion recorded yet" reason to CLEAR once the
 *    first real nightly_snapshot row exists; observed live 2026-10-08
 *    (first real scheduled row: 896/896, 5.0s) the reason did NOT clear
 *    -- a blocking health/data-plane disagreement per that runbook. This
 *    list is the fix; the 96h staleness SLO below now actually applies
 *    to a live signal (a gate correction, not a weakening).
 */
export const FUNDAMENTALS_INGEST_JOBS: readonly string[] = [
  "ingest_financials",
  "nightly_snapshot",
];

/**
 * PROPOSED (D1-10): prices ≤ 1 trading day old. Trading calendar is not
 * modelled yet, so a fixed 36h wall-clock bound is used as the default.
 */
export const PRICE_STALENESS_SLO_MS = 36 * 60 * 60 * 1000;

/**
 * PROPOSED (D1-10): fundamentals ≤ 2 days after a filing. Without a filing
 * calendar this is a fixed 96h wall-clock bound as the default.
 */
export const FUNDAMENTALS_STALENESS_SLO_MS = 96 * 60 * 60 * 1000;
