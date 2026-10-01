/**
 * N3 (round 3) — the chat prompt never presents seed PE/ROE as current.
 *
 * The answer-UI label is pinned by test/freshness.surfaces.test.ts
 * (ChatClient renders <SeedDataBanner>); this test pins the OTHER half:
 * the server-built evidence text the model receives labels every
 * seed-derived number as seed data, so the assistant's replies qualify
 * what they cite (the prompt is built server-side — the client cannot
 * widen it).
 */
import { describe, it, expect } from "vitest";
import { stockEvidence } from "@/lib/chat/stockEvidence";
import { STOCKS } from "@/data/stocks";

describe("N3 — chat evidence labels seed data", () => {
  it("labels P/E and ROE as seed data with the staleness qualifier", () => {
    const ev = stockEvidence("RELIANCE");
    expect(ev).toHaveLength(1);
    const text = ev[0].text;

    const seed = STOCKS.RELIANCE;
    if (typeof seed.pe === "number" && seed.pe > 0) {
      expect(text).toContain("P/E ratio (seed data)");
    }
    if (typeof seed.roe === "number") {
      expect(text).toContain("ROE (seed data)");
    }
    // The instruction the model must see:
    expect(text).toContain("Seed fundamentals may be stale");
    expect(text).toContain("qualify any data you cite as indicative");
  });

  it("never labels the numbers as live/current/market", () => {
    const text = stockEvidence("TCS")[0].text;
    expect(text).not.toMatch(/\b(live|current|latest|real-?time|market) (price|data|P\/E|ROE)/i);
  });

  it("identifies the evidence source as the seed registry", () => {
    const ev = stockEvidence("TCS");
    expect(ev[0].id).toBe("seed:TCS:profile");
  });

  it("returns empty evidence for unknown symbols (no fabrication)", () => {
    expect(stockEvidence("NOT-A-SYMBOL")).toEqual([]);
    expect(stockEvidence("")).toEqual([]);
  });
});
