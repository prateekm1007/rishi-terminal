import { describe, expect, it } from "vitest";
import {
  MATERIALITY_THRESHOLDS,
  aiSpendAllowed,
  classifyEvent,
  classifyEvents,
  type MaterialityContext,
  type MaterialityVerdict,
} from "@/lib/intelligence/materiality";
import type { IntelligenceEvent } from "@/lib/intelligence/events";

/**
 * INT-A4 — the deterministic materiality engine (roadmap item A4).
 *
 * Scope of THIS module (one roadmap item, one PR): A3 event in, fixed
 * deterministic rules, material / non-material out. The model never
 * selects or overrides the verdict; a non-material event means ZERO
 * AI/model spend (pinned below — no later feature may add its own
 * "should we call the model?" heuristic).
 *
 * Founder-confirmed threshold set (in-session 2026-10-08, statistical
 * rules verbatim; roadmap docs/INTELLIGENCE_ROADMAP.md section 5):
 *   price:     >= 3 sigma of 20-day daily returns OR >= 4% intraday
 *   volume:    >= 3x 20-day median
 *   technical: regime change confirmed over 2 sessions
 *   portfolio: exposure change >= 2 percentage points
 * Baselines began accumulating 2026-10-07: until ~20 days of history
 * exist the engine FAILS CLOSED (insufficient-history / missing-input),
 * never guesses.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the RED proof for a new contract module (A3
 * precedent). Every case below is a gate-bites proof.
 *
 * Float-exactness note: boundary tests use exactly representable inputs
 * (integers, alternating +/-1 baselines with population sigma exactly 1)
 * so at-threshold verdicts never ride floating-point error.
 */

const RECORDED = "2026-10-08T04:59:00.000Z";
const ASOF = "2026-10-08T05:00:00.000Z"; // 60 s after RECORDED

const EVT = (over: Partial<IntelligenceEvent> = {}): IntelligenceEvent => ({
  id: "evt:PRICE:cccc",
  category: "PRICE",
  entity: "stock:RELIANCE",
  field: "change",
  unit: "percent",
  observedAt: "2026-10-08T04:07:00.000Z",
  recordedAt: RECORDED,
  source: "nse",
  sourceState: "live",
  oldValue: 1,
  newValue: 5,
  confidence: "high",
  evidenceRefs: ["cccc"],
  ...over,
});

const CTX = (over: Partial<MaterialityContext> = {}): MaterialityContext => ({
  asOf: ASOF,
  ...over,
});

/** 20 alternating +/-1 daily returns: population sigma is exactly 1. */
const SIGMA1_RETURNS: number[] = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 1 : -1));
/** 20 identical daily volumes: median is exactly 100. */
const FLAT100_VOLUMES: number[] = Array.from({ length: 20 }, () => 100);

const nonMaterialBattery: MaterialityVerdict[] = [];

function recordNonMaterial(v: MaterialityVerdict): MaterialityVerdict {
  expect(v.verdict).toBe("non-material");
  nonMaterialBattery.push(v);
  return v;
}

describe("the pre-registered threshold set (founder-confirmed, pinned)", () => {
  it("is exactly the founder-confirmed statistical set — silent drift breaks this", () => {
    expect({ ...MATERIALITY_THRESHOLDS }).toEqual({
      priceSigmaMult: 3,
      priceIntradayPct: 4,
      returnsWindow: 20,
      volumeMedianMult: 3,
      volumeWindow: 20,
      technicalConfirmSessions: 2,
      portfolioPp: 2,
    });
  });
});

describe("price: intraday >= 4% leg (no baseline needed)", () => {
  it("below threshold (3.99%) is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "change", newValue: 3.99 }),
        CTX({ priceBaseline: { dailyReturns: SIGMA1_RETURNS } }),
      ),
    );
    expect(v.reason).toBe("below-threshold");
  });

  it("exact threshold (4%) is material", () => {
    const v = classifyEvent(EVT({ field: "change", newValue: 4 }), CTX());
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("price-intraday");
    expect(v.thresholdId).toBe("price-intraday-4pct");
  });

  it("above threshold (5%) is material with no baseline at all", () => {
    const v = classifyEvent(EVT({ field: "change", newValue: 5 }), CTX());
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("price-intraday");
  });

  it("price-field events derive intraday pct from old -> new (104 vs 100 fires)", () => {
    const v = classifyEvent(
      EVT({ field: "price", unit: "inr", oldValue: 100, newValue: 105 }),
      CTX(),
    );
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("price-intraday");
  });
});

