/**
 * G6 (founder round 23) — the health ingest signal tracks real writers.
 *
 * Defect: PRICE_INGEST_JOBS named "ingestPrices" and
 * FUNDAMENTALS_INGEST_JOBS named "ingestQuarterly"/"ingestFundamentals" —
 * job names NO route writes (actual logIngestion callers: "nightly_snapshot"
 * = consensus scores, "reference_observations" = FRED/FX,
 * "ingest_financials" = fundamentals). lastPriceIngestAt and
 * lastFundamentalsIngestAt were therefore structurally null and /api/health
 * reported "degraded / no ingestion recorded yet" permanently — verified on
 * production 2026-10-07 ~06:29Z while the pg_cron warmer held 815/916
 * fresh. The E4 acceptance point "/api/health agreement" cannot close
 * against a dead signal.
 *
 * Fix: the quotes-warm warmer logs "quotes_warm" per non-skipped slice
 * (records_out = upstream writes; misses → "partial"; off-session no-ops
 * log nothing — nothing was ingested), and the SLO lists name the real
 * jobs. Fail-first: on pre-fix main every block below fails.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { computeHealth } from "../lib/health/compute";
import {
  PRICE_INGEST_JOBS,
  FUNDAMENTALS_INGEST_JOBS,
  PRICE_STALENESS_SLO_MS,
} from "../lib/health/slo";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");

const NOW = new Date("2026-10-07T06:00:00.000Z");
const ENGINE = "rishi-merit-v1";
const row = (job: string, minutesAgo: number) => ({
  job_name: job,
  finished_at: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
});

describe("G6 — the SLO lists name jobs real routes write", () => {
  it("MUST FAIL PRE-FIX: PRICE_INGEST_JOBS includes the warmer's job name", () => {
    expect(PRICE_INGEST_JOBS).toContain("quotes_warm");
  });

  it("MUST FAIL PRE-FIX: FUNDAMENTALS_INGEST_JOBS includes the financials route's job name", () => {
    expect(FUNDAMENTALS_INGEST_JOBS).toContain("ingest_financials");
  });

  it("no list entry is a job no route writes (the dead-signal defect class)", () => {
    // The actual logIngestion callers in the tree:
    const routeSources = [
      "app/api/ingest/snapshot/route.ts",
      "app/api/ingest/observations/route.ts",
      "app/api/ingest/financials/route.ts",
      "app/api/ingest/quotes-warm/route.ts",
    ].map(read);
    const written = new Set<string>();
    for (const src of routeSources) {
      for (const m of src.matchAll(/job_name:\s*"([^"]+)"/g)) written.add(m[1]);
    }
    for (const job of [...PRICE_INGEST_JOBS, ...FUNDAMENTALS_INGEST_JOBS]) {
      expect(written, `job "${job}" must be written by an ingest route`).toContain(job);
    }
  });
});

describe("G6 — computeHealth keys off the real job names", () => {
  it("MUST FAIL PRE-FIX: a recent quotes_warm row clears the price reason", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("quotes_warm", 5)],
      engineVersion: ENGINE,
    });
    expect(body.lastPriceIngestAt).not.toBeNull();
    expect(body.reasons ?? []).not.toContain("prices: no ingestion recorded yet");
  });

  it("MUST FAIL PRE-FIX: a recent ingest_financials row clears the fundamentals reason", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingest_financials", 30)],
      engineVersion: ENGINE,
    });
    expect(body.lastFundamentalsIngestAt).not.toBeNull();
    expect(body.reasons ?? []).not.toContain("fundamentals: no ingestion recorded yet");
  });

  it("both signals fresh → status ok (the E4 health-agreement state)", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("quotes_warm", 5), row("ingest_financials", 30)],
      engineVersion: ENGINE,
    });
    expect(body.status).toBe("ok");
    expect(body.reasons).toBeUndefined();
  });

  it("the staleness SLO still bites on the real job name", () => {
    const tooOld =
      PRICE_STALENESS_SLO_MS / 60_000 + 60; // SLO + 1h in minutes
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("quotes_warm", tooOld)],
      engineVersion: ENGINE,
    });
    expect(body.reasons ?? []).toContain("prices: staleness exceeds SLO");
  });

  it("no rows at all stays honestly degraded (clean server, nothing ingested)", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [],
      engineVersion: ENGINE,
    });
    expect(body.status).toBe("degraded");
    expect(body.reasons).toContain("prices: no ingestion recorded yet");
    expect(body.reasons).toContain("fundamentals: no ingestion recorded yet");
  });
});

describe("G6 — the warmer logs what it actually ingested", () => {
  const warmer = read("app/api/ingest/quotes-warm/route.ts");

  it("MUST FAIL PRE-FIX: the warmer records a quotes_warm ingestion row", () => {
    expect(warmer).toContain('job_name: "quotes_warm"');
  });

  it("records_out counts upstream writes, not fresh-cache serves", () => {
    expect(warmer).toContain("records_out: upstreamWrites");
  });

  it("misses make the row partial — the log never implies complete coverage", () => {
    expect(warmer).toContain('totalMisses > 0 ? "partial" : "success"');
  });

  it("the off-session no-op logs nothing (nothing was ingested)", () => {
    // The no-op return must precede the logIngestion call site.
    const noopIdx = warmer.indexOf('skipped: "market closed"');
    const logIdx = warmer.indexOf('job_name: "quotes_warm"');
    expect(noopIdx).toBeGreaterThan(-1);
    expect(logIdx).toBeGreaterThan(noopIdx);
  });
});

describe("NS1 health agreement (round 28) — the daily snapshot is a live fundamentals-adjacent signal", () => {
  // The pre-registered NS1 acceptance runbook
  // (docs/evidence/round26/ns1-acceptance-runbook.md) requires: "the
  // fundamentals 'no ingestion recorded yet' reason must CLEAR once the
  // first real nightly_snapshot row exists; if it does not, that is a
  // blocking health/data-plane disagreement."
  //
  // Observed on production 2026-10-08: the first REAL scheduled
  // nightly_snapshot row landed (started 13:53:21Z, status success,
  // records_out 896, 5.0s) while /api/health still reported
  // "fundamentals: no ingestion recorded yet" — the signal list named
  // only "ingest_financials", a job with ZERO rows ever (G6 round-24:
  // honestly never-produced pending the founder's source decision).
  // Fail-first: on pre-fix main both tests below fail.

  it("MUST FAIL PRE-FIX: FUNDAMENTALS_INGEST_JOBS includes the snapshot route's job name", () => {
    expect(FUNDAMENTALS_INGEST_JOBS).toContain("nightly_snapshot");
  });

  it("MUST FAIL PRE-FIX: a recent nightly_snapshot row clears the fundamentals reason", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("nightly_snapshot", 30)],
      engineVersion: ENGINE,
    });
    expect(body.lastFundamentalsIngestAt).not.toBeNull();
    expect(body.reasons ?? []).not.toContain("fundamentals: no ingestion recorded yet");
  });

  it("positive control: ingest_financials stays a recognized fundamentals identity", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingest_financials", 30)],
      engineVersion: ENGINE,
    });
    expect(body.lastFundamentalsIngestAt).not.toBeNull();
  });
});
