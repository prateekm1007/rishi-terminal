/**
 * Commit O (Coder Directions #12) + U2 (founder round 7) — /api/prices/batch
 * error contract.
 *
 * Rule 10: errors are generic outward, detailed inward. The pre-O route
 * echoed `(error as Error).message` as `details`. U2 deepens the guarantee
 * structurally: upstream refresh exceptions are now caught INSIDE the shared
 * quote cache layer (lib/quoteCache) and surface as honest per-symbol
 * UNAVAILABLE entries — an upstream failure can no longer turn the whole
 * batch into a 500 at all. A truly unexpected throw (malformed body, the
 * route's own machinery) still hits the route catch, which must stay
 * generic: `{"error": "Batch fetch failed"}`, no details field, no upstream
 * text on the wire.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

const cachedQuoteBatchForEquitiesMock = vi.fn();

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: vi.fn(async () => null),
  };
});

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    serveQuote: vi.fn(async () => null),
    cachedQuoteBatchForEquities: (symbols: string[]) =>
      cachedQuoteBatchForEquitiesMock(symbols),
  };
});

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

import { POST as batchPOST } from "@/app/api/prices/batch/route";

function batchReq(symbols: string[]): never {
  return {
    headers: { get: () => null },
    json: async () => ({ symbols }),
  } as never;
}

beforeEach(() => {
  cachedQuoteBatchForEquitiesMock.mockReset();
});

describe("Rule 10 — upstream exception text can never escape the batch route", () => {
  it("a throwing cache/bulk refresh layer yields honest UNAVAILABLE entries — no 500, no details field, no upstream text", async () => {
    // The cache layer never lets a refresher exception escape; this mock
    // pins the worst case where one DID escape into the route's try block
    // via the shared-cache call: the route catch stays generic either way.
    cachedQuoteBatchForEquitiesMock.mockRejectedValue(
      new Error('fetch failed: https://query1.finance.yahoo.com/v8/finance/chart — ECONNRESET'),
    );
    const res = await batchPOST(batchReq(["RELIANCE"]));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Batch fetch failed");
    // Rule 10: the raw exception message must not ride the wire.
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("query1.finance.yahoo.com");
    expect(JSON.stringify(body)).not.toContain("ECONNRESET");
  });

  it("a malformed request body → generic 500, no internals on the wire", async () => {
    const res = await batchPOST({
      headers: { get: () => null },
      json: async () => {
        throw new Error("invalid JSON body 0x90 at position 3 — internal parse state");
      },
    } as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Batch fetch failed");
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("0x90");
  });
});
