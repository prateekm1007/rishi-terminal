import 'server-only';

/**
 * P1-LIVE-UNIVERSE (round 47): the record-level dataQuality policy for
 * the live universe — the honest bridge between step 8 (real data) and
 * the P0-1 verdict gate.
 *
 * A record's verdicts unlock ONLY when the record's scoring inputs are
 * actually observed from the official route:
 *
 *   - price observation (bhavcopy EOD, fresh within BHAVCOPY_STALE_MS)
 *     AND fundamentals observation (NSE quote-equity / filings) -> the
 *     record is 'delayed' (EOD fundamentals + EOD prices);
 *   - a live intraday quote AND live fundamentals -> 'live' (reserved
 *     for the day the intraday leg is licensed and wired);
 *   - anything less (one leg missing, either leg stale, timestamps
 *     unknown) -> 'seed' — and 'seed' means NO VERDICT on every
 *     surface (the P0-1/P0-5 gate; unchanged).
 *
 * Rule 16 discipline: a null timestamp is UNKNOWN, never fresh.
 */

/** A bhavcopy EOD older than this is stale (4 calendar days covers
 *  weekends + one NSE holiday without pretending to freshness). */
export const BHAVCOPY_STALE_MS = 4 * 24 * 60 * 60 * 1000;

/** Fundamentals older than this are stale (quarterly filings, but the
 *  quote-equity path refreshes daily; a week is the honest bound). */
export const FUNDAMENTALS_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export type UniverseRecordQuality = 'live' | 'delayed' | 'seed';

export interface UniverseRecordInputs {
  /** Bhavcopy EOD observation time for the record's price, else null. */
  priceObservedAt?: string | null;
  /** Fundamentals observation time (provider-disclosed), else null. */
  fundamentalsObservedAt?: string | null;
  /** True only when an intraday live quote AND live fundamentals are
   *  both serving (reserved for the licensed-intraday future). */
  intradayLive?: boolean;
}

function fresh(iso: string | null | undefined, boundMs: number, now: number): boolean {
  if (typeof iso !== 'string' || iso.length === 0) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return now - t <= boundMs;
}

/**
 * The record-level quality for a universe member. NOW is injectable for
 * deterministic tests (rule 18).
 */
export function universeRecordQuality(
  inputs: UniverseRecordInputs,
  now: number = Date.now(),
): UniverseRecordQuality {
  const priceFresh = fresh(inputs.priceObservedAt, BHAVCOPY_STALE_MS, now);
  const fundamentalsFresh = fresh(inputs.fundamentalsObservedAt, FUNDAMENTALS_STALE_MS, now);

  if (inputs.intradayLive && priceFresh && fundamentalsFresh) return 'live';
  if (priceFresh && fundamentalsFresh) return 'delayed';
  return 'seed';
}
