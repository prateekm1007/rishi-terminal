/**
 * Q4 Commit D §5 — derived-field provenance: PB must never claim a coherent
 * live observation time when its inputs are mixed (seed price ÷ live BVPS).
 *
 * The defect: lib/scoring computed PB as `seed.price / resolved BVPS` and
 * labelled the result `source: "derived"` with the LIVE `asOf` whenever BVPS
 * was live — a mixed seed/live derivation presented with a live observation
 * time. The AI evidence package then told the model PB was live-observed.
 *
 * Contract under test (the founder's option B — narrow, deterministic):
 *   - mixed seed/live inputs → source stays "derived", asOf = null, and the
 *     provenance note explicitly says mixed-source derivation;
 *   - pure-seed inputs → derived from seed inputs, asOf = null (unchanged);
 *   - the evidence package carries that note verbatim and never presents PB
 *     with the provider's as-of.
 *
 * Bite-proof: written and run BEFORE the fix — pb.asOf was the provider
 * timestamp and no mixed-source note existed (raw output in the PR).
 */
import { describe, expect, it } from "vitest";
import { resolveStockMetrics } from "@/lib/scoring";
import { buildAiEvidencePackage } from "@/lib/ai/evidence";
import { STOCKS } from "@/data/stocks";
import type { FullFundamentals as ResolverFundamentals } from "@/hooks/useFundamentals";
import type { FullFundamentals as VendorFullFundamentals } from "@/lib/liveFundamentals";

const SYMBOL = "RELIANCE";
const SEED_PRICE = STOCKS[SYMBOL].price;
const SEED_BVPS = STOCKS[SYMBOL].bvps;

/** Resolver-shaped fixture (hooks contract + isLive). */
function live(
  overrides: Partial<VendorFullFundamentals> = {},
): ResolverFundamentals {
  return {
    symbol: SYMBOL, pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18,
    roce: 21, bookValue: 990, dividendYield: 0.4, faceValue: 10,
    debtToEquity: 0.4, opm: 24, revCagr3y: 14, epsCagr: 16,
    promoterHolding: 50.3, fcf: 30000, roa: 10, lastUpdated: "2026-09-30T10:00:00.000Z",
    source: "screener", isLive: true, ...overrides,
  };
}

/** Vendor-shaped fixture (the assembler's getFundamentals contract). */
function vendorLive(
  overrides: Partial<VendorFullFundamentals> = {},
): VendorFullFundamentals {
  return {
    symbol: SYMBOL, pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18,
    roce: 21, bookValue: 990, dividendYield: 0.4, faceValue: 10,
    debtToEquity: 0.4, opm: 24, revCagr3y: 14, epsCagr: 16,
    promoterHolding: 50.3, fcf: 30000, roa: 10, lastUpdated: "2026-09-30T10:00:00.000Z",
    source: "screener", ...overrides,
  };
}

describe("Commit D §5 — PB provenance is coherent with its inputs", () => {
  it("BITE (must fail pre-fix): mixed seed price + live BVPS → asOf null, mixed-source note", () => {
    const r = resolveStockMetrics(SYMBOL, live())!;
    expect(r.fields.bvps.source).toBe("live"); // the input really is live
    expect(r.fields.pb.source).toBe("derived");
    expect(r.fields.pb.value).toBe(Number((SEED_PRICE / 990).toFixed(4)));
    expect(r.fields.pb.asOf).toBeNull(); // pre-fix: the provider timestamp
    expect(r.fields.pb.asOf).not.toBe("2026-09-30T10:00:00.000Z");
    expect(r.fields.pb.note).toContain("mixed-source");
    expect(r.sourced.pb.asOf).toBeNull(); // the UI contract inherits the fix
  });

  it("pure-seed inputs: derived from seed data, asOf null, no mixed-source claim", () => {
    const r = resolveStockMetrics(SYMBOL, null)!;
    expect(r!.fields.pb.source).toBe("derived");
    expect(r!.fields.pb.value).toBe(Number((SEED_PRICE / SEED_BVPS).toFixed(4)));
    expect(r!.fields.pb.asOf).toBeNull();
    expect(r!.fields.pb.note ?? "").not.toContain("mixed-source");
  });

  it("live BVPS with NO disclosed observation time: still mixed → asOf null + note (never 'live')", () => {
    const r = resolveStockMetrics(SYMBOL, live({ lastUpdated: null }))!;
    expect(r.fields.pb.asOf).toBeNull();
    expect(r.fields.pb.note).toContain("mixed-source");
  });

  it("BITE (must fail pre-fix): the evidence package never presents PB with the provider as-of", async () => {
    const pkg = await buildAiEvidencePackage(SYMBOL, {
      getFundamentals: async () => vendorLive(),
      getPrice: async () => null,
    });
    expect(pkg).not.toBeNull();
    const pb = pkg!.items.find(i => i.id.startsWith(`fundamental:${SYMBOL}:pb:`));
    expect(pb).toBeDefined();
    // the served provenance says mixed-source and claims no observation time
    expect(pb!.text).toContain("mixed-source");
    expect(pb!.text).not.toContain("as-of 2026-09-30");
    // the id fragment must not be the live as-of either
    expect(pb!.id).toBe(`fundamental:${SYMBOL}:pb:no-disclosed-observation-time`);
    expect(pb!.facts![0].source).toBe("derived");
  });
});
