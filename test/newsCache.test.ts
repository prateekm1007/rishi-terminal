/**
 * NSEPERM tuning (round 57, founder order 2026-10-14: "finish and tune
 * it to world class"): the live-news aggregation TTL cache pin.
 *
 * #434 joined the homepage's ISR regeneration (every 60 s) to
 * aggregateLiveNews() as a second reader — without a cache at the
 * source, EVERY regeneration re-fetched EVERY feed (28 outbound RSS
 * requests per minute from the render path alone; the route's CDN
 * s-maxage never covered the page render). This pin enforces the fix:
 *
 *   1. ONE aggregation round per region per 120 s TTL window — two
 *      sequential calls inside the window fetch each feed exactly once;
 *   2. the window EXPIRES — after the TTL a new round fetches again
 *      (freshness is bounded, same discipline as the route's own
 *      Cache-Control: s-maxage=120);
 *   3. regions key independently (an INDIA window does not serve a
 *      CRYPTO call);
 *   4. concurrent callers within a window await the SAME in-flight
 *      round (no thundering herd per lambda instance).
 *
 * Fail-first (C5): run against lib/news/server.ts WITHOUT the cache
 * (git stash of the round-57 change) — leg 1 fails with exactly 2× the
 * feed fetches; with the cache it passes. Raw outputs in
 * docs/evidence/round57/.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetLiveNewsCacheForTests,
  aggregateLiveNews,
  liveNewsFeedCount,
} from "../lib/news/server";

/// A minimal RSS document with ONE fresh item — enough for the fetch
/// stub to produce aggregatable output; the cache pin counts FETCHES,
/// not items.
function rssWithHeadline(headline: string): string {
  const pub = new Date(Date.now() - 5 * 60_000).toUTCString();
  return (
    `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>` +
    `<item><title>${headline}</title><link>https://example.com/a</link>` +
    `<description>d</description><pubDate>${pub}</pubDate></item></channel></rss>`
  );
}

describe("NSEPERM — aggregateLiveNews TTL cache (the render-path protection)", () => {
  const REAL_FETCH = globalThis.fetch;
  let fetchCalls: string[] = [];

  beforeEach(() => {
    __resetLiveNewsCacheForTests();
    fetchCalls = [];
    (globalThis as { fetch: unknown }).fetch = vi.fn(async (url: string | URL | Request) => {
      const u = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      fetchCalls.push(u);
      return new Response(rssWithHeadline(`Headline from ${u}`), {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
    __resetLiveNewsCacheForTests();
    vi.useRealTimers();
  });

  it("ONE aggregation round per TTL window — two sequential calls fetch each feed exactly once", async () => {
    const totalFeeds = liveNewsFeedCount(null);
    expect(totalFeeds).toBeGreaterThan(0);
    const first = await aggregateLiveNews();
    const firstRound = fetchCalls.length;
    expect(firstRound).toBe(totalFeeds);
    const second = await aggregateLiveNews();
    // the cache served the second call: no new fetches
    expect(fetchCalls.length).toBe(firstRound);
    // and both calls returned the same aggregated items (same object identity is
    // allowed; equality is what matters)
    expect(second).toEqual(first);
  });

  it("the window EXPIRES — after the 120 s TTL a new round fetches again", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T10:00:00Z"));
    await aggregateLiveNews();
    const firstRound = fetchCalls.length;
    expect(firstRound).toBeGreaterThan(0);
    vi.setSystemTime(new Date("2026-10-14T10:01:00Z")); // +60 s: inside the window
    await aggregateLiveNews();
    expect(fetchCalls.length).toBe(firstRound);
    vi.setSystemTime(new Date("2026-10-14T10:02:01Z")); // +121 s: expired
    await aggregateLiveNews();
    expect(fetchCalls.length).toBe(firstRound * 2);
  });

  it("regions key independently — an INDIA window never serves a CRYPTO call", async () => {
    const indiaFeeds = liveNewsFeedCount("INDIA");
    const cryptoFeeds = liveNewsFeedCount("CRYPTO");
    expect(indiaFeeds).toBeGreaterThan(0);
    expect(cryptoFeeds).toBeGreaterThan(0);
    await aggregateLiveNews("INDIA");
    expect(fetchCalls.length).toBe(indiaFeeds);
    await aggregateLiveNews("CRYPTO");
    expect(fetchCalls.length).toBe(indiaFeeds + cryptoFeeds);
  });

  it("concurrent callers within a window await the SAME in-flight round", async () => {
    const totalFeeds = liveNewsFeedCount(null);
    const [a, b] = await Promise.all([aggregateLiveNews(), aggregateLiveNews()]);
    expect(fetchCalls.length).toBe(totalFeeds); // one round, not two
    expect(b).toEqual(a);
  });
});
