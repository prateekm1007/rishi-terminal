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

// ── Q3: name-agreement gate (audit round 4) ─────────────────────────────
import {
  agreesEnough,
  nameTokens,
  parseNameOverrides,
} from "../lib/db/nameAgreement";

describe("agreesEnough — the Q3 name-agreement gate", () => {
  it("accepts punctuation/space variants of the same name", () => {
    expect(agreesEnough("Divis Laboratories", "Divi's Laboratories Limited").ok).toBe(true);
    expect(agreesEnough("LatentView Analytics", "Latent View Analytics Limited").ok).toBe(true);
    expect(agreesEnough("One97 Communications", "One 97 Communications Limited").ok).toBe(true);
    expect(agreesEnough("Venky's (India)", "Venky's (India) Limited").ok).toBe(true);
  });

  it("accepts abbreviations sharing >= 2 distinctive tokens", () => {
    expect(agreesEnough("Apollo Hospitals", "Apollo Hospitals Enterprise Limited").ok).toBe(true);
    expect(agreesEnough("Aditya Birla Fashion", "Aditya Birla Fashion and Retail Limited").ok).toBe(true);
  });

  it("accepts a seed name that is the official name minus corporate suffixes", () => {
    // suffix-stripped raw equality, not a token-count rule
    expect(agreesEnough("Infosys", "Infosys Limited").ok).toBe(true);
    expect(agreesEnough("Siemens", "Siemens Limited").ok).toBe(true);
  });

  it("REJECTS the five audited wrong-company bindings", () => {
    // The audit round 4 findings — each bound seed data to another company.
    expect(agreesEnough("J.K. Investors (Bombay)", "J.Kumar Infraprojects Limited").ok).toBe(false);
    expect(agreesEnough("Maharashtra Gas", "Mangalam Global Enterprise Limited").ok).toBe(false);
    expect(agreesEnough("Peninsula Land", "Pennar Industries Limited").ok).toBe(false);
    expect(agreesEnough("Power Mech", "Hitachi Energy India Limited").ok).toBe(false);
    expect(agreesEnough("Shriram Pistons & Rings", "SPR Auto Technologies Limited").ok).toBe(false);
  });

  it("REJECTS the round-4 additional wrong bindings found while fixing Q3", () => {
    expect(agreesEnough("Kalyani Steels", "Kalyani Commercials Limited").ok).toBe(false);
    expect(agreesEnough("Sundaram-Clayton", "Sundaram Multi Pap Limited").ok).toBe(false);
    expect(agreesEnough("Suven Pharmaceuticals", "Suven Life Sciences Limited").ok).toBe(false);
    expect(agreesEnough("Vikas Steel", "Vibhor Steel Tubes Limited").ok).toBe(false);
  });

  it("REJECTS acronyms that are not substrings of the official name", () => {
    // CAMS is a real acronym of the official name, but the gate cannot know
    // that — it requires a curated override (test proves the default deny).
    expect(agreesEnough("CAMS", "Computer Age Management Services Limited").ok).toBe(false);
    expect(agreesEnough("IREDA", "Indian Renewable Energy Development Agency Limited").ok).toBe(false);
    expect(agreesEnough("IndiGo", "InterGlobe Aviation Limited").ok).toBe(false);
  });

  it("rejects one shared generic token ('infra' alone matches 19 companies)", () => {
    // 19 official companies contain the token 'infra'; one shared token is
    // never enough — the single-token rule was removed deliberately.
    expect(agreesEnough("Some Infra", "Other Infra Limited").ok).toBe(false);
    // ("H.G. Infra" on symbol HGELEC therefore falls to the name-resolution
    // path, which requires a UNIQUE candidate — it is ambiguous and lands
    // UNRESOLVED, fail-closed.)
  });

  it("treats suffix-stripped raw equality as agreement even when tokens are empty", () => {
    expect(agreesEnough("T.T.", "T.T. Limited").ok).toBe(true);
    expect(agreesEnough("T.T.", "X.Y. Limited").ok).toBe(false); // different names, no tokens — default deny
  });
});

describe("nameTokens — suffix and single-character filtering", () => {
  it("drops corporate suffixes and single characters", () => {
    expect([...nameTokens("J. Kumar Infraprojects Limited")].sort()).toEqual(["infraprojects", "kumar"]);
    // 'of' and 'india' are generic; so is 'corporation' — identity survives
    // in the distinctive tokens ('life', 'insurance').
    expect([...nameTokens("Life Insurance Corporation Of India")].sort()).toEqual([
      "insurance", "life",
    ]);
  });
});

describe("parseNameOverrides — the curated decisions file", () => {
  it("rejects an entry without sources (every decision must be checkable)", () => {
    expect(() =>
      parseNameOverrides({
        entries: [
          { symbol: "X", seedName: "X Seed", officialName: "X Official", verdict: "SAME_COMPANY", action: "BIND_WITH_OVERRIDE" },
        ],
      }),
    ).toThrow(/source/i);
  });

  it("rejects UPDATE_SEED_NAME without the updated name", () => {
    expect(() =>
      parseNameOverrides({
        entries: [
          { symbol: "X", seedName: "X Seed", officialName: "X Official", verdict: "RENAMED", action: "UPDATE_SEED_NAME", sources: ["https://example.com"] },
        ],
      }),
    ).toThrow(/updatedSeedName/i);
  });
});
