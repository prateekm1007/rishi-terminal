/**
 * LP (latest prices, founder directive 7/8, 2026-10-06) — the chunk
 * waterfall defect, as a testable orchestration contract.
 *
 * The live defect (reproduced against production 2026-10-06 ~05:10Z, raw
 * probe evidence in the PR): the Stocks table rendered 0/916 prices while
 * 16/19 batch chunks had already returned HTTP 200 — because the hook
 * fetched its 50-symbol chunks SEQUENTIALLY and called setPrices only
 * after ALL chunks settled (all-or-nothing). One slow chunk (a cold-cache
 * Yahoo sweep takes seconds) blanks the whole table for the entire fill;
 * one failed chunk (a 429 from the per-IP limiter) DISCARDS every other
 * chunk's data.
 *
 * The contract under test (fetchPricesChunked, hooks/useLivePrices.ts):
 *   1. INCREMENTAL: each completed chunk is delivered as it lands
 *      (onChunk), so consumers render progressively — never gated on the
 *      slowest/last chunk.
 *   2. TOLERANT: a chunk that rejects does NOT discard the other chunks'
 *      data; the failure is reported once with the partial result intact.
 *   3. BOUNDED CONCURRENCY: chunks are fetched in parallel with a small
 *      pool (default 4) — the sequential waterfall was the latency driver.
 *   4. The 50-symbol batch cap is preserved (the route contract).
 *   5. Market state from any chunk's payload is surfaced (cadence stays
 *      server-decided).
 *
 * Rule 21: written FIRST and watched FAIL (the export does not exist on
 * main), then implemented, then GREEN.
 */
import { describe, expect, it, vi } from "vitest";

type ChunkPayload = {
  entries: Record<string, { price?: number; status?: string }>;
  market?: { open: boolean; ttlSeconds: number | null; freshness: "live-delayed" | "close"; sessionDate: string };
};

async function importFresh() {
  const mod = await import("@/hooks/useLivePrices");
  return mod as typeof import("@/hooks/useLivePrices") & {
    fetchPricesChunked?: unknown;
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("LP — fetchPricesChunked: incremental, tolerant, bounded-parallel", () => {
  it("delivers each chunk as it lands (never gated on the last chunk)", async () => {
    const mod = await importFresh();
    if (typeof mod.fetchPricesChunked !== "function") {
      throw new Error("FAIL-FIRST: fetchPricesChunked is not exported yet (hooks/useLivePrices.ts)");
    }
    const fetchPricesChunked = mod.fetchPricesChunked as (
      symbols: string[],
      deps: { fetchChunk: (symbols: string[]) => Promise<ChunkPayload> },
    ) => Promise<{ merged: Record<string, unknown>; markets: ChunkPayload["market"][]; failures: number }>;

    // 3 chunks of 50; chunk 3 NEVER resolves.
    const gate = deferred<void>();
    const calls: string[][] = [];
    const deps = {
      fetchChunk: async (syms: string[]) => {
        calls.push(syms);
        if (calls.length >= 3) {
          await gate.promise; // the stuck chunk
        }
        const entries: Record<string, { price: number }> = {};
        for (const s of syms) entries[s] = { price: 100 };
        return { entries, market: { open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-06" } };
      },
    };
    const symbols = Array.from({ length: 150 }, (_, i) => `S${i}`);
    const onChunk = vi.fn();

    // Do not await the whole thing — assert DURING the run that chunks 1-2
    // were already delivered while chunk 3 is stuck (the live defect: the
    // old code delivered nothing until every chunk settled).
    const run = fetchPricesChunked(symbols, { ...deps, onChunk } as never).then((r) => r);
    // Let the pool start (chunk delivery happens on microtask/schedule).
    await new Promise((r) => setTimeout(r, 150));
    expect(onChunk.mock.calls.length).toBeGreaterThanOrEqual(1);
    // Resolve the stuck chunk and finish.
    gate.resolve(undefined);
    const result = await run;
    expect(Object.keys(result.merged).length).toBe(150);
    expect(result.failures).toBe(0);
  });

  it("a failed chunk does not discard the other chunks' data", async () => {
    const mod = await importFresh();
    if (typeof mod.fetchPricesChunked !== "function") {
      throw new Error("FAIL-FIRST: fetchPricesChunked is not exported yet");
    }
    const fetchPricesChunked = mod.fetchPricesChunked as (
      symbols: string[],
      deps: { fetchChunk: (symbols: string[]) => Promise<ChunkPayload> },
    ) => Promise<{ merged: Record<string, unknown>; markets: ChunkPayload["market"][]; failures: number }>;

    let call = 0;
    const deps = {
      fetchChunk: async (syms: string[]) => {
        call += 1;
        if (call === 2) throw new Error("HTTP 429"); // the failed chunk
        const entries: Record<string, { price: number }> = {};
        for (const s of syms) entries[s] = { price: 200 };
        return { entries };
      },
    };
    const symbols = Array.from({ length: 150 }, (_, i) => `T${i}`);
    const result = await fetchPricesChunked(symbols, deps as never);
    // 100 of 150 symbols still delivered (chunks 1 and 3).
    expect(Object.keys(result.merged).length).toBe(100);
    expect(result.failures).toBe(1);
  });

  it("fetches chunks with bounded concurrency (never one-at-a-time)", async () => {
    const mod = await importFresh();
    if (typeof mod.fetchPricesChunked !== "function") {
      throw new Error("FAIL-FIRST: fetchPricesChunked is not exported yet");
    }
    const fetchPricesChunked = mod.fetchPricesChunked as (
      symbols: string[],
      deps: { fetchChunk: (symbols: string[]) => Promise<ChunkPayload>; concurrency?: number },
    ) => Promise<{ merged: Record<string, unknown>; markets: ChunkPayload["market"][]; failures: number }>;

    let inFlight = 0;
    let maxInFlight = 0;
    const deps = {
      fetchChunk: async (syms: string[]) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 60));
        inFlight -= 1;
        const entries: Record<string, { price: number }> = {};
        for (const s of syms) entries[s] = { price: 300 };
        return { entries };
      },
    };
    const symbols = Array.from({ length: 200 }, (_, i) => `U${i}`); // 4 chunks
    await fetchPricesChunked(symbols, { ...deps, concurrency: 3 } as never);
    // With concurrency 3 across 4 chunks, at least 2 must overlap.
    expect(maxInFlight).toBeGreaterThanOrEqual(2);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("preserves the 50-symbol batch cap", async () => {
    const mod = await importFresh();
    if (typeof mod.fetchPricesChunked !== "function") {
      throw new Error("FAIL-FIRST: fetchPricesChunked is not exported yet");
    }
    const fetchPricesChunked = mod.fetchPricesChunked as (
      symbols: string[],
      deps: { fetchChunk: (symbols: string[]) => Promise<ChunkPayload> },
    ) => Promise<{ merged: Record<string, unknown>; markets: ChunkPayload["market"][]; failures: number }>;
    const sizes: number[] = [];
    const deps = {
      fetchChunk: async (syms: string[]) => {
        sizes.push(syms.length);
        const entries: Record<string, { price: number }> = {};
        for (const s of syms) entries[s] = { price: 400 };
        return { entries };
      },
    };
    const symbols = Array.from({ length: 130 }, (_, i) => `V${i}`);
    await fetchPricesChunked(symbols, deps as never);
    expect(sizes).toEqual([50, 50, 30]);
  });
});
