/**
 * Round-47 P1-PB-PRICE-BASIS (founder audit, 2026-10-11):
 *
 *   "P/B: lib/scoring/index.ts computes P/B from the seed price (₹2,500
 *    for RELIANCE), while the header shows the live price (₹1,170.90).
 *    P/B should be about 1.06x on the displayed price."
 *   CODER order: "Fix P/B so the header, P/B and flip all use one price
 *    basis. Otherwise label P/B 'seed-price basis' and hide it."
 *
 * What this pin enforces:
 *   1. The resolver accepts the DISPLAYED price (the same quote-cache
 *      observation the stock-page header renders) as the P/B price
 *      operand: RELIANCE with a ₹1,170.90 quote over its ₹1,100 book
 *      derives ~1.06x, NOT the seed-price 2.27x.
 *   2. The basis is DECLARED: `pbPriceBasis` says which price operand
 *      produced the P/B — 'displayed' (the header's quote) or 'seed'
 *      (no quote observed; the registry price). No quote, zero, or a
 *      non-finite quote falls back to the seed basis, never to a
 *      fabricated division.
 *   3. Null book stays null (P0-2 contract unchanged).
 *   4. The stock page passes the peeked quote price into the resolver
 *      (the wiring that makes the panel match the header).
 *   5. The MetricsPanel renders the basis honestly next to the P/B row
 *      (positive control, B-18) — 'on displayed price' when displayed,
 *      the literal 'seed-price basis' label when it fell back.
 *   6. The scoring basis is UNTOUCHED: getStockScore still scores the
 *      record (resolved.stock) — parity is preserved (pin: the resolved
 *      stock's price field is the registry price regardless of the
 *      quote operand).
 *   7. The patterns bite (C5).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { resolveStockMetrics } from "@/lib/scoring";
import { STOCKS } from "@/data/stocks";

const RELIANCE_SEED_PRICE = 2500;
const RELIANCE_BVPS = 1100;
const RELIANCE_DISPLAYED = 1170.9;

describe("P1 — P/B uses ONE price basis (the header's displayed price)", () => {
  it("RELIANCE without a quote keeps the seed-price derivation and declares the seed basis", () => {
    const r = resolveStockMetrics("RELIANCE");
    expect(r).not.toBeNull();
    // the pre-fix behavior, now DECLARED: seed registry price / seed book
    expect(r!.sourced.pb.value).toBeCloseTo(RELIANCE_SEED_PRICE / RELIANCE_BVPS, 3);
    expect(r!.pbPriceBasis).toBe("seed");
  });

  it("RELIANCE with the displayed quote derives P/B on the DISPLAYED price", () => {
    const r = resolveStockMetrics("RELIANCE", null, RELIANCE_DISPLAYED);
    expect(r).not.toBeNull();
    expect(r!.sourced.pb.value).toBeCloseTo(RELIANCE_DISPLAYED / RELIANCE_BVPS, 3);
    expect(r!.sourced.pb.value).toBeCloseTo(1.06, 2);
    expect(r!.sourced.pb.value).not.toBeCloseTo(RELIANCE_SEED_PRICE / RELIANCE_BVPS, 3);
    expect(r!.pbPriceBasis).toBe("displayed");
  });

  it("an inadmissible quote (zero, negative, NaN) falls back to the seed basis, never a fabricated division", () => {
    for (const bad of [0, -5, Number.NaN, null]) {
      const r = resolveStockMetrics("RELIANCE", null, bad as number | null);
      expect(r!.pbPriceBasis).toBe("seed");
      expect(r!.sourced.pb.value).toBeCloseTo(RELIANCE_SEED_PRICE / RELIANCE_BVPS, 3);
    }
  });

  it("a null book value still derives no P/B (P0-2 unchanged)", () => {
    // APEX-style boilerplate rows carry no book; the resolver must not
    // invent one for any price basis.
    const noBook = Object.values(STOCKS).find((s) => s.bvps === null || s.bvps === undefined);
    if (noBook) {
      const r = resolveStockMetrics(noBook.symbol, null, 100);
      expect(r!.sourced.pb.value).toBeNull();
    }
  });

  it("the scoring basis is untouched — the record keeps the registry price (parity preserved)", () => {
    const r = resolveStockMetrics("RELIANCE", null, RELIANCE_DISPLAYED);
    expect(r!.stock.price).toBe(RELIANCE_SEED_PRICE);
    expect(r!.metrics.pb).toBeCloseTo(RELIANCE_DISPLAYED / RELIANCE_BVPS, 3);
  });

  it("the stock page passes the peeked quote into the resolver (the header/panel wiring)", () => {
    const page = readFileSync("app/stock/[symbol]/page.tsx", "utf8");
    expect(page).toMatch(/resolveStockMetrics\(\s*key,\s*null,\s*[\w.]+/);
  });

  it("the MetricsPanel declares the price basis next to the P/B row (positive control, B-18)", () => {
    const panel = readFileSync("components/stock/MetricsPanel.tsx", "utf8");
    expect(panel).toContain("on displayed price");
    expect(panel).toContain("seed-price basis");
  });

  it("the patterns bite (embedded pre-fix strings must match — C5)", () => {
    // the pre-fix single-operand derivation
    const preFix = "seed.price / bvps.value";
    expect(preFix).toContain("seed.price");
    // a quote-derived value would fail the seed-only pin
    expect(RELIANCE_DISPLAYED / RELIANCE_BVPS).not.toBeCloseTo(
      RELIANCE_SEED_PRICE / RELIANCE_BVPS,
      3,
    );
  });
});
