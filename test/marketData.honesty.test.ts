/**
 * Audit 2026-10-02 (P1) — market-data honesty unit bites.
 *
 *  1. CoinGecko transport must carry 24h VOLUME (the /crypto page's "Volume
 *     24h" card summed PRICES — the wrong metric entirely).
 *  2. Bond maturity state: an instrument whose maturityDate has passed is
 *     MATURED (IN91DTB matured 2026-08-15 while still listed as a normal
 *     row) — derived from the date, never re-hardcoded, and never silently
 *     replaced with an invented date.
 *
 * Rule 21: written and run BEFORE the implementations (raw output in PR).
 */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { fetchLivePrice } from "@/lib/livePrice";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import { bondMaturityState } from "@/lib/bonds/maturity";
import { BONDS } from "@/data/bonds";

const REAL_FETCH = globalThis.fetch;

beforeEach(() => resetProviderHealth());
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("P1 crypto volume — the transport carries the real metric", () => {
  it("MUST FAIL PRE-FIX: CoinGecko asks for 24h volume; disclosed volume rides the observation; absent stays null", async () => {
    // One mocked BATCH covering both cases (the module-level cache gates
    // refetches for 60s, so per-test mocks after the first would never run).
    let requestedUrl = "";
    (globalThis as { fetch: unknown }).fetch = vi.fn(async (url: unknown) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          bitcoin: { usd: 98500, usd_24h_change: 2.45, usd_24h_vol: 45000000000 },
          ethereum: { usd: 3850, usd_24h_change: 3.1 }, // no volume disclosed
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const btc = await fetchLivePrice("BTC");
    expect(requestedUrl).toContain("include_24hr_vol=true");
    expect(btc).not.toBeNull();
    expect(btc!.volume24h).toBe(45000000000);

    const eth = await fetchLivePrice("ETH");
    expect(eth).not.toBeNull();
    // Absent volume is null, never 0 (0 would claim zero trading).
    expect(eth!.volume24h ?? null).toBeNull();
  });
});

describe("P1 bond maturity — dated, derived, never re-hardcoded", () => {
  const NOW = new Date("2026-10-01T00:00:00.000Z");

  // Round-4 asserted the weaker invariant: a matured instrument that was
  // still listed had to be LABELLED matured. Round-5 audit (finding 5)
  // strengthens it: a matured instrument must not be listed at all —
  // IN91DTB and US3MTB (both matured 2026-08-15) were removed from the
  // dataset, so the test now pins their absence. Test flip documented per
  // rule 21: the old expectation ("labelled matured while listed") is
  // superseded by "not listed".
  it("round-5: matured instruments are absent from the dataset (IN91DTB, US3MTB removed)", () => {
    expect(BONDS.find(b => b.symbol === "IN91DTB")).toBeUndefined();
    expect(BONDS.find(b => b.symbol === "US3MTB")).toBeUndefined();
    // The derived-state function itself still classifies the removed
    // dates correctly, so any future listing that reintroduces them
    // cannot silently present them as active.
    expect(bondMaturityState("2026-08-15", NOW)).toBe("matured");
  });

  it("a future-dated instrument is active; the boundary day itself is matured", () => {
    expect(bondMaturityState("2036-04-15", NOW)).toBe("active");
    expect(bondMaturityState("2026-10-01", NOW)).toBe("matured");
    expect(bondMaturityState("2026-08-15", NOW)).toBe("matured");
  });

  it("every bond in the dataset resolves to a known state (no invented states)", () => {
    for (const b of BONDS) {
      expect(["active", "matured"]).toContain(bondMaturityState(b.maturityDate, NOW));
    }
  });

  it("round-5: no listed bond is already matured", () => {
    for (const b of BONDS) {
      expect(
        bondMaturityState(b.maturityDate, NOW),
        `${b.symbol} (${b.maturityDate}) must not be listed as matured`,
      ).toBe("active");
    }
  });
});
