/**
 * D1-02 — security master resolution tests.
 *
 * Acceptance (roadmap D1-02): "symbol change resolves to the same ISIN
 * across dates". The fixtures below are shaped like the real rows the
 * generator emits (see data/security-master/SOURCES.md): official
 * listing rows carry real dates; seed/registry variant rows carry NULL
 * dates and a non-official source.
 */
import { describe, it, expect } from "vitest";
import {
  resolveSymbolToIsin,
  findDuplicateActiveSymbols,
  type SymbolHistoryRow,
} from "../lib/db/securityMaster";

// Real data (official NSE listing 2026-10-01): Zensar Technologies.
const ZENSAR_ISIN = "INE520A01027";
const zensar: SymbolHistoryRow[] = [
  { isin: ZENSAR_ISIN, exchange: "NSE", symbol: "ZENSARTECH", valid_from: "2003-07-09", valid_to: null, source: "nse:equity_l:2026-10-01" },
  { isin: ZENSAR_ISIN, exchange: "NSE", symbol: "ZENSAR", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
  { isin: ZENSAR_ISIN, exchange: "NSE", symbol: "ZENSARTECH", valid_from: null, valid_to: null, source: "tickerAliases:T12:2026-09-30" },
];

// United Spirits: a genuine historical symbol change (MCDOWELL -> UNITDSPR),
// with validity dates the way D1-03 corporate-actions data will supply them.
// ISIN verified against the official listing.
const UNITDSPR_ISIN = "INE854D01024";
const unitdspr: SymbolHistoryRow[] = [
  { isin: UNITDSPR_ISIN, exchange: "NSE", symbol: "MCDOWELL", valid_from: "1990-01-01", valid_to: "2013-06-30", source: "corp-action:vendor" },
  { isin: UNITDSPR_ISIN, exchange: "NSE", symbol: "UNITDSPR", valid_from: "2013-07-01", valid_to: null, source: "nse:equity_l:2026-10-01" },
];

// Symbol reuse: the old security delisted, a different company later
// listed under the same symbol. Different ISINs across dates is CORRECT.
const reuse: SymbolHistoryRow[] = [
  { isin: "INE111A01010", exchange: "NSE", symbol: "PREMIER", valid_from: "1995-01-01", valid_to: "2018-12-31", source: "corp-action:vendor" },
  { isin: "INE222B01020", exchange: "NSE", symbol: "PREMIER", valid_from: "2021-09-01", valid_to: null, source: "nse:equity_l:2026-10-01" },
];

describe("resolveSymbolToIsin — symbol change resolves to the same ISIN across dates", () => {
  it("resolves the seed-era variant and the live symbol to the same ISIN (Zensar)", () => {
    const viaSeed = resolveSymbolToIsin(zensar, "ZENSAR", { asOf: "2020-06-15" });
    const viaLive = resolveSymbolToIsin(zensar, "ZENSARTECH", { asOf: "2026-10-01" });
    expect(viaSeed?.isin).toBe(ZENSAR_ISIN);
    expect(viaLive?.isin).toBe(ZENSAR_ISIN);
    expect(viaSeed?.source).toBe("seed:placeholder:2026-10-01");
    expect(viaLive?.source).toBe("nse:equity_l:2026-10-01");
  });

  it("a dated rename resolves to the same ISIN before and after the change", () => {
    const before = resolveSymbolToIsin(unitdspr, "MCDOWELL", { asOf: "2010-05-01" });
    const after = resolveSymbolToIsin(unitdspr, "UNITDSPR", { asOf: "2020-01-01" });
    expect(before?.isin).toBe(UNITDSPR_ISIN);
    expect(after?.isin).toBe(UNITDSPR_ISIN);
  });

  it("the retired symbol stops resolving after its validity ends", () => {
    expect(resolveSymbolToIsin(unitdspr, "MCDOWELL", { asOf: "2020-01-01" })).toBeNull();
  });

  it("a symbol not yet listed does not resolve before its listing date", () => {
    expect(resolveSymbolToIsin(unitdspr, "UNITDSPR", { asOf: "2010-01-01" })).toBeNull();
  });
});

describe("resolveSymbolToIsin — symbol reuse and precedence", () => {
  it("resolves to the old security before the reuse and the new one after", () => {
    expect(resolveSymbolToIsin(reuse, "PREMIER", { asOf: "2005-01-01" })?.isin).toBe("INE111A01010");
    expect(resolveSymbolToIsin(reuse, "PREMIER", { asOf: "2026-01-01" })?.isin).toBe("INE222B01020");
  });

  it("prefers the row with the latest valid_from when several are unbounded", () => {
    // seed variant (valid_from NULL) vs official row (dated) for the same
    // symbol string and ISIN: the dated official row is the better claim.
    const rows: SymbolHistoryRow[] = [
      { isin: ZENSAR_ISIN, exchange: "NSE", symbol: "ZENSARTECH", valid_from: null, valid_to: null, source: "tickerAliases:T12:2026-09-30" },
      { isin: ZENSAR_ISIN, exchange: "NSE", symbol: "ZENSARTECH", valid_from: "2003-07-09", valid_to: null, source: "nse:equity_l:2026-10-01" },
    ];
    expect(resolveSymbolToIsin(rows, "ZENSARTECH", { asOf: "2026-10-01" })?.source).toBe("nse:equity_l:2026-10-01");
  });

  it("filters by exchange when asked", () => {
    const rows: SymbolHistoryRow[] = [
      ...unitdspr,
      { isin: "INE999X01019", exchange: "BSE", symbol: "UNITDSPR", valid_from: "2013-07-01", valid_to: null, source: "bse:listing" },
    ];
    expect(resolveSymbolToIsin(rows, "UNITDSPR", { exchange: "BSE", asOf: "2020-01-01" })?.isin).toBe("INE999X01019");
    expect(resolveSymbolToIsin(rows, "UNITDSPR", { exchange: "NSE", asOf: "2020-01-01" })?.isin).toBe(UNITDSPR_ISIN);
  });

  it("returns null for an unknown symbol (never guesses)", () => {
    expect(resolveSymbolToIsin(zensar, "NOTASYMBOL")).toBeNull();
  });
});

describe("findDuplicateActiveSymbols — the invariant detector", () => {
  it("flags two active rows claiming different ISINs for one live symbol", () => {
    const rows: SymbolHistoryRow[] = [
      { isin: "INE111A01010", exchange: "NSE", symbol: "DUP", valid_from: "2001-01-01", valid_to: null, source: "nse:equity_l:2026-10-01" },
      { isin: "INE222B01020", exchange: "NSE", symbol: "DUP", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
    ];
    const dups = findDuplicateActiveSymbols(rows);
    expect(dups).toHaveLength(1);
    expect(dups[0]).toMatchObject({ exchange: "NSE", symbol: "DUP", isins: ["INE111A01010", "INE222B01020"] });
  });

  it("does not flag the same ISIN recorded twice, or retired rows", () => {
    const rows: SymbolHistoryRow[] = [
      { isin: "INE111A01010", exchange: "NSE", symbol: "OK1", valid_from: "2001-01-01", valid_to: null, source: "nse:equity_l:2026-10-01" },
      { isin: "INE111A01010", exchange: "NSE", symbol: "OK1", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
      { isin: "INE333C01030", exchange: "NSE", symbol: "OK1", valid_from: "1995-01-01", valid_to: "2000-12-31", source: "corp-action:vendor" },
      { isin: "INE444D01040", exchange: "BSE", symbol: "OK1", valid_from: "2001-01-01", valid_to: null, source: "bse:listing" },
    ];
    expect(findDuplicateActiveSymbols(rows)).toHaveLength(0);
  });
});
