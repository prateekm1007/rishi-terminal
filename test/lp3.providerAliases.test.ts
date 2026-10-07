// test/lp3.providerAliases.test.ts (round 21, LP3)
//
// Fail-first suite for the provider-identifier alias layer (D1-02 follow-up:
// the 133-symbol honest-miss inventory). The defect it pins: the SEED
// universe carries OLD NSE symbols (BAJAJAUTO, COLGATE, ...); Yahoo serves
// the same instruments under their CURRENT symbols (BAJAJ-AUTO, COLPAL,
// ...). The single-symbol path resolved this via STOCK_ALIASES, but the
// BATCH path (the Stocks table + the warmer) queried the provider with the
// raw registry symbol, so renamed instruments could NEVER price — an
// honest miss, but a structural hole.
//
// Contract pinned here (one source of truth, Rule 14):
//   - the alias applies at the PROVIDER-QUERY layer (bulkRefreshQuotes),
//     and results are re-keyed to the REQUESTED registry symbols, so
//     quote_cache rows stay registry-keyed and the /api/health coverage
//     RPC (p_universe = STOCKS keys) keeps counting them;
//   - an upstream miss stays an honest null (never fabricated);
//   - serveQuote no longer pre-aliases the cache key: BOTH paths key rows
//     by the requested registry symbol (one instrument, one row, one key
//     shape across paths);
//   - the alias map itself is sane: values unique, no value is itself a
//     STOCKS key (which would collapse two seed rows), and the verified
//     rename entries from the round-21 artifact are present.

import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchBulkPricesForSymbols = vi.fn();

vi.mock("@/lib/nse/bulkFetch", () => ({
  fetchBulkPricesForSymbols: (...args: unknown[]) => fetchBulkPricesForSymbols(...args),
}));

import { bulkRefreshQuotes } from "@/lib/quotePath";
import { serveQuote } from "@/lib/quotePath";
import { STOCK_ALIASES } from "@/lib/livePrice";
import { STOCKS } from "@/data/stocks";

function entry(price: number) {
  return {
    symbol: "x",
    price,
    change: null,
    currency: "INR",
    source: "yahoo-bulk",
    observedAt: "2026-10-06T09:31:43+00:00",
    refreshedAt: "2026-10-06T10:00:00.000Z",
    volume24h: null,
  };
}

beforeEach(() => {
  fetchBulkPricesForSymbols.mockReset();
});

describe("LP3 — provider-identifier aliases at the bulk refresher", () => {
  it("queries the provider under the CURRENT symbol and re-keys the row to the registry symbol", async () => {
    fetchBulkPricesForSymbols.mockResolvedValue({ "BAJAJ-AUTO": entry(10017) });

    const out = await bulkRefreshQuotes(["BAJAJAUTO"]);

    expect(fetchBulkPricesForSymbols).toHaveBeenCalledWith(["BAJAJ-AUTO"]);
    expect(out["BAJAJAUTO"]).not.toBeNull();
    expect(out["BAJAJAUTO"]?.price).toBe(10017);
  });

  it("passes unaliased symbols through unchanged", async () => {
    fetchBulkPricesForSymbols.mockResolvedValue({ RELIANCE: entry(1218) });

    const out = await bulkRefreshQuotes(["RELIANCE"]);

    expect(fetchBulkPricesForSymbols).toHaveBeenCalledWith(["RELIANCE"]);
    expect(out["RELIANCE"]?.price).toBe(1218);
  });

  it("an aliased upstream miss stays an honest null (never fabricated)", async () => {
    fetchBulkPricesForSymbols.mockResolvedValue({});

    // AMARAJABAT is a verified rename (ARE&M) — see yahooAliases.json.
    // (ADANITRANS deliberately is NOT: its company NAME changed too
    // (Adani Energy Solutions), so the name-agreement gate cannot verify
    // the pairing in-band and the row stays honestly unresolved.)
    const out = await bulkRefreshQuotes(["AMARAJABAT"]);

    expect(fetchBulkPricesForSymbols).toHaveBeenCalledWith(["ARE&M"]);
    expect(out["AMARAJABAT"]).toBeNull();
  });
});

describe("LP3 — serveQuote keys rows by the requested registry symbol", () => {
  it("the provider-query aliasing happens inside the refresher, not before the cache key", async () => {
    const seen: string[] = [];
    const q = await serveQuote("BGV01", {
      fetchUpstream: async (symbol) => {
        seen.push(symbol);
        return entry(11);
      },
    });
    expect(seen).toEqual(["BGV01"]);
    expect(q?.symbol).toBe("BGV01");
  });
});

describe("LP3 — the alias map is sane", () => {
  it("values are unique and no value is itself a STOCKS key (two seed rows must never collapse)", () => {
    const values = Object.values(STOCK_ALIASES);
    expect(new Set(values).size).toBe(values.length);
    const keys = new Set(Object.keys(STOCKS));
    for (const v of values) {
      expect(keys.has(v)).toBe(false);
    }
  });

  it("carries the provider-verified renames from the round-21 and round-24 artifacts", () => {
    const must: Array<[string, string]> = [
      ["BAJAJAUTO", "BAJAJ-AUTO"],
      ["AMARAJABAT", "ARE&M"],
      ["NARAYANA", "NH"],
      ["MEGH", "MOL"],
      ["SONATASOFT", "SONATSOFTW"],
      ["SRTRANSFIN", "SHRIRAMFIN"],
      ["ZEN", "ZENTEC"],
      // Round 24 (E4 residual classification): the seed symbol is dead on
      // both suffixes; the provider serves the instrument under the
      // current ticker with an identity-verified name.
      ["BRAINBEES", "FIRSTCRY"],
      ["GANESHHOUC", "GANESHHOU"],
      ["SOMDISTILL", "SDBL"],
      ["TECHNO", "TECHNOE"],
      ["SANDUMANG", "SANDUMA"],
      ["ELDECO", "ELDEHSG"],
      ["JSLHISAR", "JSL"],
      ["LAXMIMACH", "LMW"],
      ["NAMINDIA", "NAM-INDIA"],
    ];
    for (const [from, to] of must) {
      expect(STOCK_ALIASES[from]).toBe(to);
    }
    // 53 verified renames + the pre-existing BGV01 hand entry. Deliberately
    // NOT here: demerger/identity ambiguity (TATAMOTORS, COSMOFILMS,
    // MAHINDCIE), un-establishable identity (KWALITY), and duplicate seed
    // rows whose CURRENT ticker is itself a STOCKS key (MCXINDIA->MCX,
    // TORNT->TORNTPHARM, MACROTECH->LODHA, GMRINFRA->GMRAIRPORT,
    // INOXLEISURE->PVRINOX, MAGMA->POONAWALLA, TATACOFFEE->TATACONSUM,
    // IIFLWAM->360ONE, TV18BRDCST->NETWORK18, JSWISPL->JSWSTEEL — registry
    // merge work, and WELSPUNIND->WELCORP is a rejected false match) — see
    // scripts/generateYahooAliases.ts EXCLUDED and the round-24 artifact.
    expect(Object.keys(STOCK_ALIASES).length).toBe(54);
  });

  it("never maps a symbol to itself", () => {
    for (const [from, to] of Object.entries(STOCK_ALIASES)) {
      expect(from).not.toBe(to);
    }
  });
});
