/**
 * Investor universe verification (14 October deliverable).
 *
 * Every product symbol is classified against the official NSE equity list
 * (data/security-master/nse_equity_l_2026-10-01.csv) and the symbol history
 * (data/security-master/populate.sql). Only VERIFIED_* rows are claimable.
 * CANDIDATE_RENAME rows stay out of every investor count until confirmed.
 * UNMATCHED rows have no evidence at all.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  classifyUniverse,
  type OfficialListingRow,
  type UniverseRow,
} from "../lib/securityMaster/verifiedUniverse";
import type { SymbolHistoryRow } from "../lib/db/securityMaster";
import { isClaimable, claimableCounts } from "../lib/securityMaster/verifiedUniverse";

const ROOT = process.cwd();
const SM = path.join(ROOT, "data/security-master");
const CSV = path.join(SM, "nse_equity_l_2026-10-01.csv");
const ARTIFACT = path.join(SM, "universe/verified-universe-2026-10-01.json");
const EXCLUSIONS = path.join(SM, "universe/exclusion-log-2026-10-01.csv");

const sha256 = (file: string): string =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const OFFICIAL_SHA = "95f0d731f5858f71e876c45377dcefa79bc7a8db1e8161d0c92320252af4aa8f";

// ---------- unit tests: pure classifier, synthetic fixtures ----------
const official: OfficialListingRow[] = [
  { symbol: "ALPHA", name: "Alpha Ltd", series: "EQ", listingDate: "2001-01-01", isin: "INETEST0001" },
  { symbol: "BETA", name: "Beta Ltd", series: "BE", listingDate: "2002-01-01", isin: "INETEST0002" },
  { symbol: "NEWNAME", name: "New Name Ltd", series: "EQ", listingDate: "2003-01-01", isin: "INETEST0003" },
  { symbol: "DUPCO", name: "Dup Co", series: "EQ", listingDate: "2004-01-01", isin: "INETEST0004" },
];

describe("classifyUniverse (pure, fixtures)", () => {
  it("classifies an official EQ symbol as VERIFIED_EQ", () => {
    const [row] = classifyUniverse({
      products: [{ symbol: "ALPHA", name: "Alpha Ltd" }],
      official,
      history: [],
    });
    expect(row.status).toBe("VERIFIED_EQ");
    expect(row.series).toBe("EQ");
    expect(row.evidenceSource).toBe("nse:equity_l");
  });

  it("keeps non-EQ series out of the EQ count", () => {
    const [row] = classifyUniverse({
      products: [{ symbol: "BETA", name: "Beta Ltd" }],
      official,
      history: [],
    });
    expect(row.status).toBe("VERIFIED_OTHER_SERIES");
  });

  it("maps a renamed symbol only through its ISIN, as a candidate from a seed row", () => {
    const history: SymbolHistoryRow[] = [
      { isin: "INETEST0003", exchange: "NSE", symbol: "OLDNAME", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
    ];
    const [row] = classifyUniverse({ products: [{ symbol: "OLDNAME", name: "Old" }], official, history });
    expect(row.status).toBe("CANDIDATE_RENAME");
    expect(row.officialSymbol).toBe("NEWNAME");
  });

  it("promotes a rename to CONFIRMED_RENAME only from an official nse: source", () => {
    const history: SymbolHistoryRow[] = [
      { isin: "INETEST0003", exchange: "NSE", symbol: "OLDNAME", valid_from: null, valid_to: null, source: "nse:equity_l:2026-10-01" },
    ];
    const [row] = classifyUniverse({ products: [{ symbol: "OLDNAME", name: "Old" }], official, history });
    expect(row.status).toBe("CONFIRMED_RENAME");
  });

  it("never verifies a symbol from a seed row alone", () => {
    const history: SymbolHistoryRow[] = [
      { isin: "INETEST9999", exchange: "NSE", symbol: "SEEDONLY", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
    ];
    const [row] = classifyUniverse({ products: [{ symbol: "SEEDONLY", name: "Seed" }], official, history });
    expect(row.status).toBe("UNMATCHED");
  });

  it("leaves symbols with no evidence UNMATCHED", () => {
    const [row] = classifyUniverse({ products: [{ symbol: "GHOST", name: "Ghost" }], official, history: [] });
    expect(row.status).toBe("UNMATCHED");
    expect(row.reason).toMatch(/no official symbol and no ISIN link/);
  });

  it("flags two product symbols that resolve to one ISIN", () => {
    const history: SymbolHistoryRow[] = [
      { isin: "INETEST0004", exchange: "NSE", symbol: "DUP1", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
      { isin: "INETEST0004", exchange: "NSE", symbol: "DUP2", valid_from: null, valid_to: null, source: "seed:placeholder:2026-10-01" },
    ];
    const rows = classifyUniverse({
      products: [{ symbol: "DUP1", name: "Dup 1" }, { symbol: "DUP2", name: "Dup 2" }],
      official,
      history,
    });
    expect(rows.every((r) => /duplicate ISIN/.test(r.reason))).toBe(true);
  });
});

// ---------- artifact tests: generated files, checked against the repo ----------
describe("verified universe artifact", () => {
  it("is built from the official CSV whose hash SOURCES.md records", () => {
    expect(fs.existsSync(ARTIFACT)).toBe(true);
    const sources = fs.readFileSync(path.join(SM, "SOURCES.md"), "utf-8");
    expect(sources).toContain(OFFICIAL_SHA);
    expect(sha256(CSV)).toBe(OFFICIAL_SHA);
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    expect(art.sources.official_csv_sha256).toBe(OFFICIAL_SHA);
  });

  it("is generated from the current product universe (no silent drift)", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    expect(art.sources.product_universe_sha256).toBe(sha256(path.join(ROOT, "data/stocks/index.ts")));
  });

  it("classifies every product symbol exactly once and the counts reconcile", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    const symbols = art.rows.map((r: { productSymbol: string }) => r.productSymbol);
    expect(new Set(symbols).size).toBe(symbols.length);
    expect(symbols.length).toBe(art.counts.products);
    const total = Object.values(art.counts.by_status as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(total).toBe(art.counts.products);
  });

  it("every verified row carries an ISIN, series, listing date and official source", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    const verified = art.rows.filter((r: { status: string }) => r.status.startsWith("VERIFIED_"));
    expect(verified.length).toBeGreaterThan(0);
    for (const r of verified) {
      expect(r.isin).toBeTruthy();
      expect(r.series).toBeTruthy();
      expect(r.listingDate).toBeTruthy();
      expect(r.evidenceSource).toBe("nse:equity_l:2026-10-01");
    }
  });

  it("never counts a seed-sourced candidate as verified", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    for (const r of art.rows) {
      if (r.status === "CANDIDATE_RENAME") {
        expect(String(r.evidenceSource)).toMatch(/^seed:/);
        expect(r.status.startsWith("VERIFIED_")).toBe(false);
      }
    }
  });

  it("the exclusion log lists every UNMATCHED and CANDIDATE row, once each", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    const expected = art.rows
      .filter((r: { status: string }) => r.status === "UNMATCHED" || r.status === "CANDIDATE_RENAME")
      .map((r: { productSymbol: string }) => r.productSymbol)
      .sort();
    const logged = fs
      .readFileSync(EXCLUSIONS, "utf-8")
      .split("\n")
      .slice(1)
      .filter((l) => l.trim().length > 0)
      .map((l) => l.split(",")[0])
      .sort();
    expect(logged).toEqual(expected);
  });

  it("positive control: RELIANCE is VERIFIED_EQ with the ISIN printed in the official CSV", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    const csvRow = fs
      .readFileSync(CSV, "utf-8")
      .split("\n")
      .map((l) => l.split(","))
      .find((c) => c[0] === "RELIANCE");
    const row = art.rows.find((r: { productSymbol: string }) => r.productSymbol === "RELIANCE");
    expect(csvRow).toBeDefined();
    expect(row.status).toBe("VERIFIED_EQ");
    expect(row.isin).toBe(csvRow![6]);
  });

  it("negative control: an invented symbol is absent from the artifact", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    expect(art.rows.find((r: { productSymbol: string }) => r.productSymbol === "ZZNOTREAL")).toBeUndefined();
  });
});

// ---------- founder policy FD-29 (13 Oct 2026): BE/BZ included with a series label; claim the verified count ----------
describe("claim rule (FD-29)", () => {
  it("claims VERIFIED_EQ, VERIFIED_OTHER_SERIES and CONFIRMED_RENAME; never candidates or unmatched", () => {
    expect(isClaimable("VERIFIED_EQ")).toBe(true);
    expect(isClaimable("VERIFIED_OTHER_SERIES")).toBe(true);
    expect(isClaimable("CONFIRMED_RENAME")).toBe(true);
    expect(isClaimable("CANDIDATE_RENAME")).toBe(false);
    expect(isClaimable("UNMATCHED")).toBe(false);
  });

  it("counts EQ and other series apart and keeps candidates out of the claim", () => {
    const rows = [
      { status: "VERIFIED_EQ", series: "EQ" },
      { status: "VERIFIED_EQ", series: "EQ" },
      { status: "VERIFIED_OTHER_SERIES", series: "BE" },
      { status: "CANDIDATE_RENAME", series: "EQ" },
      { status: "UNMATCHED", series: null },
    ] as unknown as UniverseRow[];
    expect(claimableCounts(rows)).toEqual({
      total: 3,
      eq: 2,
      otherSeries: 1,
      confirmedRenames: 0,
      notClaimable: 2,
    });
  });
});

describe("claim policy in the artifact (FD-29)", () => {
  it("records the founder's words verbatim", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    expect(art.policy.decided_by).toBe("founder");
    expect(art.policy.decided_on).toBe("2026-10-13");
    expect(art.policy.quotes).toEqual([
      "BE/BZ policy: include with a series label",
      "Use the verified count",
    ]);
  });

  it("the decision register carries the same founder words", () => {
    const register = fs.readFileSync(path.join(ROOT, "docs/ROADMAP.md"), "utf-8");
    expect(register).toContain("BE/BZ policy: include with a series label");
    expect(register).toContain("Use the verified count");
  });

  it("each row's claimable flag follows its status", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    for (const r of art.rows) {
      expect(r.claimable).toBe(isClaimable(r.status));
    }
  });

  it("every claimed row carries its series label, and the count is the verified count", () => {
    const art = JSON.parse(fs.readFileSync(ARTIFACT, "utf-8"));
    const claimed = art.rows.filter((r: { claimable: boolean }) => r.claimable);
    expect(claimed.length).toBeGreaterThan(0);
    for (const r of claimed) {
      expect(String(r.series)).toMatch(/^[A-Z]{1,3}$/);
    }
    const by = art.counts.by_status;
    expect(art.counts.claimable_total).toBe(claimed.length);
    expect(art.counts.claimable_total).toBe(
      by.VERIFIED_EQ + by.VERIFIED_OTHER_SERIES + by.CONFIRMED_RENAME,
    );
    expect(art.counts.claimable_eq).toBe(by.VERIFIED_EQ);
    expect(art.counts.claimable_other_series).toBe(by.VERIFIED_OTHER_SERIES);
  });
});
