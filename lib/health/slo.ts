/**
 * Freshness SLO constants for /api/health (P0-04).
 *
 * PROPOSED thresholds — the founder must confirm them via E6-06 / D1-10
 * before they become contractual (Roadmap rule: the coder never silently
 * picks a number). Until D1-04/D1-05 introduce prices_eod and
 * fundamentals_pit, freshness is derived from ingestion_log job rows; the
 * job-name lists below are the single place to update when those tasks land.
 */

/** Jobs whose latest finished_at means "prices were ingested recently". */
export const PRICE_INGEST_JOBS: readonly string[] = ["ingestPrices"];

/** Jobs whose latest finished_at means "fundamentals were ingested recently". */
export const FUNDAMENTALS_INGEST_JOBS: readonly string[] = [
  "ingestQuarterly",
  "ingestFundamentals",
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
