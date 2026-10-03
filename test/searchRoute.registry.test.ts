/**
 * R11-06 (founder directive 11) — the search route must derive every
 * candidate from the ONE canonical registries (Rule 14). The previous
 * implementation hand-listed crypto/commodity/forex arrays that had
 * already drifted from the registries:
 *
 *   - it advertised XRP / DOGE / SHIB (never in the 12-asset crypto
 *     registry) and missed UNI / AAVE / SKY;
 *   - 6 of its 11 commodities did not exist in the 41-entry registry
 *     (CRUDEOIL, NATURALGAS, ALUMINIUM, NICKEL, LEAD, BRENTCRUDE);
 *   - it served zero bonds although the Category type and the search
 *     client both promised them.
 *
 * Every hit above linked to a detail page that renders `notFound()` for
 * unknown symbols — user-visible dead ends produced by a second ticker
 * set. These tests failed on the old implementation (RED) and pass after
 * the registry-derived rewrite (GREEN). They also mechanically pin the
 * route: hand-listed ticker arrays must never return.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { CRYPTO_ASSETS } from "@/data/crypto";
import { FOREX_PAIRS } from "@/data/forex";
import { BONDS } from "@/data/bonds";

const req = (url: string) =>
  ({ url, headers: { get: () => null } }) as never;

async function searchSymbols(q: string): Promise<Array<{ symbol: string; category: string; url: string }>> {
  const { GET } = await import("@/app/api/search/route");
  const res = await GET(req(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`));
  const body = await res.json();
  return body.results ?? [];
}

describe("R11-06 — search derives from the canonical registries (directive 11)", () => {
  it("the route imports the registries and hand-lists no ticker arrays", () => {
    const src = readFileSync(
      path.join(process.cwd(), "app/api/search/route.ts"),
      "utf8",
    );
    expect(src).toContain('@/data/crypto');
    expect(src).toContain('@/data/markets');
    expect(src).toContain('@/data/forex');
    expect(src).toContain('@/data/bonds');
    // The hand-listed sets that drifted are gone for good.
    expect(src).not.toMatch(/const CRYPTOS/);
    expect(src).not.toMatch(/const COMMODITIES/);
    expect(src).not.toMatch(/const FOREX/);
  });

  it("serves every crypto registry asset and none outside it", async () => {
    for (const asset of CRYPTO_ASSETS) {
      const hits = await searchSymbols(asset.symbol);
      expect(hits.some((h) => h.category === "crypto" && h.url === `/crypto/${asset.symbol}`),
        `missing crypto registry asset ${asset.symbol}`).toBe(true);
    }
    // The old hand list advertised these; the registry never served them.
    // The contract: no result may LINK to an unknown symbol (the detail
    // pages render notFound() for those).
    for (const ghost of ["XRP", "DOGE", "SHIB"]) {
      const hits = await searchSymbols(ghost);
      expect(hits.some((h) => h.url === `/crypto/${ghost}`), `ghost crypto ${ghost} linked`).toBe(false);
    }
  });

  it("serves the commodity registry, not the drifted hand list", async () => {
    // Prefix matches on REAL registry assets are legitimate search hits
    // (e.g. "CRUDEOIL" finds CRUDEOILMCX); the contract is that no result
    // links to a symbol the registry does not serve.
    for (const ghost of ["CRUDEOIL", "NATURALGAS", "ALUMINIUM", "NICKEL", "LEAD", "BRENTCRUDE"]) {
      const hits = await searchSymbols(ghost);
      expect(hits.some((h) => h.url === `/commodities/${ghost}`), `ghost commodity ${ghost} linked`).toBe(false);
    }
    for (const symbol of ["WTI", "BRENT", "NATGAS", "ALUMINUM", "GOLDMCX"]) {
      const hits = await searchSymbols(symbol);
      expect(hits.some((h) => h.category === "commodity" && h.url === `/commodities/${symbol}`),
        `registry commodity ${symbol} missing`).toBe(true);
    }
  });

  it("covers the full forex registry (slashed-name match still resolves the pair URL)", async () => {
    expect(FOREX_PAIRS.some((p) => p.symbol === "USDINR")).toBe(true);
    for (const pair of FOREX_PAIRS) {
      const hits = await searchSymbols(pair.symbol);
      expect(hits.some((h) => h.category === "forex" && h.url === `/forex/${pair.symbol}`),
        `forex pair ${pair.symbol} missing`).toBe(true);
    }
  });

  it("serves the bond registry (the Category type finally tells the truth)", async () => {
    for (const bond of BONDS) {
      const hits = await searchSymbols(bond.symbol);
      expect(hits.some((h) => h.category === "bond" && h.url === `/bonds/${bond.symbol}`),
        `bond ${bond.symbol} missing`).toBe(true);
    }
  });

  it("stock search is unchanged and still registry-derived", async () => {
    const tcs = await searchSymbols("TCS");
    expect(tcs[0]).toMatchObject({ category: "stock", url: "/stock/TCS" });
  });

  it("junk queries return no results (no invention)", async () => {
    expect(await searchSymbols("ZZZZQQQ")).toEqual([]);
    expect(await searchSymbols("")).toEqual([]);
  });
});
