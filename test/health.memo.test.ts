/**
 * N8 (round 3) — /api/health is not a DB hammer.
 *
 * Before: two service-role queries per request (users count + a 200-row
 * ingestion_log read), Cache-Control: no-store, no limit.
 * After: ONE health_probe(...) RPC (timestamps only) behind a 12 s
 * server-side memo; failures are not memoized.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let rpcCalls = 0;
let rpcResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

vi.mock("@/lib/db/supabase", () => ({
  getServiceSupabase: () => ({
    rpc: async () => {
      rpcCalls += 1;
      return rpcResult;
    },
  }),
}));

import {
  getHealthBody,
  resetHealthMemo,
  HEALTH_MEMO_TTL_MS,
} from "@/lib/health/probe";

function freshProbeResult() {
  return {
    data: {
      users_visible: true,
      last_price_ingest_at: new Date(Date.now() - 5 * 60_000).toISOString(),
      last_fundamentals_ingest_at: null,
    },
    error: null,
  };
}

beforeEach(() => {
  resetHealthMemo();
  rpcCalls = 0;
  rpcResult = freshProbeResult();
});

describe("N8 — memoized health probe", () => {
  it("50 rapid requests cause exactly 1 DB round-trip", async () => {
    const bodies = await Promise.all(
      Array.from({ length: 50 }, () => getHealthBody()),
    );
    expect(bodies).toHaveLength(50);
    expect(bodies.every((b) => b.db)).toBe(true);
    expect(rpcCalls).toBe(1);
  });

  it("sequential rapid requests also hit the memo (no per-request probe)", async () => {
    for (let i = 0; i < 10; i++) {
      const body = await getHealthBody();
      expect(body.status).not.toBe("down");
    }
    expect(rpcCalls).toBe(1);
  });

  it("after the window expires, the next request re-probes", async () => {
    await getHealthBody();
    expect(rpcCalls).toBe(1);

    // Expire the window without waiting wall-clock time.
    const g = globalThis as unknown as { __rishiHealthMemo?: { probedAt: number } };
    g.__rishiHealthMemo!.probedAt = Date.now() - (HEALTH_MEMO_TTL_MS + 1);

    await getHealthBody();
    expect(rpcCalls).toBe(2);
  });

  it("a DB failure is NOT memoized — the next request re-probes (and can recover)", async () => {
    rpcResult = { data: null, error: { message: "connection refused" } };
    const down = await getHealthBody();
    expect(down.status).toBe("down");
    expect(down.db).toBe(false);

    // Recovery: next request probes again and reports ok.
    rpcResult = freshProbeResult();
    const recovered = await getHealthBody();
    expect(recovered.status).not.toBe("down");
    expect(recovered.db).toBe(true);
    expect(rpcCalls).toBe(2); // the down result did not burn a window
  });

  it("users_visible: false reports down (schema absent), also unmemoized", async () => {
    rpcResult = {
      data: { users_visible: false, last_price_ingest_at: null, last_fundamentals_ingest_at: null },
      error: null,
    };
    const body = await getHealthBody();
    expect(body.status).toBe("down");
  });

  it("the memoized body's asOf is the PROBE time, not the response time", async () => {
    const first = await getHealthBody();
    const probedAt = first.asOf;
    await new Promise((r) => setTimeout(r, 30));
    const second = await getHealthBody();
    expect(second.asOf).toBe(probedAt); // same memo, same honest timestamp
  });
});
