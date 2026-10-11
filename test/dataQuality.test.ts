/**
 * Round-46 P0-1 (founder audit 2026-10-11): the closed dataQuality
 * vocabulary — live | delayed | seed | missing — and the verdict gate.
 *
 * Founder order (verbatim scope): "add dataQuality (live, delayed, seed,
 * missing). Seed rows show no verdict, and the badge reads from that
 * field." Rule 21: these pins were watched FAILING on the mounted tree
 * (the derivation module did not exist and every seed record scored a
 * numeric consensus) before the gate was implemented.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DATA_QUALITY_VALUES,
  QUALITY_FIELDS,
  verdictsAllowed,
  dataQualityFromSeedStock,
  dataQualityFromResolvedFields,
  noVerdictCategory,
} from "@/lib/scoring/dataQuality";
import { getStockScore } from "@/lib/scoring";
import { resolveStockMetrics } from "@/lib/scoring";
import { buildConsensus } from "@/lib/consensus/engine";
import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/types";

const NOW = Date.parse("2026-10-11T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const field = (value: number, source: "seed" | "live" | "derived", asOf: string | null = null) =>
  ({ value, source, asOf });

const seedFields = (vals: Partial<Record<string, number>> = {}) =>
  Object.fromEntries(
    QUALITY_FIELDS.map((f) => [f, field(vals[f] ?? 10, "seed")]),
  );

const liveFields = (asOf: string | null = new Date(NOW - DAY).toISOString()) =>
  Object.fromEntries(QUALITY_FIELDS.map((f) => [f, field(10, "live", asOf)]));

describe("P0-1 — the closed dataQuality vocabulary", () => {
  it("the vocabulary is exactly live | delayed | seed | missing", () => {
    expect([...DATA_QUALITY_VALUES]).toEqual(["live", "delayed", "seed", "missing"]);
  });

  it("verdicts are allowed only on live and delayed records", () => {
    expect(verdictsAllowed("live")).toBe(true);
    expect(verdictsAllowed("delayed")).toBe(true);
    expect(verdictsAllowed("seed")).toBe(false);
    expect(verdictsAllowed("missing")).toBe(false);
  });

  it("the module is client-safe (no server-only import — the badge reads it)", () => {
    const src = readFileSync(join(process.cwd(), "lib/scoring/dataQuality.ts"), "utf8");
    expect(src).not.toMatch(/server-only/);
  });
});

describe("P0-1 — derivation from a bare seed record", () => {
  it("a healthy illustrative record (RELIANCE) is seed — never live, never scored", () => {
    const reliance = STOCKS["RELIANCE"] as Stock;
    expect(reliance).toBeDefined();
    expect(dataQualityFromSeedStock(reliance)).toBe("seed");
  });

  it("an all-zero record is missing (no usable data)", () => {
    const zero = {
      symbol: "ZERO", name: "Zero Corp", sector: "IT", exchange: "NSE",
      price: 100, pe: 0, roe: 0, mktcap: 0, ocf: 0, rev: 0, revcagr: 0,
      epscagr: 0, opm: 0, roce: 0, de: 0, fcf: 0, promo: 0, ca: 0, tl: 0,
      sh: 100, np: 0, dep: 0, capex: 0, bvps: 0,
    } as Stock;
    expect(dataQualityFromSeedStock(zero)).toBe("missing");
  });

  it("an internally impossible record (KWALITY shape: np>0 with pe 0) is missing", () => {
    const kw = STOCKS["KWALITY"] as Stock;
    expect(kw).toBeDefined();
    expect(kw.np).toBeGreaterThan(0);
    expect(kw.pe).toBe(0);
    expect(dataQualityFromSeedStock(kw)).toBe("missing");
  });

  it("a non-finite core field is missing", () => {
    const bad = { ...(STOCKS["SBIN"] as Stock), pe: Number.NaN } as Stock;
    expect(dataQualityFromSeedStock(bad)).toBe("missing");
  });
});

describe("P0-1 — derivation from resolved fields (the live-overlay-aware path)", () => {
  it("all-seed fields with values are seed", () => {
    expect(dataQualityFromResolvedFields(seedFields(), { now: NOW })).toBe("seed");
  });

  it("all-seed fields that are all zero are missing", () => {
    const zeros = Object.fromEntries(QUALITY_FIELDS.map((f) => [f, field(0, "seed")]));
    expect(dataQualityFromResolvedFields(zeros, { now: NOW })).toBe("missing");
  });

  it("every quality field live and fresh is live", () => {
    expect(dataQualityFromResolvedFields(liveFields(), { now: NOW })).toBe("live");
  });

  it("every field live but one undated is delayed (live-undated claims nothing fresh)", () => {
    const fields = liveFields(null);
    expect(dataQualityFromResolvedFields(fields, { now: NOW })).toBe("delayed");
  });

  it("every field live but one stale beyond the budget is delayed", () => {
    const fields = liveFields(new Date(NOW - 30 * DAY).toISOString());
    expect(dataQualityFromResolvedFields(fields, { now: NOW })).toBe("delayed");
  });

  it("a seed-contaminated mix (one seed field among live ones) is seed — never a verdict", () => {
    const fields = liveFields();
    fields["promo"] = field(0, "seed");
    expect(dataQualityFromResolvedFields(fields, { now: NOW })).toBe("seed");
  });
});

describe("P0-1 — the verdict gate on the ONE scoring surface", () => {
  it("noVerdictCategory names the honest states", () => {
    expect(noVerdictCategory("seed")).toBe("No Verdict — Seed Data");
    expect(noVerdictCategory("missing")).toBe("No Verdict — No Usable Data");
  });

  it("a seed record produces NO consensus and the no-verdict category", () => {
    const report = getStockScore(STOCKS["SBIN"] as Stock);
    expect(report.dataQuality).toBe("seed");
    expect(report.consensus).toBeNull();
    expect(report.category).toBe("No Verdict — Seed Data");
  });

  it("the per-framework score substrate still exists (P0-2/P0-3/P0-4 work on it)", () => {
    const report = getStockScore(STOCKS["SBIN"] as Stock);
    expect(report.scores).toHaveLength(20);
  });

  it("the seed-only resolved path (stock page without live overlay) is gated identically", () => {
    const resolved = resolveStockMetrics("RELIANCE");
    expect(resolved).not.toBeNull();
    const report = getStockScore(resolved!);
    expect(report.dataQuality).toBe("seed");
    expect(report.consensus).toBeNull();
    expect(report.category).toBe("No Verdict — Seed Data");
  });

  it("EVERY current registry record is seed or missing — the whole universe is verdict-blocked", () => {
    // The founder's order is categorical: seed rows show no verdict. The
    // seed dataset is SEED_STATUS 'placeholder' — until live fundamentals
    // cover a record fully, no verdict may be produced for it.
    for (const stock of Object.values(STOCKS)) {
      const report = getStockScore(stock);
      expect(verdictsAllowed(report.dataQuality)).toBe(false);
      expect(report.consensus).toBeNull();
    }
  });

  it("the engine labels the input honestly (math substrate ungated at engine level)", () => {
    expect(buildConsensus(STOCKS["SBIN"] as Stock).dataQuality).toBe("seed");
  });
});
