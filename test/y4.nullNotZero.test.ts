/**
 * Y4 (Round 12) — null, not zero (the X5 carry-over).
 *
 * The founder's defect list, verified live on 2026-10-04:
 *   - BANDHANBNK renders "Promoter Hold 0.0%" (seed promo = 0, a June
 *     placeholder for "unknown", rendered as an observation).
 *   - Banks render "D/E Ratio 0.0x" (seed de = 0 — meaningless for a bank
 *     either way, and a placeholder in the seed).
 *   - SBIN shows the "India Services Export Boom" analog — a Banking stock
 *     classified into the IT-services archetype (WisdomSidebar lumps
 *     'Banking' with 'IT'; the lib twin falls through to a default).
 *   - Peer market caps render seed artifacts (AUBANK "300.0K Cr") with no
 *     artifact disclosure.
 *
 * Pinned here (fail-first, Rule 21):
 *   1. dropSeedPlaceholderZero — a seed-sourced 0 is "unknown", lifted to
 *      null at the UI boundary; a vendor-sourced 0 is a REAL observation
 *      (debt-free D/E) and must render as 0 (Rule 16 cuts both ways).
 *   2. The /api/fundamentals STATIC fallback must not launder seed zeros
 *      into the live-overlay path as observed values (de / promo / mktcap
 *      become null when the seed has no value).
 *   3. MetricsPanel: banking stocks hide D/E, OPM and FCF yield, keep
 *      P/B and ROE, and say so (NIM/GNPA stay FD-16-blocked).
 *   4. detectArchetype: a Banking stock matches NO archetype -> null ->
 *      "No historical parallels detected" (both implementations).
 *   5. PeerComparison: no silent seed market-cap fallback; null caps
 *      render "—".
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { dropSeedPlaceholderZero } from "@/lib/types/sourced";
import type { Stock } from "@/lib/types";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const BANK_STOCK: Stock = {
  symbol: "SBIN", name: "State Bank of India", sector: "Banking", exchange: "NSE",
  price: 780, pe: 10, roe: 18, mktcap: 695000, ocf: 90000, rev: 350000,
  revcagr: 14, epscagr: 20, opm: 42, roce: 16, de: 0, fcf: 80000, promo: 57.5,
  ca: 900000, tl: 800000, sh: 8925, np: 55000, dep: 3000, capex: 4000, bvps: 430,
} as unknown as Stock;

describe("Y4 — placeholder zeros lift to null (the UI boundary rule)", () => {
  it("a seed-sourced 0 is the June placeholder: lifted to null", () => {
    const out = dropSeedPlaceholderZero({ value: 0, source: "seed", asOf: null });
    expect(out.value).toBeNull();
  });

  it("a vendor-sourced 0 is a real observation (debt-free D/E) and STAYS 0", () => {
    const out = dropSeedPlaceholderZero({ value: 0, source: "vendor:yahoo+nse", asOf: "2026-10-01" });
    expect(out.value).toBe(0);
  });

  it("a filing/derived 0 is real too; non-zero seeds pass through; null stays null", () => {
    expect(dropSeedPlaceholderZero({ value: 0, source: "filing", asOf: "2026-09-30" }).value).toBe(0);
    expect(dropSeedPlaceholderZero({ value: 57.5, source: "seed", asOf: null }).value).toBe(57.5);
    expect(dropSeedPlaceholderZero({ value: null, source: "seed", asOf: null }).value).toBeNull();
  });
});

describe("Y4 — the static fallback must not launder seed zeros into the overlay path", () => {
  const route = read("app/api/fundamentals/route.ts");

  it("no `?? 0` / `|| 0` laundering remains for de / promoterHolding / marketCap", () => {
    expect(route).not.toMatch(/debtToEquity:\s*stock\.de\s*\?\?\s*0/);
    expect(route).not.toMatch(/promoterHolding:\s*stock\.promo\s*\?\?\s*0/);
    expect(route).not.toMatch(/marketCap:\s*stock\.mktcap\s*\?\?\s*0/);
    expect(route).not.toMatch(/marketCap:\s*stock\.mktcap\s*\|\|\s*0/);
  });
});

describe("Y4 — MetricsPanel banking rules", () => {
  const panel = read("components/stock/MetricsPanel.tsx");

  it("applies the placeholder-zero lift at the UI boundary", () => {
    expect(panel).toContain("dropSeedPlaceholderZero");
  });

  it("hides D/E and OPM for Banking-sector stocks (and says why)", () => {
    expect(panel).toMatch(/sector\s*===\s*['"]Banking['"]/);
    expect(panel).toMatch(/isBank/);
    // the metric list is FILTERED, not just reordered
    expect(panel).toMatch(/D\/E Ratio[^\n]*\n[^\n]*bank[^\n]*|\.(filter|includes)\(/i);
  });

  it("hides FCF yield for banks (it is meaningless under leverage accounting)", () => {
    expect(panel).toMatch(/isBank\s*\?\s*\(/);
    expect(panel).toMatch(/title="FCF Yield"/);
    // FCF Yield renders ONLY in the non-bank branch
    const fcfPos = panel.indexOf('title="FCF Yield"');
    const bankBranchPos = panel.indexOf('isBank ? (');
    expect(fcfPos).toBeGreaterThan(bankBranchPos);
    expect(panel.slice(bankBranchPos, fcfPos)).toContain('Banking note');
  });
});

describe("Y4 — the historical analog is sector-honest or absent", () => {
  it("lib detectArchetype: a Banking stock matches NO archetype (null, not the IT default)", async () => {
    const { detectArchetype } = await import("@/lib/wisdom/parallels");
    expect(detectArchetype(BANK_STOCK)).toBeNull();
  });

  it("lib detectArchetype: the default fall-through is gone for ANY unmatched profile", async () => {
    const { detectArchetype } = await import("@/lib/wisdom/parallels");
    const oddStock = { ...BANK_STOCK, sector: "Capital Goods", roe: 8, pe: 25, np: 100, mktcap: 900000, revcagr: 5, opm: 5, de: 0.4, epscagr: 4 } as unknown as Stock;
    expect(detectArchetype(oddStock)).toBeNull();
  });

  it("WisdomSidebar no longer classifies Banking into the IT-services analog", () => {
    const sidebar = read("components/stock/WisdomSidebar.tsx");
    expect(sidebar).not.toMatch(/\[\s*['"]IT['"]\s*,\s*['"]Banking['"]\s*\]/);
  });
});

describe("Y4 — peer market caps are live or blank", () => {
  const peer = read("components/stock/PeerComparison.tsx");

  it("no silent seed market-cap fallback (the AUBANK 300.0K Cr artifact)", () => {
    expect(peer).not.toMatch(/\?\?\s*stock\.mktcap/);
    expect(peer).not.toMatch(/\?\?\s*p\.marketCap/);
  });

  it("a missing cap renders the em dash, never a seed number dressed as data", () => {
    expect(peer).toMatch(/marketCap\s*!=\s*null\s*&&\s*s\.marketCap\s*>\s*0\s*\?[^:]*:\s*['"]—['"]/);
  });
});
