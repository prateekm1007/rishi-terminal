import 'server-only';

import { nseStockIndicesSchema } from '../validation/schemas';

/**
 * P1-LIVE-UNIVERSE (round 47, founder work-order item 8):
 *
 *   "Pick a live universe, starting with Nifty 100 or Nifty 50, from
 *    NSE's equity list, bhavcopy and filings, with dataQuality set to
 *    live or delayed. Everything else shows no verdict."
 *
 * DECISION — SUPERSEDED AND ALIGNED (C10): this module first shipped
 * "NIFTY 50 first, one constant flips to NIFTY 100". The parallel
 * session's licensing review (PR #351, docs/DATA_PROVIDER_MATRIX.md,
 * founder licensing message 2026-10-11) recorded the delegated
 * launch-universe decision as NIFTY 100 — the binding record. The
 * constant is aligned to it here; the route stays the FREE OFFICIAL
 * NSE path: this module (the official constituents payload),
 * lib/universe/bhavcopy.ts (the official EOD bhavcopy) and the NSE
 * quote-equity/filings path for fundamentals (lib/nse/).
 *
 * Honesty rules this module obeys:
 *   - the payload is validated with zod BEFORE any field is read
 *     (rule 9 — NSE is a trust boundary);
 *   - a short list, an empty list, a schema mismatch or an HTTP failure
 *     yields null — never a partial universe presented as THE universe
 *     (rule 6, fail closed);
 *   - the index's own aggregate row (symbol "NIFTY 50", priority 1) is
 *     not a constituent and is excluded;
 *   - `asOf` is the payload's own disclosure (lastUpdateTime of the
 *     index row) when present, else null — never the fetch time.
 */

/** The universe index. Flip to 'NIFTY 100' when the feed is proven. */
export const UNIVERSE_INDEX = 'NIFTY 100';

/** Expected constituent count for the universe index. */
export const UNIVERSE_SIZE = 100;

export interface Universe {
  symbols: string[];
  /** The payload's own observation disclosure, else null. */
  asOf: string | null;
  source: 'nse:equity-stockIndices';
}

const NSE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.nseindia.com/',
  Origin: 'https://www.nseindia.com',
};

/**
 * Parse the official equity-stockIndices payload into the universe.
 * Pure function — fixture-tested; null on every ugly path.
 */
export function parseUniverseConstituents(payload: unknown): Universe | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const parsed = nseStockIndicesSchema.safeParse(payload);
  if (!parsed.success) return null;

  const rows = parsed.data.data ?? [];
  // the index's own row first (priority 1 / symbol == the index name)
  const indexRow = rows.find((r) => r.symbol === UNIVERSE_INDEX);
  const constituents = rows.filter((r) => r.symbol !== UNIVERSE_INDEX).map((r) => r.symbol);

  if (constituents.length !== UNIVERSE_SIZE) return null;

  const asOf = indexRow?.lastUpdateTime ?? rows[0]?.lastUpdateTime ?? null;
  return {
    symbols: constituents,
    asOf: typeof asOf === 'string' && asOf.length > 0 ? asOf : null,
    source: 'nse:equity-stockIndices',
  };
}

/**
 * Fetch the live universe from NSE (server-side; the same header shape
 * the deployed /api/pulse/* routes use — verified working from the
 * production egress). Fails closed to null.
 */
export async function fetchUniverse(): Promise<Universe | null> {
  try {
    const url = `https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(
      UNIVERSE_INDEX,
    )}`;
    const res = await fetch(url, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    return parseUniverseConstituents(await res.json());
  } catch {
    return null;
  }
}
