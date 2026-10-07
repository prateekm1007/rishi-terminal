import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * NS1 (2026-10-07) — the nightly_snapshot completion defect, fail-first (C5).
 *
 * Production evidence (rule 25, raw SQL via the Management API, 2026-10-07):
 *   - ingestion_log has ZERO nightly_snapshot rows EVER (the function is
 *     killed at maxDuration=60 BEFORE logIngestion — /api/health can never
 *     see this job);
 *   - rishi_snapshots lands 376-480 of the 896-symbol universe per day
 *     (42-54% partial), last write always ~13:54:21Z — the same 60 s kill,
 *     every day.
 *
 * Root cause: snapshotAllStocks issued ONE upsert per symbol (~896 serial
 * DB round-trips) inside a single 60 s serverless function. The fix is the
 * LP2 precedent: build all rows first, then ONE batched upsert per bounded
 * chunk. These pins fail on a return to per-symbol round-trips — the exact
 * defect that killed the job.
 */

const recorder = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; rows: unknown; opts: unknown; error: Error | null }>,
  reset() {
    this.calls = [];
  },
  failNextBatches: 0,
}));

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (table: string) => ({
      upsert: (rows: unknown, opts: unknown) => {
        const isError = recorder.failNextBatches > 0;
        if (isError) recorder.failNextBatches--;
        const call = { table, rows, opts, error: isError ? new Error("batch write failed") : null };
        recorder.calls.push(call);
        return Promise.resolve(call);
      },
    }),
  }),
}));

import { snapshotAllStocks } from "@/lib/services/rishiMemory";

const UNIVERSE = 896; // data/stocks registry size (the E4 universe)
const BATCH = 100;

describe("NS1 — nightly_snapshot completes inside the 60 s budget", () => {
  beforeEach(() => {
    recorder.reset();
    recorder.failNextBatches = 0;
  });

  it("issues BOUNDED batched upserts, not one round-trip per symbol (the kill vector)", async () => {
    const r = await snapshotAllStocks();
    const snapshotCalls = recorder.calls.filter((c) => c.table === "rishi_snapshots");
    // 896 rows in <=100-row chunks = 9 batches; one-per-symbol would be ~896.
    // The margin allows consensus-null skips (T11) to shrink the row count.
    expect(snapshotCalls.length).toBeGreaterThan(0);
    expect(snapshotCalls.length).toBeLessThanOrEqual(Math.ceil(UNIVERSE / BATCH) + 1);
    expect(snapshotCalls.length).toBeLessThan(50); // the bite: current code makes ~896
    const covered = snapshotCalls.reduce((n, c) => n + (Array.isArray(c.rows) ? c.rows.length : 1), 0);
    expect(covered).toBeGreaterThan(800); // the real universe minus honest skips
    expect(r.snapshots + r.errors).toBe(covered);
  });

  it("never sends an oversized batch (bounded payload per round-trip)", async () => {
    await snapshotAllStocks();
    for (const c of recorder.calls.filter((x) => x.table === "rishi_snapshots")) {
      expect(Array.isArray(c.rows)).toBe(true);
      expect((c.rows as unknown[]).length).toBeLessThanOrEqual(BATCH);
    }
  });

  it("keeps the idempotency contract: onConflict symbol,snapshot_date + ignoreDuplicates on every batch", async () => {
    await snapshotAllStocks();
    const calls = recorder.calls.filter((c) => c.table === "rishi_snapshots");
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.opts).toMatchObject({
        onConflict: "symbol,snapshot_date",
        ignoreDuplicates: true,
      });
    }
  });

  it("a failed batch counts its rows as errors and never throws (retry completes the rest)", async () => {
    recorder.failNextBatches = 1;
    const r = await snapshotAllStocks();
    const failed = recorder.calls.find((c) => c.error !== null);
    expect(failed).toBeDefined();
    expect(Array.isArray(failed?.rows)).toBe(true);
    const failedCount = (failed?.rows as unknown[]).length;
    expect(r.errors).toBe(failedCount);
    expect(r.snapshots).toBeGreaterThan(0);
    // A retry of the whole job is still a no-op for already-written rows
    // (ignoreDuplicates) and completes the missing chunk — rule 11.
  });

  it("reports null-consensus skips SEPARATELY from write errors (honest coverage, never 'success' with holes)", async () => {
    const r = await snapshotAllStocks();
    expect(r).toHaveProperty("skipped");
    expect(typeof r.skipped).toBe("number");
    expect(r.skipped).toBeGreaterThanOrEqual(0);
    // snapshots + errors = rows built and written; skipped = T11 fail-closed
    // holes the route maps to status "partial" — three distinct honest
    // counters, no folding skips into errors or vice versa.
    expect(r.snapshots + r.errors).toBeGreaterThan(800);
  });
});
