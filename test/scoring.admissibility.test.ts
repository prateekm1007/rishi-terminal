/**
 * Coder Directions G5 (audit 2026-10-02) — field-specific live admissibility.
 *
 * The resolver must NOT use one global "> 0" test for every fundamental.
 * Zero and negative values are legitimate observations for several fields;
 * reinterpreting them as "missing" substitutes the seed and the AI sees a
 * different number than the provider reported (rules 15/16).
 *
 * Mandated fail-first cases (each proves the intended provenance):
 *   live ROE = 0            → live
 *   live ROE = -4.2         → live
 *   live revenue CAGR -12.5 → live
 *   live promoter = 0       → live
 *   live D/E = 0            → live
 *   live marketCap = 0      → NOT live (provider defect; seed keeps baseline)
 *   live field = null       → NOT live (upstream missing; seed keeps baseline)
 *
 * Rule 21: written against the pre-G5 resolver these cases returned
 * source "seed" for every zero/negative value (raw output archived in the
 * PR); the admissibility table makes them behave as specified.
 */
import { describe, expect, it } from "vitest";
import { resolveStockMetrics } from "@/lib/scoring";
import { isAdmissibleLive } from "@/lib/types/admissibility";

const SYMBOL = "RELIANCE";

function resolveWith(patch: Record<string, number | null>) {
  return resolveStockMetrics(SYMBOL, {
    pe: null, roe: null, roce: null, opm: null, debtToEquity: null,
    promoterHolding: null, revCagr3y: null, epsCagr: null, marketCap: null,
    bookValue: null, lastUpdated: "2026-09-30T10:00:00.000Z", source: "screener",
    ...patch,
  } as any)!;
}

describe("G5 — zero/negative observations are LIVE, never silently reseeded", () => {
  it("live ROE = 0 → source 'live', value 0", () => {
    const r = resolveWith({ roe: 0 });
    expect(r.fields.roe).toMatchObject({ value: 0, source: "live" });
    expect(r.fields.roe.asOf).toBe("2026-09-30T10:00:00.000Z");
  });

  it("live ROE = -4.2 → source 'live' (loss-making year is a real observation)", () => {
    const r = resolveWith({ roe: -4.2 });
    expect(r.fields.roe).toMatchObject({ value: -4.2, source: "live" });
  });

  it("live revenue CAGR = -12.5 → source 'live'", () => {
    const r = resolveWith({ revCagr3y: -12.5 });
    expect(r.fields.revcagr).toMatchObject({ value: -12.5, source: "live" });
  });

  it("live promoter holding = 0 → source 'live'", () => {
    const r = resolveWith({ promoterHolding: 0 });
    expect(r.fields.promo).toMatchObject({ value: 0, source: "live" });
  });

  it("live D/E = 0 → source 'live' (debt-free is real, not missing)", () => {
    const r = resolveWith({ debtToEquity: 0 });
    expect(r.fields.de).toMatchObject({ value: 0, source: "live" });
  });

  it("live OPEX margin negative → source 'live'", () => {
    const r = resolveWith({ opm: -3.1 });
    expect(r.fields.opm).toMatchObject({ value: -3.1, source: "live" });
  });

  it("live EPS CAGR negative → source 'live'", () => {
    const r = resolveWith({ epsCagr: -8 });
    expect(r.fields.epscagr).toMatchObject({ value: -8, source: "live" });
  });

  it("negative BVPS (negative equity) stays live and PB handles it explicitly", () => {
    const r = resolveWith({ bookValue: -120 });
    expect(r.fields.bvps).toMatchObject({ value: -120, source: "live" });
    // PB derivation divides ONLY on a positive BVPS — a negative one must
    // not mint a nonsense negative PB; the derivation says 0 + derived.
    expect(r.fields.pb.value).toBe(0);
    expect(r.fields.pb.source).toBe("derived");
  });
});

describe("G5 — provider defects and missing data keep the seed baseline", () => {
  it("live marketCap = 0 → NOT live (a listed company has positive market cap)", () => {
    const r = resolveWith({ marketCap: 0 });
    expect(r.fields.mktcap.source).toBe("seed");
  });

  it("live pe = 0 / negative → NOT live (P/E sentinel for no meaningful earnings)", () => {
    expect(resolveWith({ pe: 0 }).fields.pe.source).toBe("seed");
    expect(resolveWith({ pe: -12 }).fields.pe.source).toBe("seed");
  });

  it("live field = null → seed (missing is never reinterpreted as zero)", () => {
    const r = resolveWith({ roe: null });
    expect(r.fields.roe.source).toBe("seed");
    expect(r.fields.roe.value).toBeGreaterThan(0);
  });

  it("live field = NaN → seed (failed fetch never overrides)", () => {
    const r = resolveWith({ roe: Number.NaN });
    expect(r.fields.roe.source).toBe("seed");
  });

  it("out-of-range promoter holding (>100) → seed", () => {
    const r = resolveWith({ promoterHolding: 140 });
    expect(r.fields.promo.source).toBe("seed");
  });
});

describe("G5 — admissibility table unit checks", () => {
  it("table covers every resolver field and defaults fail-closed", () => {
    expect(isAdmissibleLive("roe", -4.2)).toBe(true);
    expect(isAdmissibleLive("de", 0)).toBe(true);
    expect(isAdmissibleLive("mktcap", 0)).toBe(false);
    expect(isAdmissibleLive("pe", 0)).toBe(false);
    expect(isAdmissibleLive("unknown_field", 5)).toBe(true);
    expect(isAdmissibleLive("unknown_field", -5)).toBe(false);
  });
});
