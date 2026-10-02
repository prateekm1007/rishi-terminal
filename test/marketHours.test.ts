/**
 * Commit O / U2 (founder round 6) — market-hours awareness tests.
 * Pure module: deterministic given a timestamp; no I/O, no locale (Rule 18).
 */
import { describe, expect, it } from "vitest";
import { marketState, istParts } from "@/lib/marketHours";

/** A timestamp whose IST wall-clock parts we control precisely. */
function istMs(year: number, month: number, day: number, h: number, m: number): number {
  // IST = UTC+5:30 — the UTC instant for the given IST wall time is
  // Date.UTC(..., h - 5, m - 30) (Date normalizes the negative fields).
  return Date.UTC(year, month - 1, day, h - 5, m - 30);
}

describe("istParts", () => {
  it("converts a UTC instant to the IST calendar wall clock", () => {
    // 2026-10-02T04:00:00Z = 09:30 IST.
    const p = istParts(Date.UTC(2026, 9, 2, 4, 0));
    expect(p.isoDate).toBe("2026-10-02");
    expect(p.minutesFromMidnight).toBe(9 * 60 + 30);
    expect(p.weekday).toBe(5); // Friday
  });
});

describe("marketState", () => {
  it("Friday 10:00 IST → open, 60s TTL, live-delayed", () => {
    const s = marketState(istMs(2026, 10, 2, 10, 0));
    expect(s.open).toBe(true);
    expect(s.ttlSeconds).toBe(60);
    expect(s.freshness).toBe("live-delayed");
    expect(s.sessionDate).toBe("2026-10-02");
  });

  it("Friday 09:14 IST (pre-open) → NOT open (no wasted refreshes)", () => {
    const s = marketState(istMs(2026, 10, 2, 9, 14));
    expect(s.open).toBe(false);
    expect(s.freshness).toBe("close");
  });

  it("Friday 16:00 IST (after close) → close label, sessionDate today, no TTL", () => {
    const s = marketState(istMs(2026, 10, 2, 16, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeNull();
    expect(s.freshness).toBe("close");
    expect(s.sessionDate).toBe("2026-10-02");
  });

  it("Saturday 12:00 IST → closed, sessionDate = Friday", () => {
    const s = marketState(istMs(2026, 10, 3, 12, 0));
    expect(s.open).toBe(false);
    expect(s.ttlSeconds).toBeNull();
    expect(s.freshness).toBe("close");
    expect(s.sessionDate).toBe("2026-10-02");
  });

  it("Sunday 12:00 IST → closed, sessionDate = Friday (walks back over the weekend)", () => {
    const s = marketState(istMs(2026, 10, 4, 12, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-10-02");
  });

  it("Friday 08:00 IST (before open on a trading day) → sessionDate = the PRIOR trading day", () => {
    const s = marketState(istMs(2026, 10, 2, 8, 0));
    expect(s.open).toBe(false);
    expect(s.sessionDate).toBe("2026-10-01");
  });
});
