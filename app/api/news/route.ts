import { NextResponse } from 'next/server';

import { aggregateLiveNews, liveNewsFeedCount, MAX_AGE_MINUTES } from '@/lib/news/server';

export const runtime = 'nodejs';
export const revalidate = 120;

// TODAY-MOVERS (2026-10-13): the RSS aggregation moved to
// lib/news/server.ts (rule 14 — the Today panel's news row needs the SAME
// live feed state; a second hand-rolled aggregation would be the same
// logic maintained twice). The route keeps its concerns: the region param,
// the response shape, the cache headers, and the rule-10 generic error
// body (pinned by test/rule10ErrorHygiene.round9.test.ts).

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get('region');

    const all = await aggregateLiveNews(region);

    return NextResponse.json(
      {
        news: all,
        count: all.length,
        generatedAt: new Date().toISOString(),
        maxAgeHours: MAX_AGE_MINUTES / 60,
        feedCount: liveNewsFeedCount(region),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );
  } catch (error) {
    // Rule 10 (R9 §18): generic outward, detailed inward. The previous body
    // leaked `detail: String(error)` — upstream exception text (vendor URLs,
    // connection errors) reached the client.
    console.error('[/api/news] fetch failed:', error);
    return NextResponse.json(
      { news: [], error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