describe("price: >= 3 sigma of 20-day returns leg", () => {
  it("return below 3 sigma is non-material (intraday leg isolated out)", () => {
    // change-field 2.99% return vs sigma-1 baselines: both legs below.
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "change", newValue: 2.99 }),
        CTX({ priceBaseline: { dailyReturns: SIGMA1_RETURNS } }),
      ),
    );
    expect(v.reason).toBe("below-threshold");
  });

  it("return exactly 3 sigma is material (sigma leg has priority)", () => {
    // newValue 300 -> decimal return exactly 3 == 3 * sigma(1).
    // Intraday (300%) also fires; the sigma leg is evaluated first.
    const v = classifyEvent(
      EVT({ field: "change", newValue: 300 }),
      CTX({ priceBaseline: { dailyReturns: SIGMA1_RETURNS } }),
    );
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("price-sigma");
    expect(v.thresholdId).toBe("price-sigma-3x20d");
  });

  it("return above 3 sigma is material", () => {
    const v = classifyEvent(
      EVT({ field: "price", unit: "inr", oldValue: 100, newValue: 500 }),
      CTX({ priceBaseline: { dailyReturns: SIGMA1_RETURNS } }),
    );
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("price-sigma");
  });

  it("degenerate zero-variance baseline cannot scale: sigma leg abstains", () => {
    // 20 identical returns -> sigma exactly 0 -> no scale -> fail closed
    // on the sigma leg; intraday 1% is below -> insufficient-history.
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "change", newValue: 1 }),
        CTX({ priceBaseline: { dailyReturns: Array.from({ length: 20 }, () => 0.05) } }),
      ),
    );
    expect(v.reason).toBe("insufficient-history");
  });
});

describe("volume: >= 3x 20-day median leg", () => {
  const volEvt = (newValue: number) =>
    EVT({
      id: "evt:VOLUME:vvvv",
      category: "VOLUME",
      field: "volume24h",
      unit: "shares",
      oldValue: 100,
      newValue,
      evidenceRefs: ["vvvv"],
    });

  it("below threshold (299 vs median 100) is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(volEvt(299), CTX({ volumeBaseline: { dailyVolumes: FLAT100_VOLUMES } })),
    );
    expect(v.reason).toBe("below-threshold");
  });

  it("exact threshold (300 vs median 100) is material", () => {
    const v = classifyEvent(
      volEvt(300),
      CTX({ volumeBaseline: { dailyVolumes: FLAT100_VOLUMES } }),
    );
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("volume-surge");
    expect(v.thresholdId).toBe("volume-median-3x20d");
  });

  it("above threshold (301 vs median 100) is material", () => {
    const v = classifyEvent(
      volEvt(301),
      CTX({ volumeBaseline: { dailyVolumes: FLAT100_VOLUMES } }),
    );
    expect(v.verdict).toBe("material");
  });
});

describe("technical: regime change confirmed over 2 sessions", () => {
  const techEvt = (): IntelligenceEvent =>
    EVT({
      id: "evt:TECHNICAL:tttt",
      category: "TECHNICAL",
      field: "regime",
      unit: "label",
      oldValue: "range",
      newValue: "trend",
      evidenceRefs: ["tttt"],
    });

  it("1 confirmation session is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(
        techEvt(),
        CTX({ technical: { regimeBefore: "range", regimeAfter: "trend", sessionsConfirmed: 1 } }),
      ),
    );
    expect(v.reason).toBe("below-threshold");
  });

  it("exactly 2 confirmation sessions with a regime change is material", () => {
    const v = classifyEvent(
      techEvt(),
      CTX({ technical: { regimeBefore: "range", regimeAfter: "trend", sessionsConfirmed: 2 } }),
    );
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("technical-regime");
    expect(v.thresholdId).toBe("technical-regime-2sessions");
  });

  it("no regime change (same regime, 5 sessions) is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(
        techEvt(),
        CTX({ technical: { regimeBefore: "trend", regimeAfter: "trend", sessionsConfirmed: 5 } }),
      ),
    );
    expect(v.reason).toBe("below-threshold");
  });
});

