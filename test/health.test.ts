import { describe, expect, it } from "vitest";
import { computeHealth, latestIngestAt } from "@/lib/health/compute";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const ENGINE = "rishi-merit-v1";

function row(job: string, minutesAgo: number) {
  return {
    job_name: job,
    finished_at: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
  };
}

describe("latestIngestAt", () => {
  it("returns the newest finished_at among the jobs of interest", () => {
    const rows = [row("ingestQuarterly", 30), row("ingestQuarterly", 10), row("ingestPrices", 5)];
    expect(latestIngestAt(rows, ["ingestQuarterly"])).toBe(
      row("ingestQuarterly", 10).finished_at,
    );
  });

  it("returns null when no rows match the job list", () => {
    expect(latestIngestAt([row("somethingElse", 5)], ["ingestPrices"])).toBeNull();
    expect(latestIngestAt([], ["ingestPrices"])).toBeNull();
  });
});

describe("computeHealth", () => {
  it("ok when db reachable and both inputs fresh", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingestPrices", 60), row("ingestQuarterly", 120)],
      engineVersion: ENGINE,
    });
    expect(body.status).toBe("ok");
    expect(body.db).toBe(true);
    expect(body.reasons).toBeUndefined();
  });

  it("degraded when a fresh timestamp goes stale (injected staleness)", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingestPrices", 60), row("ingestQuarterly", 100 * 60)],
      engineVersion: ENGINE,
    });
    expect(body.status).toBe("degraded");
    expect(body.reasons).toEqual(["fundamentals: staleness exceeds SLO"]);
  });

  it("degraded when an input has never been produced (null, not fake-ok)", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingestPrices", 10)],
      engineVersion: ENGINE,
    });
    expect(body.status).toBe("degraded");
    expect(body.lastFundamentalsIngestAt).toBeNull();
    expect(body.reasons).toEqual(["fundamentals: no ingestion recorded yet"]);
  });

  it("down when the db round-trip fails, regardless of rows", () => {
    const body = computeHealth({
      dbOk: false,
      now: NOW,
      ingestionRows: [row("ingestPrices", 1), row("ingestQuarterly", 1)],
      engineVersion: ENGINE,
    });
    expect(body.status).toBe("down");
    expect(body.db).toBe(false);
    expect(body.lastPriceIngestAt).toBeNull();
    // Y2: coverage is UNKNOWN when the DB is down — null, never zero
    expect(body.quoteCache).toBeNull();
  });

  it("never leaks secrets — payload keys are fixed (quoteCache counts are the bounded quote_cache table's own coverage, Y2)", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingestPrices", 1), row("ingestQuarterly", 1)],
      engineVersion: ENGINE,
    });
    expect(Object.keys(body).sort()).toEqual(
      [
        "asOf",
        "db",
        "engineVersion",
        "lastFundamentalsIngestAt",
        "lastPriceIngestAt",
        "quoteCache",
        "status",
      ].sort(),
    );
  });

  it("Y2: quoteCache passes through verbatim when provided (telemetry, never severity)", () => {
    const quoteCache = {
      equities: { fresh: 870, total: 916, coverage: 870 / 916 },
      tiles: { fresh: 0, total: 16, coverage: 0 },
      windowSeconds: 1800,
      asOf: "2026-10-05T04:00:00.000+00:00",
    };
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingestPrices", 1), row("ingestQuarterly", 1)],
      engineVersion: ENGINE,
      quoteCache,
    });
    expect(body.quoteCache).toEqual(quoteCache);
    // zero tile coverage must NOT degrade the core verdict by itself
    expect(body.status).toBe("ok");
    expect(body.reasons).toBeUndefined();
  });

  it("Y2: quoteCache is null when the coverage probe could not run (unknown, not zero)", () => {
    const body = computeHealth({
      dbOk: true,
      now: NOW,
      ingestionRows: [row("ingestPrices", 1), row("ingestQuarterly", 1)],
      engineVersion: ENGINE,
      quoteCache: null,
    });
    expect(body.quoteCache).toBeNull();
    expect(body.status).toBe("ok");
  });
});
