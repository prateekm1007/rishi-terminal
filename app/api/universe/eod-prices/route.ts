import { NextResponse } from 'next/server';

import { EOD_PRICE_DISPLAY_LICENSE, eodPricesDisplayable } from '@/lib/licensing';
import { bhavcopyUrl, parseBhavcopyCsv } from '@/lib/universe/bhavcopy';
import { fetchUniverse, UNIVERSE_INDEX } from '@/lib/universe/constituents';

/**
 * P1-LIVE-UNIVERSE (round 47): the INTERNAL, licence-gated EOD price feed
 * for the launch universe — the only consumer of the official bhavcopy
 * parser. Founder directive 2026-10-11 (verbatim scope):
 *
 *   "Land #350 last, with prices behind an internal flag."
 *   "Keep NSE-sourced end-of-day prices off public pages until NSE answers
 *    the display question in writing."
 *
 * Discipline this route obeys:
 *   - THE internal flag is lib/licensing.ts EOD_PRICE_DISPLAY_LICENSE
 *     (one licensing home, rule 14). While it is "unresolved" the route
 *     refuses 503 BEFORE any network I/O — no NSE fetch, no price byte
 *     leaves the server (fail-closed, rule 6). The refusal ordering is
 *     pinned by test/universe.priceDisplay.test.ts (C5): fetch is mocked
 *     to throw, and the handler must still answer 503.
 *   - The flag flips ONLY in the PR recording NSE's written display
 *     answer — never via an env var, query parameter, or client value
 *     (rule 7: the client is untrusted; the server decides).
 *   - No page imports this route and none may: prices are served as data
 *     with their own provenance, never rendered on a public page until
 *     the display answer is recorded. The zero-import pin lives in the
 *     same test file (B-18 positive control: the route file itself).
 *   - When the flag one day flips, every served row carries the
 *     bhavcopy's own TIMESTAMP as the observation time (rule 3: never
 *     stamp the fetch date on old data) and the official URL as source.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // the gate is evaluated per request, never cached across states

/** How many calendar days back the bhavcopy probe walks (weekends +
 * NSE holidays): the first session whose file parses wins, and the file's
 * own timestamp is served — a holiday is an honest miss, never a stale
 * replay labelled fresh. */
const BHAVCOPY_LOOKBACK_DAYS = 7;

export async function GET() {
  // Fail-closed FIRST (rule 6): the display licence is unresolved, so the
  // request refuses before any fetch. Order matters and is pinned (C5).
  if (!eodPricesDisplayable()) {
    return NextResponse.json(
      {
        status: 'withheld',
        asOf: EOD_PRICE_DISPLAY_LICENSE.asOf,
        note: 'NSE-sourced end-of-day prices are withheld while the exchange display licence is unresolved (founder directive 2026-10-11). The switch is lib/licensing.ts EOD_PRICE_DISPLAY_LICENSE; it flips only in the PR recording NSE\'s written answer.',
      },
      { status: 503 },
    );
  }

  const universe = await fetchUniverse();
  if (!universe) {
    // fail closed (rule 6): no universe state is served as if it existed
    return NextResponse.json(
      {
        status: 'unavailable',
        note: 'The official NSE constituents payload was not served or did not validate; no price feed is derived without its universe.',
      },
      { status: 503 },
    );
  }

  // Probe the official bhavcopy back to the most recent session that
  // parsed. Every candidate date is deterministic (UTC calendar math on
  // the session date; rule 18 — no randomness, no clock-dependent labels:
  // the file's own TIMESTAMP is the observation, the URL is the source).
  for (let back = 0; back < BHAVCOPY_LOOKBACK_DAYS; back++) {
    const session = new Date();
    session.setUTCDate(session.getUTCDate() - back);
    const url = bhavcopyUrl(session);
    let csv: string | null = null;
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'rishi-terminal-universe/1' } });
      csv = res.ok ? await res.text() : null;
    } catch {
      csv = null; // transport failure is an honest miss for this session
    }
    const rows = csv ? parseBhavcopyCsv(csv, universe.symbols) : null;
    if (rows && Object.keys(rows).length > 0) {
      return NextResponse.json({
        status: 'ok',
        universe: UNIVERSE_INDEX,
        size: Object.keys(rows).length,
        expectedSize: universe.symbols.length,
        source: url,
        observation: 'the bhavcopy file\'s own TIMESTAMP column per row',
        prices: rows,
      });
    }
  }

  return NextResponse.json(
    {
      status: 'unavailable',
      note: `No official bhavcopy file parsed within the ${BHAVCOPY_LOOKBACK_DAYS}-day lookback; nothing is served rather than a stale replay (rule 3).`,
    },
    { status: 503 },
  );
}
