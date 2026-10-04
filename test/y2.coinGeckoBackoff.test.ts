/**
 * Y2 follow-up (Round 12) — CoinGecko 429 resilience for the tile warm.
 *
 * Live evidence (2026-10-04, production + local repro): the crypto tile
 * symbols (BTC/ETH/SOL/BNB) fail to warm through serveQuote while the
 * direct fetchLivePrice path succeeds in the same minute. The local repro
 * names the cause exactly: "[CoinGecko] batch error: Error: CoinGecko
 * HTTP 429" — the free tier throttles per IP, and the warmer's sweep
 * rides the same egress. One 429 previously poisoned the whole batch
 * (four tile misses per sweep, every sweep).
 *
 * Pinned here (fail-first, Rule 21):
 *   1. A 429 followed by a success is SERVED — the batch fetch retries
 *      with a bounded backoff instead of giving up on the first 429.
 *   2. The backoff is BOUNDED (2 retries) — a persistently throttling
 *      upstream still returns in seconds, never hangs the request.
 *   3. Persistent 429s stay an honest miss (null) — never a zero-priced
 *      quote (Rule 16).
 *   4. The retry only applies to rate-limit class responses (429/503),
 *      never to a 200-with-garbage (parse honesty unchanged).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", (...args: unknown[]) => fetchMock(...(args as [RequestInfo, RequestInit?])));

const OK_BODY = {
  bitcoin: { usd: 84809, usd_24h_change: 0.2468, usd_24h_vol: 14587242406, last_updated_at: 1759577640 },
  ethereum: { usd: 2694.04, usd_24h_change: 0.54, usd_24h_vol: 4836259359, last_updated_at: 1759577660 },
  solana: { usd: 152.3, usd_24h_change: -0.4, usd_24h_vol: 1234567, last_updated_at: 1759577661 },
  binancecoin: { usd: 612.5, usd_24h_change: 0.1, usd_24h_vol: 7654321, last_updated_at: 1759577662 },
};

function ok(body: Record<string, Record<string, number>> = OK_BODY) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}
function tooMany() {
  return new Response("Too Many Requests", { status: 429 });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Y2 follow-up — CoinGecko batch 429 backoff", () => {
  it("serves the batch when a 429 is followed by a success (the warmer's exact live failure)", async () => {
    fetchMock
      .mockResolvedValueOnce(tooMany())
      .mockResolvedValueOnce(ok());

    // Import fresh so the module-level CoinGecko memo starts empty.
    vi.resetModules();
    const { fetchLivePrice } = await import("@/lib/livePrice");

    const p = fetchLivePrice("BTC");
    // Drive the backoff sleeps explicitly (fake timers): 500 ms covers the
    // first retry; the second fetch returns 200 so no further sleep fires.
    await vi.advanceTimersByTimeAsync(600);
    const settled = await p;

    expect(settled).not.toBeNull();
    expect(settled!.price).toBe(84809);
    expect(settled!.source).toBe("coingecko");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("bounded: at most 2 retries (3 attempts) — a persistent 429 is an honest miss, not a hang", async () => {
    // ETH: a distinct symbol per test — the snapshot-reuse store is keyed
    // per symbol and survives module resets (globalThis-backed), so BTC's
    // successful quote from the previous test must not answer for ETH.
    fetchMock.mockResolvedValue(tooMany());

    vi.resetModules();
    const { fetchLivePrice } = await import("@/lib/livePrice");

    const p = fetchLivePrice("ETH");
    for (let i = 0; i < 40; i++) {
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
    }
    const settled = await p;

    expect(settled).toBeNull(); // honest unavailability — never a fake quote
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3); // 1 + 2 retries
  });

  it("a 200 with a useless payload is NOT retried into existence (parse honesty unchanged)", async () => {
    // SOL: distinct symbol (see the ETH note above).
    fetchMock.mockResolvedValue(ok({ solana: { usd: 0, usd_24h_change: 0, usd_24h_vol: 0, last_updated_at: 1759577661 } })); // price-less entry

    vi.resetModules();
    const { fetchLivePrice } = await import("@/lib/livePrice");

    const settled = await fetchLivePrice("SOL");
    expect(settled).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry on a parse-level miss
  });
});
