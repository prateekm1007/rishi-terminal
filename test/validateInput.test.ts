/** R5: shared symbol input validation — registry + data-derived allow-list. */
import { describe, it, expect } from "vitest";

import {
  isValidSymbol,
  validateSymbolInput,
  validateSymbolsInput,
} from "@/lib/registry/validateInput";

describe("R5 — validateSymbolInput", () => {
  it("accepts registry stocks", () => {
    expect(validateSymbolInput("RELIANCE").ok).toBe(true);
    expect(validateSymbolInput("reliance")?.ok).toBe(true); // case-normalised
  });

  it("accepts legacy aliases through the ticker registry (T12)", () => {
    // UNITECH is one of the 46 legacy aliases; resolution must pass.
    const res = validateSymbolInput("UNITECH");
    if (res.ok) expect(res.symbol).not.toBe("UNITECH"); // canonicalised
  });

  it("accepts multi-asset tickers the app itself renders", () => {
    for (const sym of ["NIFTY50", "BTC", "GOLD", "USDINR", "IN2YS"]) {
      expect(isValidSymbol(sym), `${sym} must be allowed`).toBe(true);
    }
  });

  it("rejects traversal, metacharacters and unknown tickers", () => {
    for (const bad of [
      "../../etc/passwd",
      "%2e%2e%2f",
      "RELIANCE OR 1=1",
      "http://evil",
      "NOT_A_TICKER_XYZ",
      "",
    ]) {
      expect(validateSymbolInput(bad).ok, `${bad} must be rejected`).toBe(false);
    }
  });
});

describe("R5 — validateSymbolsInput", () => {
  it("caps batches at the limit (default 50)", () => {
    const many = Array.from({ length: 51 }, (_, i) => (i === 50 ? "NOT_A_TICKER" : "RELIANCE"));
    const res = validateSymbolsInput(many.join(","));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/too many/);
  });

  it("splits, trims and uppercases a valid list", () => {
    const res = validateSymbolsInput(" reliance , TCS , btc ");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.symbols).toEqual(["RELIANCE", "TCS", "BTC"]);
  });

  it("names the offending symbols", () => {
    const res = validateSymbolsInput("RELIANCE,EVIL,BTC,NOPE1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("EVIL");
  });

  it("rejects empty input", () => {
    expect(validateSymbolsInput("").ok).toBe(false);
    expect(validateSymbolsInput(null).ok).toBe(false);
  });
});
