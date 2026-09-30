/** T12: ticker alias resolution and registry integrity. */
import { describe, it, expect } from "vitest";

import { STOCKS } from "@/data/stocks";
import {
  TICKER_ALIASES,
  resolveTickerSymbol,
  normalizeTicker,
} from "@/lib/registry/tickerRegistry";

describe("T12 — ticker alias resolution", () => {
  it("resolves every documented renamed symbol", () => {
    expect(resolveTickerSymbol("MINDTREE")).toBe("LTIM");
    expect(resolveTickerSymbol("NIPPONLIFE")).toBe("NAMINDIA");
    expect(resolveTickerSymbol("MAZAGON")).toBe("MAZDOCK");
    expect(resolveTickerSymbol("PVR")).toBe("PVRINOX");
    expect(resolveTickerSymbol("BIRLASOFT")).toBe("BSOFT");
    expect(resolveTickerSymbol("KPR")).toBe("KPRMILL");
  });

  it("is case-insensitive and trims input", () => {
    expect(resolveTickerSymbol(" mindtree ")).toBe("LTIM");
    expect(resolveTickerSymbol("jkbank")).toBe("J&KBANK");
  });

  it("handles ampersand-mangled legacy forms (M_M -> M&M)", () => {
    expect(resolveTickerSymbol("M_M")).toBe("M&M");
    expect(resolveTickerSymbol("MANDM")).toBe("M&M");
  });

  it("returns the canonical symbol unchanged and null for unknowns", () => {
    expect(resolveTickerSymbol("LTIM")).toBe("LTIM");
    expect(resolveTickerSymbol("UNKNOWN999")).toBeNull();
    expect(resolveTickerSymbol("")).toBeNull();
    expect(resolveTickerSymbol(null as any)).toBeNull();
  });

  it("no alias shadows a live registry row and every canonical exists", () => {
    for (const [oldSym, canonical] of Object.entries(TICKER_ALIASES)) {
      expect(STOCKS[oldSym], `${oldSym} must not exist as a row`).toBeUndefined();
      expect(STOCKS[canonical], `${canonical} must exist`).toBeDefined();
    }
  });

  it("every alias resolves to a live symbol (no dangling chains)", () => {
    for (const oldSym of Object.keys(TICKER_ALIASES)) {
      expect(resolveTickerSymbol(oldSym)).not.toBeNull();
    }
  });

  it("registry has no duplicate symbols", () => {
    const symbols = Object.keys(STOCKS);
    const dups = symbols.filter((s, i) => symbols.indexOf(s) !== i);
    expect(dups).toEqual([]);
  });
});

describe("T12 — validateStocks gates (in-process)", () => {
  it("no all-zero fundamental rows and all prices positive", () => {
    for (const [sym, s] of Object.entries(STOCKS)) {
      expect(s.price, sym).toBeGreaterThan(0);
      const zeroFund = (["rev", "ocf", "fcf", "bvps", "roce", "promo"] as const)
        .every(k => (s[k] as number) === 0);
      expect(zeroFund, `${sym} has all-zero fundamentals`).toBe(false);
    }
  });

  it("all numeric fields are finite", () => {
    const fields = [
      "price", "pe", "roe", "mktcap", "ocf", "rev", "revcagr", "epscagr",
      "opm", "roce", "de", "fcf", "promo", "ca", "tl", "sh", "np", "dep",
      "capex", "bvps",
    ] as const;
    for (const [sym, s] of Object.entries(STOCKS)) {
      for (const f of fields) {
        expect(Number.isFinite(s[f] as number), `${sym}.${f}`).toBe(true);
      }
    }
  });

  it("normalizeTicker matches the dedup identity used by the CI gate", () => {
    expect(normalizeTicker("M&M")).toBe(normalizeTicker("mandm"));
    expect(normalizeTicker("S P Apparels")).toBe(normalizeTicker("spapparels"));
  });
});
