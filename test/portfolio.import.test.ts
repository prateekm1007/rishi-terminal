// X3-07 (Round 14) — the import acceptance: "re-importing the same file is
// a no-op; malformed rows reported, never silently dropped".
//
// The pure pipeline halves live here (parse + hash). The DB half (the
// per-user unique index that makes the noop atomic even under a race) is
// proven in the CI Postgres job (scripts/ci/portfolio_rls_invariants.sql)
// and pinned at source level by test/rls.portfolio.test.ts.
//
// Rule 24 bite: on the pre-X3-07 tree this file fails at import (no
// importCsv module); recorded in the PR.

import { describe, expect, it } from "vitest";
import { parsePortfolioCsv } from "../lib/portfolio/importCsv";

const GENERIC_CSV = `Date,Symbol,Type,Quantity,Price
2024-01-15,RELIANCE,buy,10,2500.50
2024-02-01,TCS,Buy,5,3800
2024-03-10,INFY,sell,2,1450.25`;

describe("X3-07 — the generic trade format", () => {
  it("parses every valid row with normalised sides, dates and quantities", () => {
    const r = parsePortfolioCsv(GENERIC_CSV);
    expect(r.transactions).toHaveLength(3);
    expect(r.errors).toHaveLength(0);
    expect(r.transactions[0]).toEqual({ tradeDate: "2024-01-15", symbol: "RELIANCE", side: "buy", quantity: 10, price: 2500.5 });
    expect(r.transactions[1].side).toBe("buy");
    expect(r.transactions[2].side).toBe("sell");
    expect(r.sourceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("re-parsing the SAME file yields the SAME hash (the idempotency key)", () => {
    const a = parsePortfolioCsv(GENERIC_CSV);
    const b = parsePortfolioCsv(GENERIC_CSV);
    expect(a.sourceHash).toBe(b.sourceHash);
    // re-exports with blank lines / CRLF / column-case changes hash equal too
    const c = parsePortfolioCsv(GENERIC_CSV.replace(/\n/g, "\r\n"));
    const d = parsePortfolioCsv("date,symbol,type,qty,price\n" + GENERIC_CSV.split("\n").slice(1).join("\n"));
    expect(c.sourceHash).toBe(a.sourceHash);
    expect(d.sourceHash).toBe(a.sourceHash);
  });

  it("a DIFFERENT file yields a different hash", () => {
    const a = parsePortfolioCsv(GENERIC_CSV);
    const b = parsePortfolioCsv(GENERIC_CSV + "\n2024-04-02,WIPRO,buy,20,480");
    expect(b.sourceHash).not.toBe(a.sourceHash);
  });
});

describe("X3-07 — malformed rows are reported, never silently dropped", () => {
  it("each bad row carries its line number and a reason; good rows still import", () => {
    const csv = `Date,Symbol,Type,Quantity,Price
2024-01-15,RELIANCE,buy,10,2500.50
not-a-date, oops
2024-02-01,TCS,buy,zero,3800
2024-02-01,TCS,buy,5,not-a-price
2024-03-10,INFY,sell,2,1450.25`;
    const r = parsePortfolioCsv(csv);
    expect(r.transactions).toHaveLength(2); // the two good rows survive
    expect(r.errors).toHaveLength(3);
    expect(r.errors.map(e => e.line)).toEqual([3, 4, 5]);
    expect(r.errors.every(e => e.reason.length > 0 && e.raw.length > 0)).toBe(true);
    expect(r.totalRows).toBe(5);
  });

  it("header-less, wrong-format and empty files fail loudly (no partial import)", () => {
    expect(() => parsePortfolioCsv("")).toThrow();
    expect(() => parsePortfolioCsv("one,two,three\n1,2,3")).toThrow(/unrecognised format/);
  });

  it("the CAS shape parses: narrative lines are reported as skipped, not dropped", () => {
    const cas = `CDSL e-Statement
PAN: ABCDE1234F
,Txn Date,Scrip,ISIN,Transaction Type,Quantity,Price / Nav,
,01/04/2023,Infosys,INE009A01021,Purchase,50,1420.00,
,15/06/2023,Infosys,INE009A01021,Sell,20,1580.00,`;
    const r = parsePortfolioCsv(cas, "cas");
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0]).toEqual({ tradeDate: "2023-04-01", symbol: "INFOSYS", side: "buy", quantity: 50, price: 1420 });
    expect(r.transactions[1].side).toBe("sell");
    expect(r.errors).toHaveLength(0);
  });
});
