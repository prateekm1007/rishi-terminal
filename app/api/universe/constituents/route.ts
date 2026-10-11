import { NextResponse } from 'next/server';

import { fetchUniverse, UNIVERSE_INDEX, UNIVERSE_SIZE } from '@/lib/universe/constituents';

/**
 * P1-LIVE-UNIVERSE (round 47): the observability endpoint for the live
 * universe — serves the official constituents with their provenance so
 * the deployed feed can be verified end-to-end (C6 legs). Read-only,
 * no secrets, no params: the universe is the constant, not an input.
 */
export const runtime = 'nodejs';
export const revalidate = 3600; // constituents change rarely; hourly is honest

export async function GET() {
  const universe = await fetchUniverse();
  if (!universe) {
    // fail closed (rule 6): no universe state is served as if it existed
    return NextResponse.json(
      {
        universe: UNIVERSE_INDEX,
        status: 'unavailable',
        note: 'The official NSE constituents payload was not served or did not validate; nothing downstream may treat the universe as loaded.',
      },
      { status: 503 },
    );
  }
  return NextResponse.json({
    universe: UNIVERSE_INDEX,
    status: 'ok',
    size: universe.symbols.length,
    expectedSize: UNIVERSE_SIZE,
    asOf: universe.asOf,
    source: universe.source,
    symbols: universe.symbols,
  });
}
