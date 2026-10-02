/**
 * Commit O (Coder Directions #12) — /api/prices/batch error contract.
 *
 * Rule 10: errors are generic outward, detailed inward. The batch route's
 * catch block echoed `(error as Error).message` as `details` — upstream
 * exception text (vendor URLs, fetch failures, internal messages) could
 * reach the client. Fail-first (Rule 21): the leak row failed pre-fix.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

const bulkFetchMock = vi.fn();

vi.mock("@/lib/nse/bulkFetch", () => ({
  fetchBulkPricesForSymbols: (...args: unknown[]) => bulkFetchMock(...args),
}));

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: vi.fn(async () => null),
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
  bulkFetchMock.mockReset();
});

describe("MUST FAIL PRE-O5: upstream exception text can never escape the batch route", () => {
  it("a throwing bulk fetch yields a generic 500 — no details field, no upstream text", async () => {
    bulkFetchMock.mockRejectedValue(
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
});
