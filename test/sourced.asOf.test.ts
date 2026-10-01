/**
 * N3 (round 3), as corrected by Commit D §3 — Sourced.asOf for live fields
 * is the PROVIDER's DISCLOSED observation time, or NULL.
 *
 * The original defect: lib/scoring stamped `asOf: new Date().toISOString()`
 * on live fields at resolution time, so a value captured by the provider at
 * 09:15 and resolved at 18:42 claimed an 18:42 freshness — a fabricated
 * "as of" (Constitution art. 1/3). The first fix made the provider
 * response's `lastUpdated` the asOf and let the FETCH TIME stand in when
 * the response carried no parseable timestamp. Commit D closes the residual
 * hole: a fetch-time stand-in is STILL a fabricated observation claim (the
 * provider never said the value was observed at fetch time), so the
 * contract is now "provider-disclosed time or null".
 */
import { describe, it, expect } from "vitest";
import { resolveStockMetrics } from "@/lib/scoring";

const LIVE_FIXTURE = {
  symbol: "RELIANCE",
  pe: 21.5,
  eps: 48.2,
  marketCap: 1700e7,
  roe: 14.2,
  roce: 16.1,
  bookValue: 610,
  dividendYield: 0.4,
  faceValue: 10,
  debtToEquity: 0.4,
  opm: 18.3,
  revCagr3y: 12,
  epsCagr: 14,
  promoterHolding: 50.3,
  fcf: 62000,
  roa: 9.1,
  isLive: true,
};

describe("N3 — live asOf is the provider's observation time", () => {
  it("provider returns T → every live field's asOf is exactly T", () => {
    const T = "2026-09-28T09:15:00.000Z"; // provider observation time
    const resolved = resolveStockMetrics("RELIANCE", {
      ...LIVE_FIXTURE,
      lastUpdated: T,
      source: "screener",
    })!;
    expect(resolved).not.toBeNull();

    const liveKeys = Object.entries(resolved.fields)
      .filter(([, f]) => f.source === "live")
      .map(([k]) => k);
    expect(liveKeys.length).toBeGreaterThan(5); // the fixture overrode many fields

    for (const key of liveKeys) {
      expect(
        resolved.fields[key].asOf,
        `${key} (live) must carry the provider timestamp, not resolution time`,
      ).toBe(T);
    }
  });

  it("the asOf is NOT 'now': a 3-hour-old provider timestamp survives a fresh resolution", () => {
    const past = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const resolved = resolveStockMetrics("RELIANCE", {
      ...LIVE_FIXTURE,
      lastUpdated: past,
      source: "yahoo+nse",
    })!;
    expect(resolved.fields.pe.asOf).toBe(past);
    expect(resolved.fields.pe.asOf).not.toBe(new Date().toISOString());
  });

  it("a response with no parseable timestamp resolves asOf = null (TIGHTENED by Commit D §3: the old fetch-time stand-in was itself a fabrication)", () => {
    const before = new Date().toISOString();
    const resolved = resolveStockMetrics("RELIANCE", {
      ...LIVE_FIXTURE,
      lastUpdated: "",
      source: "yahoo+nse",
    })!;
    const after = new Date().toISOString();
    // live provenance survives, the timestamp does not — null is the value
    expect(resolved.fields.pe.source).toBe("live");
    expect(resolved.fields.pe.asOf).toBeNull();
    // and it is genuinely null, not a wrapped fetch-time stamp
    expect(resolved.fields.pe.asOf).not.toBe(before);
    expect(resolved.fields.pe.asOf).not.toBe(after);
    expect(resolved.sourced.pe.asOf).toBeNull();
  });

  it("seed and seed-derived fields still claim no timestamp (R1)", () => {
    const resolved = resolveStockMetrics("RELIANCE", {
      ...LIVE_FIXTURE,
      lastUpdated: "2026-09-28T09:15:00.000Z",
      source: "screener",
    })!;
    for (const [key, field] of Object.entries(resolved.fields)) {
      if (field.source === "seed" || field.source === "derived") {
        // fcfMargin is a pure-seed derivation; pb mixes the seed price with
        // a live bvps — under Commit D §5 NEITHER claims a timestamp, so
        // every seed/derived field must stay null here.
        if (key === "pb" || key === "fcfMargin") continue;
        expect(field.asOf, `${key} (${field.source}) must claim no timestamp`).toBeNull();
      }
    }
  });
});
