/**
 * G4B (round 23 follow-up, found during #235's C6 live verification) —
 * the observation clock can actually populate.
 *
 * Defect: /api/prices/batch discloses each entry's upstream observation
 * time under BOTH `observedAt` and `lastUpdated`; the client hook
 * (useLivePrices.normalizeBatchEntry) keeps only `lastUpdated` (PriceData
 * has no observedAt field); but latestObservedAt read ONLY `.observedAt`.
 * Result: the dashboard/crypto/commodities "Observed …" clock state was
 * unreachable — every hydrated surface rendered the honest fallback
 * ("Observation time not disclosed") even while the batch API disclosed
 * genuine observation timestamps (verified live 2026-10-07 ~06:30Z:
 * GOLD observedAt 06:20:32Z, NIFTY50 06:30:46Z, …).
 *
 * Root fix: one shared extraction (observedAt ?? lastUpdated — the
 * documented ObservedEntry contract) behind BOTH latestObservedAt and
 * observationDateFromEntry, so the single-entry and multi-entry clocks
 * can never disagree about what counts as a disclosed observation.
 *
 * Fail-first: on pre-fix main the first three tests FAIL (latestObservedAt
 * returns null for lastUpdated-only entries); the raw RED output is
 * recorded in docs/evidence/round23/g4b-observation-clock.md.
 */
import { describe, expect, it } from "vitest";
import {
  latestObservedAt,
  observationDateFromEntry,
} from "@/lib/pricePresentation";
import { normalizeBatchEntry } from "@/hooks/useLivePrices";

describe("G4B — latestObservedAt reads the wire's normalized entry shape", () => {
  it("MUST FAIL PRE-FIX: a lastUpdated-only entry (the hook's PriceData) discloses its observation time", () => {
    expect(
      latestObservedAt([{ lastUpdated: "2026-10-07T06:30:46.000Z" }]),
    ).toBe("2026-10-07T06:30:46.000Z");
  });

  it("MUST FAIL PRE-FIX: composition — normalizeBatchEntry output feeds the page clock (dashboard/crypto/commodities path)", () => {
    const entry = normalizeBatchEntry({
      price: 4160,
      change: -0.64,
      changePercent24h: -0.64,
      status: "LIVE",
      source: "yahoo-bulk",
      lastUpdated: "2026-10-07T06:20:32.000Z",
    });
    expect(entry).not.toBeNull();
    expect(latestObservedAt([entry!])).toBe("2026-10-07T06:20:32.000Z");
  });

  it("MUST FAIL PRE-FIX: the LATEST across mixed observedAt/lastUpdated entries wins (verbatim string, never reformatted)", () => {
    expect(
      latestObservedAt([
        { lastUpdated: "2026-10-07T06:20:32.000Z" },
        { observedAt: "2026-10-07T06:30:46.000Z" },
        { observedAt: "2026-10-07T05:00:00.000Z" },
      ]),
    ).toBe("2026-10-07T06:30:46.000Z");
  });

  it("no disclosed time anywhere → null (never fabricated, never the fetch time)", () => {
    expect(latestObservedAt([])).toBeNull();
    expect(
      latestObservedAt([{ lastUpdated: null }, { observedAt: null }, {}]),
    ).toBeNull();
  });

  it("a non-parsable lastUpdated is ignored, not coerced", () => {
    expect(
      latestObservedAt([
        { lastUpdated: "not-a-date" },
        { lastUpdated: "2026-10-07T06:20:32.000Z" },
      ]),
    ).toBe("2026-10-07T06:20:32.000Z");
    expect(
      latestObservedAt([
        { lastUpdated: 12345 } as unknown as { lastUpdated: string | null },
      ]),
    ).toBeNull();
  });
});

describe("G4B — single-entry and multi-entry clocks agree on the contract", () => {
  it("observationDateFromEntry accepts the same legacy shape (shared extraction)", () => {
    const d = observationDateFromEntry({
      lastUpdated: "2026-10-07T06:30:46.000Z",
    });
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe("2026-10-07T06:30:46.000Z");
  });

  it("neither helper prefers lastUpdated when a genuine observedAt exists", () => {
    const e = {
      observedAt: "2026-10-07T06:30:46.000Z",
      lastUpdated: "2020-01-01T00:00:00.000Z",
    };
    expect(latestObservedAt([e])).toBe("2026-10-07T06:30:46.000Z");
    expect(observationDateFromEntry(e)!.toISOString()).toBe(
      "2026-10-07T06:30:46.000Z",
    );
  });

  it("a garbage timestamp in either field yields null, never a Date", () => {
    expect(observationDateFromEntry({ lastUpdated: "not-a-date" })).toBeNull();
    expect(observationDateFromEntry({ observedAt: 42 as unknown as string })).toBeNull();
  });
});
