/**
 * Commit O / U2 (founder round 6) — market-hours awareness tests.
 * Pure module: deterministic given a timestamp; no I/O, no locale (Rule 18).
 *
 * Round-55 addition (founder approval of the free-data adoptions, recorded
 * docs/ROADMAP-STATUS.md): the NSE closed-day facts are ADOPTED into
 * data/nse-holidays.json (2026, sourced — see the file's own provenance
 * block). The holiday fixtures below are the ch. 8 acceptance gate
 * ("market-status tests pass on holiday fixtures").
 *
 * Fixture-date note: the original U2 fixtures pinned 2026-10-02 as an open
 * Friday. 2026-10-02 (Gandhi Jayanti) is IN the adopted 2026 closed-day
 * list, so the open-day fixtures were re-pinned to 2026-10-09 (Friday, not
 * a holiday) and 2026-10-02 became a holiday fixture. This is a premise
 * change carried by the adoption itself, not a weakened check (rule 23):
 * every original assertion keeps its shape on a valid fixture date.
 */
import { describe, expect, it } from "vitest";
import { marketState, istParts, NSE_HOLIDAYS_IST } from "@/lib/marketHours";

/** A timestamp whose IST wall-clock parts we control precisely. */
function istMs(year: number, month: number, day: number, h: number, m: number): number {
  // IST = UTC+5:30 — the UTC instant for the given IST wall time is
  // Date.UTC(..., h - 5, m - 30) (Date normalizes the negative fields).
  return Date.UTC(year, month - 1, day, h - 5, m - 30);
}

describe("istParts", () => {
  it("converts a UTC instant to the IST calendar wall clock", () => {
    // 2026-10-09T04:00:00Z = 09:30 IST.
    const p = istParts(Date.UTC(2026, 9, 9, 4, 0));
    expect(p.isoDate).toBe("2026-10-09");
    expect(p.minutesFromMidnight).toBe(9 * 60 + 30);
    expect(p.weekday).toBe(5); // Friday
  });
});

describe("the adopted holiday data (single source of truth)", () => {
  it("carries the 2026 scope and the sourced facts", () => {
    // The set is built from data/nse-holidays.json — the SAME file the
    // post-deploy probe reads (rule 14: one source of truth per concept).
    expect(NSE_HOLIDAYS_IST.has("2026-01-26")).toBe(true); // Republic Day, Monday
    expect(NSE_HOLIDAYS_IST.has("2026-10-02")).toBe(true); // Gandhi Jayanti, Friday
    expect(NSE_HOLIDAYS_IST.has("2026-10-20")).toBe(true); // Dussehra, Tuesday
    // 15 dates: the founder-designated source (GauravSh-7, community-compiled
    // from NSE circulars) and the offline cross-check (pandas_market_calendars)
    // agree on these 15. The 16th pmc date, 2026-01-15 (Makar Sankranti), is
    // DISPUTED by the designated source and EXCLUDED pending the NSE-circular
    // check (fail-closed: a false closed-day would silence the 15-minute
    // freshness rule on a live session; a missing one only adds refreshes —
    // docs/evidence/round55/r55-holidays-crosscheck.md).
    expect(NSE_HOLIDAYS_IST.size).toBe(15);
    expect(NSE_HOLIDAYS_IST.has("2026-01-15")).toBe(false);
    // Every entry is a weekday ISO date — the module adds weekends itself,
    // so a weekend date in the file would be a data defect. 10:00 IST is
    // 04:30 UTC on the same calendar date (IST = UTC+5:30).
    for (const iso of NSE_HOLIDAYS_IST) {
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const wd = istParts(Date.parse(`${iso}T04:30:00.000Z`)).weekday;
      expect(wd).toBeGreaterThanOrEqual(1);
      expect(wd).toBeLessThanOrEqual(5);
    }
  });
});

describe("marketState", () => {
  it("Friday 10:00 IST (2026-10-09, NOT a holiday) → open, 60s TTL, live-delayed", () => {
    const s = marketState(istMs(2026, 10, 9, 10, 0));
    expect(s.open).toBe(true);
    expect(s.ttlSeconds).toBe(60);
    expect(s.freshness).toBe("live-delayed");
    expect(s.sessionDate).toBe("2026-10-09");
  });

  it("Friday 09:14 IST (pre-open) → NOT open (no wasted refreshes)", () => {
    const s = marketState(istMs(2026, 10, 9, 9, 14));
    expect(s.open).toBe(false);
    expect(s.freshness).toBe("close");
  });

  it("Friday 16:00 IST (after close) → close label, sessionDate today, no TTL", () => {
    const s = marketState(istMs(2026, 10, 9, 16, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeNull();
    expect(s.freshness).toBe("close");
    expect(s.sessionDate).toBe("2026-10-09");
  });

  it("Saturday 12:00 IST → closed, sessionDate = Friday", () => {
    const s = marketState(istMs(2026, 10, 10, 12, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeNull();
    expect(s.freshness).toBe("close");
    expect(s.sessionDate).toBe("2026-10-09");
  });

  it("Sunday 12:00 IST → closed, sessionDate = Friday (walks back over the weekend)", () => {
    const s = marketState(istMs(2026, 10, 11, 12, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-10-09");
  });

  it("Friday 08:00 IST (before open on a trading day) → sessionDate = the PRIOR trading day", () => {
    const s = marketState(istMs(2026, 10, 9, 8, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-10-08");
  });
});

describe("marketState on sourced NSE holidays (round-55 adoption)", () => {
  it("Republic Day (Mon 2026-01-26) 10:00 IST → closed, sessionDate = the prior Friday", () => {
    const s = marketState(istMs(2026, 1, 26, 10, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeNull();
    expect(s.freshness).toBe("close");
    expect(s.sessionDate).toBe("2026-01-23");
  });

  it("Gandhi Jayanti (Fri 2026-10-02) 10:00 IST → closed, sessionDate = Thursday", () => {
    const s = marketState(istMs(2026, 10, 2, 10, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeNull();
    expect(s.sessionDate).toBe("2026-10-01");
  });

  it("a holiday AFTER close (2026-10-02 16:00) → sessionDate = 2026-10-01, never the holiday", () => {
    const s = marketState(istMs(2026, 10, 2, 16, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-10-01");
  });

  it("a holiday BEFORE open (2026-01-26 08:00) → sessionDate = 2026-01-23 (the prior-day rule must not fire on a non-trading day)", () => {
    const s = marketState(istMs(2026, 1, 26, 8, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-01-23");
  });

  it("the Saturday after a holiday Friday (2026-10-03) walks back PAST the holiday to 2026-10-01", () => {
    const s = marketState(istMs(2026, 10, 3, 12, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-10-01");
  });

  it("Dussehra (Tue 2026-10-20) 10:00 IST → closed (the probe's holiday leg mirrors this fixture)", () => {
    const s = marketState(istMs(2026, 10, 20, 10, 0));
    expect(s.open).toBe(false);
    expect(s.freshness).toBe("close");
  });
});
