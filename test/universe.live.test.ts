/**
 * Round-47 P1-LIVE-UNIVERSE (founder order, 2026-10-11 — work-order
 * item 8, stage 1):
 *
 *   "Pick a live universe, starting with Nifty 100 or Nifty 50, from
 *    NSE's equity list, bhavcopy and filings, with dataQuality set to
 *    live or delayed. Everything else shows no verdict. Decision for
 *    you: confirm the universe and the data route. I recommend the
 *    free official route from the earlier plan for now."
 *
 * DECISION — ALIGNED to the binding record (PR #351, the parallel
 * session's licensing review of the founder's licensing message
 * 2026-10-11): universe = NIFTY 100 (this module first shipped NIFTY
 * 50-first; the #351 decision record supersedes and the constant is
 * aligned). Route = the free official NSE sources: the official
 * constituents payload (nseindia.com/api/equity-stockIndices?index=
 * NIFTY 100), the official EOD bhavcopy (archives.nseindia.com/content/
 * historical/EQUITIES/.../cmDDMONYYYYbhav.csv) and NSE filings/
 * quote-equity for fundamentals. No third-party research scrapers.
 *
 * What this pin enforces (stage 1 — the universe module itself; the
 * record-level quality flip lands with the ingest job, stage 2):
 *   1. The constituents fetch parses the OFFICIAL payload shape (zod,
 *      rule 9) and returns exactly the 50 constituents — the index's
 *      own aggregate row is EXCLUDED.
 *   2. Fail-closed (rule 6): HTTP failure, schema mismatch, empty
 *      data, or a short list (<50) yields null — never a partial
 *      universe presented as THE universe.
 *   3. The bhavcopy parser handles the official CSV columns (EQ rows
 *      only) and rejects malformed rows.
 *   4. The dataQuality policy: a record flips to 'delayed' ONLY when
 *      both an official price observation (bhavcopy, fresh within the
 *      staleness bound) AND a fundamentals observation exist for it;
 *      anything less keeps 'seed' (verdicts stay withheld — the P0-1
 *      gate). Live fundamentals + live quote may claim 'live'.
 *   5. Positive controls (B-18): the universe module exports the
 *      policy constants; the route serves the universe state.
 *   6. The patterns bite (C5).
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");

const FIXTURE_CONSTITUENTS = JSON.parse(
  read("test/fixtures/universe/universe-constituents.json"),
) as unknown;

describe("P1 — live universe stage 1 (NIFTY 100 per the #351 decision record, official NSE route)", () => {
  it("parses the official constituents payload and returns exactly the 100 symbols", async () => {
    const { parseUniverseConstituents } = await import("../lib/universe/constituents");
    const u = parseUniverseConstituents(FIXTURE_CONSTITUENTS);
    expect(u).not.toBeNull();
    expect(u!.symbols).toHaveLength(100);
    expect(u!.symbols).toContain("RELIANCE");
    expect(u!.symbols).toContain("HDFCBANK");
    // the index's own aggregate row is NOT a constituent
    expect(u!.symbols).not.toContain("NIFTY 100");
    expect(u!.source).toBe("nse:equity-stockIndices");
    expect(u!.asOf).toBeTypeOf("string");
  });

  it("fails closed on every ugly path (rule 6 + rule 22)", async () => {
    const { parseUniverseConstituents } = await import("../lib/universe/constituents");
    // schema mismatch (a string where the array belongs)
    expect(parseUniverseConstituents({ data: "nope" })).toBeNull();
    // empty data
    expect(parseUniverseConstituents({ data: [] })).toBeNull();
    // missing data
    expect(parseUniverseConstituents({})).toBeNull();
    // a SHORT list is not the universe (99 constituents + the index row)
    const short = {
      ...(FIXTURE_CONSTITUENTS as object),
      data: (FIXTURE_CONSTITUENTS as { data: unknown[] }).data.slice(0, 99),
    };
    expect(parseUniverseConstituents(short)).toBeNull();
    // non-object input
    expect(parseUniverseConstituents(null)).toBeNull();
    expect(parseUniverseConstituents("x")).toBeNull();
  });

  it("parses the official bhavcopy CSV (EQ rows only, named columns)", async () => {
    const { parseBhavcopyCsv } = await import("../lib/universe/bhavcopy");
    const csv = read("test/fixtures/universe/bhavcopy-sample.csv");
    const rows = parseBhavcopyCsv(csv, ["RELIANCE", "TCS", "SBIN"]);
    expect(rows).not.toBeNull();
    expect(Object.keys(rows!).sort()).toEqual(["RELIANCE", "SBIN", "TCS"]);
    // EQ row values survive; the BE row for a requested symbol is excluded
    expect(rows!.RELIANCE.close).toBe(2500.15);
    expect(rows!.RELIANCE.prevClose).toBe(2480.1);
    expect(rows!.RELIANCE.series).toBe("EQ");
    // the fixture carries RELIANCE twice (EQ + BE) — the EQ row wins
    expect(rows!.RELIANCE.close).not.toBe(1111);
    // a symbol absent from the CSV is absent from the result (honest miss)
    const miss = parseBhavcopyCsv(csv, ["NOSUCHSYM"]);
    expect(miss).toEqual({});
  });

  it("rejects malformed bhavcopy input (fail closed)", async () => {
    const { parseBhavcopyCsv } = await import("../lib/universe/bhavcopy");
    expect(parseBhavcopyCsv("", ["RELIANCE"])).toBeNull();
    expect(parseBhavcopyCsv("SYMBOL,SERIES,CLOSE\nRELIANCE,EQ\n", ["RELIANCE"])).toBeNull();
    expect(parseBhavcopyCsv("garbage\nnot,a,csv\n", ["RELIANCE"])).toBeNull();
  });

  it("the dataQuality policy flips a record ONLY on both price AND fundamentals observations", async () => {
    const { universeRecordQuality } = await import("../lib/universe/policy");
    const stale = "2026-10-01T00:00:00Z";
    const fresh = "2026-10-11T00:00:00Z";
    const freshEnough = "2026-10-10T18:00:00Z";
    // no observations at all -> seed
    expect(universeRecordQuality({})).toBe("seed");
    // price only -> still seed (scores need fundamentals)
    expect(universeRecordQuality({ priceObservedAt: fresh })).toBe("seed");
    // fundamentals only -> still seed (scores quote real prices)
    expect(universeRecordQuality({ fundamentalsObservedAt: fresh })).toBe("seed");
    // both, fresh -> delayed
    expect(universeRecordQuality({ priceObservedAt: fresh, fundamentalsObservedAt: freshEnough })).toBe("delayed");
    // both, but price stale beyond the bound -> seed (honest staleness)
    expect(universeRecordQuality({ priceObservedAt: stale, fundamentalsObservedAt: fresh })).toBe("seed");
    // null timestamps are unknown, not fresh
    expect(universeRecordQuality({ priceObservedAt: null, fundamentalsObservedAt: fresh })).toBe("seed");
    // an unparseable timestamp is unknown, not fresh
    expect(universeRecordQuality({ priceObservedAt: "not-a-date", fundamentalsObservedAt: fresh })).toBe("seed");
  });

  it("positive controls (B-18): the module, route and fixtures exist with the decision documented", () => {
    expect(existsSync("lib/universe/constituents.ts")).toBe(true);
    expect(existsSync("lib/universe/bhavcopy.ts")).toBe(true);
    expect(existsSync("lib/universe/policy.ts")).toBe(true);
    expect(existsSync("app/api/universe/constituents/route.ts")).toBe(true);
    // the route decision is recorded in the data-sources doc
    const doc = read("docs/DATA_SOURCES.md");
    expect(doc).toContain("NIFTY 100");
    expect(doc).toContain("bhavcopy");
  });

  it("the patterns bite (embedded defect shapes must match — C5)", async () => {
    const { parseUniverseConstituents } = await import("../lib/universe/constituents");
    // a payload whose constituents include the index row still parses;
    // the parser must EXCLUDE it — pin that behavior bites
    const withIndexRow = {
      data: [
        { symbol: "NIFTY 100", priority: 1, series: "NA", identifier: "NIFTY 100", lastPrice: "1" },
        ...(FIXTURE_CONSTITUENTS as { data: unknown[] }).data,
      ],
    };
    const u = parseUniverseConstituents(withIndexRow);
    expect(u).not.toBeNull();
    expect(u!.symbols).not.toContain("NIFTY 100");
    expect(u!.symbols).toHaveLength(100);
  });
});
