/**
 * N8 (round 3) — /api/health is not a DB hammer.
 *
 * Before: two service-role queries per request (users count + a 200-row
 * ingestion_log read), Cache-Control: no-store, no limit.
 * After: ONE health_probe(...) RPC (timestamps only) behind a 12 s
 * server-side memo; failures are not memoized.
 *
 * Y2 (Round 12): the probe window now also runs ONE quote_cache_coverage
 * RPC (the warmer's coverage telemetry) — still memoized in the SAME
 * window, so 50 rapid requests cause at most 1 round-trip PER RPC. The
 * coverage call is best-effort telemetry: a failure there reports
 * quoteCache: null and NEVER degrades the core health verdict (the core
 * probe alone decides status; the warmer is new infra, not a page-severity
 * input — disclosed in the Y2 PR).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const callsByFn: Record<string, number> = {};
let rpcResult: { data: unknown; error: unknown } = { data: null, error: null };
let coverageResult: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock("@/lib/db/supabase", () => ({
  getServiceSupabase: () => ({
    rpc: async (fn: string) => {
      callsByFn[fn] = (callsByFn[fn] ?? 0) + 1;
      return fn === "quote_cache_coverage" ? coverageResult : rpcResult;
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

function freshCoverageResult(fresh = 900, total = 916) {
  return {
    data: {
      equities: { fresh, total },
      tiles: { fresh: 16, total: 16 },
      asOf: "2026-10-05T04:00:00.000+00:00",
    },
    error: null,
  };
}

beforeEach(() => {
  resetHealthMemo();
  for (const k of Object.keys(callsByFn)) delete callsByFn[k];
  rpcResult = freshProbeResult();
  coverageResult = freshCoverageResult();
});

describe("N8 — memoized health probe", () => {
  it("50 rapid requests cause exactly 1 round-trip per RPC (probe + coverage, Y2)", async () => {
    const bodies = await Promise.all(
      Array.from({ length: 50 }, () => getHealthBody()),
    );
    expect(bodies).toHaveLength(50);
    expect(bodies.every((b) => b.db)).toBe(true);
    expect(callsByFn["health_probe"]).toBe(1);
    expect(callsByFn["quote_cache_coverage"]).toBe(1);
  });

  it("sequential rapid requests also hit the memo (no per-request probe)", async () => {
    for (let i = 0; i < 10; i += 1) {
      const body = await getHealthBody();
      expect(body.status).not.toBe("down");
    }
    expect(callsByFn["health_probe"]).toBe(1);
    expect(callsByFn["quote_cache_coverage"]).toBe(1);
  });

  it("after the window expires, the next request re-probes BOTH RPCs", async () => {
    await getHealthBody();
    expect(callsByFn["health_probe"]).toBe(1);

    // Expire the window without waiting wall-clock time.
    const g = globalThis as unknown as { __rishiHealthMemo?: { probedAt: number } };
    g.__rishiHealthMemo!.probedAt = Date.now() - (HEALTH_MEMO_TTL_MS + 1);

    await getHealthBody();
    expect(callsByFn["health_probe"]).toBe(2);
    expect(callsByFn["quote_cache_coverage"]).toBe(2);
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
    expect(callsByFn["health_probe"]).toBe(2); // the down result did not burn a window
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

describe("Y2 — quote-cache coverage telemetry (best-effort, never page-severity)", () => {
  it("maps the RPC counts into fresh/total/coverage per class, with the window and asOf", async () => {
    coverageResult = freshCoverageResult(870, 916);
    const body = await getHealthBody();
    expect(body.quoteCache).toEqual({
      equities: { fresh: 870, total: 916, coverage: 870 / 916 },
      tiles: { fresh: 16, total: 16, coverage: 1 },
      windowSeconds: 1800,
      asOf: "2026-10-05T04:00:00.000+00:00",
    });
    // telemetry NEVER flips the core verdict
    expect(body.status).not.toBe("down");
  });

  it("an RPC error reports quoteCache: null and leaves the core verdict intact", async () => {
    coverageResult = { data: null, error: { message: "function does not exist" } };
    const body = await getHealthBody();
    expect(body.quoteCache).toBeNull();
    expect(body.db).toBe(true);
    expect(body.status).not.toBe("down"); // degraded only by core SLOs, never by coverage
  });

  it("a DB-wide failure reports down WITH quoteCache: null (unknown, not zero)", async () => {
    rpcResult = { data: null, error: { message: "connection refused" } };
    coverageResult = { data: null, error: { message: "connection refused" } };
    const body = await getHealthBody();
    expect(body.status).toBe("down");
    expect(body.quoteCache).toBeNull();
  });
});
