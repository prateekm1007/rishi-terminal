import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

/**
 * Coder Directions §9 (2026-10-02) — /api/pulse/currency Rule-16 contract.
 *
 * Pre-fix defects (both fabricated market observations):
 *   1. `prev = chartPreviousClose ?? previousClose ?? price` — the banned
 *      "previousClose → price" fallback: a missing previous close computed
 *      change = price − price = 0 (a fabricated flat day).
 *   2. rejected/missing pairs became `{ rate: 0, change: 0, changePct: 0 }`
 *      rows (a fake ₹0 rate).
 * Also Rule 10: the 500 body leaked `String(err)` upstream text.
 *
 * The contract now: only pairs with a REAL observation are served; every
 * other pair is OMITTED (the page renders its explicit unavailable state).
 */

const REAL_FETCH = globalThis.fetch;

function chartMeta(meta: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ chart: { result: [{ meta }] } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("/api/pulse/currency — null semantics (§9)", () => {
  it("MUST FAIL PRE-FIX: pairs without a genuine previous close or price are OMITTED — never zero-filled flat rows", async () => {
    const { GET } = await import("@/app/api/pulse/currency/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.includes("USDINR")) {
        return chartMeta({ regularMarketPrice: 83.52, chartPreviousClose: 83.4 });
      }
      if (url.includes("EURINR")) {
        // price present but NO previous close of any kind → no observation
        return chartMeta({ regularMarketPrice: 90.31 });
      }
      if (url.includes("GBPINR")) {
        throw new TypeError("fetch failed"); // upstream outage
      }
      // JPYINR: no price at all
      return chartMeta({ chartPreviousClose: 0.52 });
    });

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    // Exactly the ONE pair with a full observation; the fabricated rows are
    // gone (pre-fix: 4 rows with EURINR change=0, JPYINR rate=0, GBP rate=0).
    expect(body.currencies).toHaveLength(1);
    expect(body.currencies[0]).toMatchObject({ pair: "USD/INR", rate: 83.52, change: 0.12 });
    for (const row of body.currencies) {
      expect(row.rate).toBeGreaterThan(0);
    }
  });

  it("an upstream outage on every pair → 200 with an empty list (honest absence), never error rows or upstream detail", async () => {
    vi.restoreAllMocks();
    (globalThis as { fetch: unknown }).fetch = vi.fn(async () => {
      throw new Error("secret upstream host api.internal.example refused connection");
    }) as unknown as typeof fetch;
    const { GET } = await import("@/app/api/pulse/currency/route");
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.currencies).toEqual([]);
    // Rule 10: no upstream exception text ever rides outward.
    expect(JSON.stringify(body)).not.toContain("api.internal.example");
    expect(body.detail).toBeUndefined();
  });
});
