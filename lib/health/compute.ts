/**
 * Pure health computation for /api/health (P0-04).
 *
 * Status semantics (spec):
 *  - "down"     → the DB round-trip failed. The app cannot serve live data.
 *  - "degraded" → DB is reachable but at least one freshness input is
 *                 missing (null = the pipeline has never produced that
 *                 data — reported honestly, never silently as "ok") or
 *                 exceeds its SLO.
 *  - "ok"       → DB reachable and every freshness input within SLO.
 *
 * Y2 (Round 12): the payload also carries the quote-cache coverage
 * telemetry (quoteCache) — fresh/total counts per class for the BOUNDED
 * quote_cache table (the warmer's own universe + tile set), never any
 * other table's row counts. It is TELEMETRY, never severity: a cold or
 * uncovered cache reports low coverage and does NOT flip the verdict
 * (the page renders honest "unavailable" states without it). null = the
 * coverage probe could not run (unknown, not zero — Rule 16).
 */

import {
  FUNDAMENTALS_INGEST_JOBS,
  FUNDAMENTALS_STALENESS_SLO_MS,
  PRICE_INGEST_JOBS,
  PRICE_STALENESS_SLO_MS,
} from "./slo";

export type HealthStatus = "ok" | "degraded" | "down";

/** Y2: one class's quote-cache coverage — counts of the bounded
 *  quote_cache rows (the warmer's own sweep sets), and the derived ratio. */
export interface QuoteClassCoverage {
  fresh: number;
  total: number;
  coverage: number;
}

/** Y2: the warmer's coverage telemetry, verbatim from the RPC. */
export interface QuoteCacheCoverage {
  equities: QuoteClassCoverage;
  tiles: QuoteClassCoverage;
  windowSeconds: number;
  asOf: string;
}

export interface HealthBody {
  status: HealthStatus;
  db: boolean;
  lastPriceIngestAt: string | null;
  lastFundamentalsIngestAt: string | null;
  engineVersion: string;
  asOf: string;
  /** Y2: warmer coverage telemetry — null when the coverage probe could
   *  not run (unknown, not zero). Never affects `status`. */
  quoteCache: QuoteCacheCoverage | null;
  /** Present only when degraded — names the stale/missing input(s). */
  reasons?: string[];
}

export function latestIngestAt(
  rows: Array<{ job_name: string | null; finished_at: string | null }>,
  jobs: readonly string[],
): string | null {
  let max: string | null = null;
  for (const r of rows) {
    if (r.job_name && jobs.includes(r.job_name) && r.finished_at) {
      if (max === null || r.finished_at > max) max = r.finished_at;
    }
  }
  return max;
}

export function computeHealth(input: {
  dbOk: boolean;
  now: Date;
  ingestionRows: Array<{ job_name: string | null; finished_at: string | null }>;
  engineVersion: string;
  /** Y2: the coverage telemetry gathered in the same probe window, or
   *  null when it could not be gathered. Passed through verbatim. */
  quoteCache?: QuoteCacheCoverage | null;
}): HealthBody {
  const asOf = input.now.toISOString();

  if (!input.dbOk) {
    return {
      status: "down",
      db: false,
      lastPriceIngestAt: null,
      lastFundamentalsIngestAt: null,
      engineVersion: input.engineVersion,
      asOf,
      quoteCache: null,
      reasons: ["db round-trip failed"],
    };
  }

  const lastPriceIngestAt = latestIngestAt(input.ingestionRows, PRICE_INGEST_JOBS);
  const lastFundamentalsIngestAt = latestIngestAt(
    input.ingestionRows,
    FUNDAMENTALS_INGEST_JOBS,
  );

  const reasons: string[] = [];
  const priceAgeMs =
    lastPriceIngestAt === null ? null : input.now.getTime() - new Date(lastPriceIngestAt).getTime();
  const fundamentalsAgeMs =
    lastFundamentalsIngestAt === null
      ? null
      : input.now.getTime() - new Date(lastFundamentalsIngestAt).getTime();

  if (priceAgeMs === null) reasons.push("prices: no ingestion recorded yet");
  else if (priceAgeMs > PRICE_STALENESS_SLO_MS) reasons.push("prices: staleness exceeds SLO");

  if (fundamentalsAgeMs === null) reasons.push("fundamentals: no ingestion recorded yet");
  else if (fundamentalsAgeMs > FUNDAMENTALS_STALENESS_SLO_MS)
    reasons.push("fundamentals: staleness exceeds SLO");

  return {
    status: reasons.length === 0 ? "ok" : "degraded",
    db: true,
    lastPriceIngestAt,
    lastFundamentalsIngestAt,
    engineVersion: input.engineVersion,
    asOf,
    quoteCache: input.quoteCache ?? null,
    ...(reasons.length > 0 ? { reasons } : {}),
  };
}