describe("portfolio: exposure change >= 2 percentage points", () => {
  const pfEvt = (): IntelligenceEvent =>
    EVT({
      id: "evt:PORTFOLIO:pppp",
      category: "PORTFOLIO",
      entity: "portfolio:core",
      field: "exposure",
      unit: "percent",
      oldValue: 10,
      newValue: 11.99,
      evidenceRefs: ["pppp"],
    });

  it("1.99pp change is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(pfEvt(), CTX({ portfolio: { exposureBeforePp: 10, exposureAfterPp: 11.99 } })),
    );
    expect(v.reason).toBe("below-threshold");
  });

  it("exactly 2pp change is material", () => {
    const v = classifyEvent(
      pfEvt(),
      CTX({ portfolio: { exposureBeforePp: 10, exposureAfterPp: 12 } }),
    );
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("portfolio-shift");
    expect(v.thresholdId).toBe("portfolio-shift-2pp");
  });

  it("above-threshold negative-direction change is material (absolute)", () => {
    const v = classifyEvent(
      pfEvt(),
      CTX({ portfolio: { exposureBeforePp: 10, exposureAfterPp: 7.5 } }),
    );
    expect(v.verdict).toBe("material");
  });
});

describe("missing inputs fail closed (never guessed)", () => {
  it("price event with no baseline: sigma unevaluated -> missing-input, not below-threshold", () => {
    // Intraday 1% evaluates below, but the sigma leg never ran — the
    // honest verdict names the missing input, not a global "below".
    const v = recordNonMaterial(classifyEvent(EVT({ field: "change", newValue: 1 }), CTX()));
    expect(v.reason).toBe("missing-input");
    expect(v.thresholdId).toBeNull();
  });

  it("volume event with no baseline is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(
        EVT({
          id: "evt:VOLUME:vvvv",
          category: "VOLUME",
          field: "volume24h",
          unit: "shares",
          oldValue: 100,
          newValue: 900,
          evidenceRefs: ["vvvv"],
        }),
        CTX(),
      ),
    );
    expect(v.reason).toBe("missing-input");
  });

  it("technical event with no regime context is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ id: "evt:TECHNICAL:tttt", category: "TECHNICAL", field: "regime" }),
        CTX(),
      ),
    );
    expect(v.reason).toBe("missing-input");
  });

  it("19 days of returns is insufficient-history (exactly 20 evaluates)", () => {
    const nineteen = SIGMA1_RETURNS.slice(0, 19);
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "change", newValue: 1 }),
        CTX({ priceBaseline: { dailyReturns: nineteen } }),
      ),
    );
    expect(v.reason).toBe("insufficient-history");
    const ok = classifyEvent(
      EVT({ field: "change", newValue: 1 }),
      CTX({ priceBaseline: { dailyReturns: SIGMA1_RETURNS } }),
    );
    expect(ok.reason).toBe("below-threshold");
  });
});

describe("stale inputs fail closed (staleness overrides magnitude)", () => {
  it("a 50% intraday move past the caller-stated SLO is non-material", () => {
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "change", newValue: 50 }),
        CTX({ freshness: { maxAgeMs: 60_000 } , asOf: "2026-10-08T06:00:00.000Z" }),
      ),
    );
    expect(v.reason).toBe("stale");
  });

  it("age exactly at the SLO is fresh (boundary proceeds to magnitude)", () => {
    const v = classifyEvent(
      EVT({ field: "change", newValue: 50 }),
      CTX({ freshness: { maxAgeMs: 60_000 } }),
    );
    expect(v.verdict).toBe("material");
  });

  it("without a caller-stated SLO, freshness is not evaluated", () => {
    const v = classifyEvent(
      EVT({ field: "change", newValue: 50, recordedAt: "2026-09-01T00:00:00.000Z" }),
      CTX(),
    );
    expect(v.verdict).toBe("material");
  });
});

describe("unavailable and seed-derived inputs never become material", () => {
  it("unavailable source state is non-material at any magnitude", () => {
    const v = recordNonMaterial(
      classifyEvent(EVT({ field: "change", newValue: 50, sourceState: "unavailable" }), CTX()),
    );
    expect(v.reason).toBe("unavailable-input");
  });

  it("seed-derived rows are refused defence-in-depth (A3 never emits them)", () => {
    const v = recordNonMaterial(
      classifyEvent(EVT({ field: "change", newValue: 50, sourceState: "seed" }), CTX()),
    );
    expect(v.reason).toBe("seed-derived");
  });
});

describe("first observation honesty (oldValue null)", () => {
  it("price-field first observation cannot scale intraday: non-comparable", () => {
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "price", unit: "inr", oldValue: null, newValue: 100 }),
        CTX(),
      ),
    );
    expect(v.reason).toBe("non-comparable");
  });

  it("change-field first observation still carries its intraday datum", () => {
    const v = classifyEvent(EVT({ field: "change", oldValue: null, newValue: 5 }), CTX());
    expect(v.verdict).toBe("material");
    expect(v.reason).toBe("price-intraday");
  });
});

