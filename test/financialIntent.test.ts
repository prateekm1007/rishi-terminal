/**
 * Commit N (Coder Directions §8) — the deterministic financial-data intent
 * detector (lib/ai/financialIntent.ts).
 *
 * NOT an NLP classifier: a closed, conservative, two-signal conjunction —
 *   (1) a registry security-master symbol appears as a standalone token,
 *   AND
 *   (2) a financial-data term from a closed vocabulary appears.
 *
 * A symbol-like English word alone ("your idea about patience" — IDEA is a
 * listed symbol) must NOT trigger; a data term alone ("what is a good
 * price?") must NOT trigger. The detector only decides whether a
 * context-only model reply is acceptable for a request that clearly asks
 * for symbol-specific market data — it never classifies anything else.
 */
import { describe, it, expect } from "vitest";
import { detectFinancialDataIntent } from "@/lib/ai/financialIntent";

describe("financial-data intent detector — the conjunction rule", () => {
  it("symbol + price term -> financial (the canonical case)", () => {
    const r = detectFinancialDataIntent("What is the price of RELIANCE?");
    expect(r.financial).toBe(true);
    expect(r.symbol).toBe("RELIANCE");
  });

  it("symbol + fundamentals term -> financial (mixed case, extra words)", () => {
    const r = detectFinancialDataIntent("Can you tell me j&kbank fundamentals please");
    expect(r.financial).toBe(true);
    expect(r.symbol).toBe("J&KBANK");
  });

  it("symbol + score/consensus term -> financial", () => {
    expect(detectFinancialDataIntent("What is the Rishi score for TCS?").financial).toBe(true);
    expect(detectFinancialDataIntent("Show me the consensus on INFY").financial).toBe(true);
  });

  it("symbol + ratio/metric terms -> financial", () => {
    expect(detectFinancialDataIntent("What is the ROE of HDFCBANK?").financial).toBe(true);
    expect(detectFinancialDataIntent("debt to equity for VEDL?").financial).toBe(true);
    expect(detectFinancialDataIntent("What is the P/E of INFY?").financial).toBe(true);
    expect(detectFinancialDataIntent("market cap of ITC?").financial).toBe(true);
  });

  it("symbol + explicit buy/sell advice ask -> financial (advice needs data)", () => {
    expect(detectFinancialDataIntent("Should I buy or sell TCS?").financial).toBe(true);
  });

  it("a symbol-like ENGLISH WORD with NO data term -> NOT financial (no over-trigger)", () => {
    // IDEA, TITAN, STAR… are listed symbols AND common words; without a
    // data term the request is prose, not a market-data request.
    expect(detectFinancialDataIntent("What is your idea about patience?").financial).toBe(false);
    expect(detectFinancialDataIntent("TITAN of virtue — what is discipline?").financial).toBe(false);
    expect(detectFinancialDataIntent("Tell me about the star of your philosophy").financial).toBe(false);
  });

  it("a data term with NO symbol -> NOT financial (nothing to call a tool on)", () => {
    expect(detectFinancialDataIntent("What is a good price for quality?").financial).toBe(false);
    expect(detectFinancialDataIntent("How do you think about market caps in general?").financial).toBe(false);
  });

  it("pure philosophy / greetings / empty -> NOT financial", () => {
    expect(detectFinancialDataIntent("What is the most important quality?").financial).toBe(false);
    expect(detectFinancialDataIntent("hello").financial).toBe(false);
    expect(detectFinancialDataIntent("").financial).toBe(false);
  });

  it("punctuation-joined symbol tokens still match (M&M-style)", () => {
    const r = detectFinancialDataIntent("What is the share price of M&M today?");
    expect(r.financial).toBe(true);
    expect(r.symbol).toBe("M&M");
  });

  it("the detector is case-insensitive on symbols and terms", () => {
    expect(detectFinancialDataIntent("reliance price?").financial).toBe(true);
    expect(detectFinancialDataIntent("FUNDAMENTALS of tcs").financial).toBe(true);
  });
});