describe("non-comparable and contradictory inputs fail closed", () => {
  it("non-numeric event values cannot be scaled", () => {
    const v = recordNonMaterial(
      classifyEvent(EVT({ field: "price", unit: "inr", oldValue: 100, newValue: "oops" }), CTX()),
    );
    expect(v.reason).toBe("non-comparable");
  });

  it("zero old price cannot divide: non-comparable, never Infinity-material", () => {
    const v = recordNonMaterial(
      classifyEvent(EVT({ field: "price", unit: "inr", oldValue: 0, newValue: 100 }), CTX()),
    );
    expect(v.reason).toBe("non-comparable");
  });

  it("NaN in the baseline is contradictory input: fail closed", () => {
    // Intraday 1% stays below so the corrupt baseline decides the leg;
    // a 50% move would fire the intraday leg outright (the OR rule).
    const bad = [...SIGMA1_RETURNS];
    bad[7] = Number.NaN;
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ field: "change", newValue: 1 }),
        CTX({ priceBaseline: { dailyReturns: bad } }),
      ),
    );
    expect(v.reason).toBe("invalid-input");
  });

  it("negative members in a volume baseline are contradictory input", () => {
    const bad = [...FLAT100_VOLUMES];
    bad[3] = -5;
    const v = recordNonMaterial(
      classifyEvent(
        EVT({
          id: "evt:VOLUME:vvvv",
          category: "VOLUME",
          field: "volume24h",
          unit: "shares",
          oldValue: 100,
          newValue: 900,
          evidenceRefs: ["vvvv"],
        }),
        CTX({ volumeBaseline: { dailyVolumes: bad } }),
      ),
    );
    expect(v.reason).toBe("invalid-input");
  });

  it("categories with no registered threshold fail closed (no invented rule)", () => {
    const v = recordNonMaterial(
      classifyEvent(
        EVT({ id: "evt:EARNINGS:eeee", category: "EARNINGS", field: "eps", evidenceRefs: ["eeee"] }),
        CTX(),
      ),
    );
    expect(v.reason).toBe("no-threshold-for-category");
    expect(v.thresholdId).toBeNull();
  });
});

describe("the economic gate: non-material means ZERO AI spend (mechanical)", () => {
  it("every non-material verdict in this battery disallows spend; every material verdict allows it", () => {
    expect(nonMaterialBattery.length).toBeGreaterThan(10);
    for (const v of nonMaterialBattery) {
      expect(aiSpendAllowed(v)).toBe(false);
    }
    const material = [
      classifyEvent(EVT({ field: "change", newValue: 4 }), CTX()),
      classifyEvent(
        EVT({ field: "change", newValue: 300 }),
        CTX({ priceBaseline: { dailyReturns: SIGMA1_RETURNS } }),
      ),
    ];
    for (const v of material) {
      expect(v.verdict).toBe("material");
      expect(aiSpendAllowed(v)).toBe(true);
    }
  });

  it("A4 contains no model call: no AI, fetch, clock, or randomness surface", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("lib/intelligence/materiality.ts", "utf8");
    for (const forbidden of [
      "lib/ai",
      "fetch(",
      "Model",
      "provider",
      "prompt",
      "Date.now(",
      "new Date(",
      "Math.random(",
    ]) {
      expect(src, `forbidden surface: ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("determinism and batch behaviour", () => {
  it("same inputs in, deep-equal verdicts out; byte-stable JSON; input not mutated", () => {
    const event = EVT({ field: "change", newValue: 4 });
    const ctx = CTX();
    const snapshot = JSON.stringify({ event, ctx });
    const first = classifyEvent(event, ctx);
    const second = classifyEvent(event, ctx);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify({ event, ctx })).toBe(snapshot);
  });

  it("classifyEvents preserves order and drops nothing (one verdict per event)", () => {
    const events = [
      EVT({ id: "evt:PRICE:0001", field: "change", newValue: 4, evidenceRefs: ["0001"] }),
      EVT({ id: "evt:PRICE:0002", field: "change", newValue: 1, evidenceRefs: ["0002"] }),
    ];
    const out = classifyEvents(events, CTX());
    expect(out.map((v) => v.eventId)).toEqual(["evt:PRICE:0001", "evt:PRICE:0002"]);
    expect(out.map((v) => v.verdict)).toEqual(["material", "non-material"]);
  });

  it("verdicts carry the closed key set only", () => {
    const v = classifyEvent(EVT({ field: "change", newValue: 4 }), CTX());
    expect(Object.keys(v).sort()).toEqual(
      ["category", "detail", "eventId", "reason", "thresholdId", "verdict"].sort(),
    );
  });
});
