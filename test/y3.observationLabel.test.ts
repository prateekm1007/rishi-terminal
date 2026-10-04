// Y3 (Round 12): honest price labels.
//
// Founder defect 4: the first-byte quote said "Observed 9:44:59 am" with no
// date and no timezone, and on a weekend it presented a stale mid-session
// quote with no "market closed" cue. "CACHED · YAHOO-BULK" is jargon, not a
// plain source label.
//
// The contracts below are written to FAIL FIRST against the pre-Y3 tree
// (Rule 21): the formatter functions do not exist yet and the jargon labels
// are still the old uppercase form. Run notes are pasted in PR (Y3).

import { describe, it, expect } from "vitest";
import {
  formatIstStamp,
  observationLabel,
  statusLabel,
} from "../lib/pricePresentation";

/** Wire market state shape (U2) — the label reads ONLY server-disclosed
 *  fields, never a client clock (Rule 18). */
interface MiniMarket {
  open: boolean;
  sessionDate: string;
}

describe("Y3 — formatIstStamp (date + time + timezone, IST arithmetic)", () => {
  it("renders 'Thu 1 Oct, 09:44 IST' for a Thursday 09:44 IST observation", () => {
    // 2026-10-01T09:44 IST is a Thursday.
    const d = new Date("2026-10-01T04:14:00.000Z"); // 09:44 IST
    expect(formatIstStamp(d)).toBe("Thu 1 Oct, 09:44 IST");
  });

  it("zero-pads the clock and keeps single-digit day unpadded", () => {
    const d = new Date("2026-10-04T02:31:00.000Z"); // Sun 4 Oct, 08:01 IST
    expect(formatIstStamp(d)).toBe("Sun 4 Oct, 08:01 IST");
  });

  it("renders the IST calendar day even for late-UTC observations", () => {
    // 2026-10-02T20:30Z = Sat 3 Oct, 02:00 IST.
    const d = new Date("2026-10-02T20:30:00.000Z");
    expect(formatIstStamp(d)).toBe("Sat 3 Oct, 02:00 IST");
  });
});

describe("Y3 — observationLabel (stamp + market state + session qualifier)", () => {
  // Thursday 2026-10-01 is a trading day; Friday 2026-10-02 is the prior
  // session relative to the Sunday-2026-10-04 fixtures.

  it("weekday intraday: market open + same-session observation", () => {
    const market: MiniMarket = { open: true, sessionDate: "2026-10-01" };
    const label = observationLabel("2026-10-01T04:14:00.000Z", market);
    expect(label).toBe("Thu 1 Oct, 09:44 IST · market open · intraday quote");
  });

  it("weekend: closed market + observation from the last session", () => {
    // Sunday 2026-10-04; last session Friday 2026-10-02.
    const market: MiniMarket = { open: false, sessionDate: "2026-10-02" };
    const label = observationLabel("2026-10-02T09:44:00.000Z", market);
    expect(label).toBe("Fri 2 Oct, 15:14 IST · market closed · last session quote");
  });

  it("closed market + observation NOT from the last session says so", () => {
    const market: MiniMarket = { open: false, sessionDate: "2026-10-02" };
    const label = observationLabel("2026-09-30T09:44:00.000Z", market);
    expect(label).toBe("Wed 30 Sep, 15:14 IST · market closed · stale — not from the last session");
  });

  it("NSE holiday: closed market, observation from the last real session", () => {
    // Synthetic holiday scenario (the calendar itself stays unsourced, Rule
    // 4): today is a holiday, the label logic must still ground on the last
    // REAL session date the server disclosed.
    const market: MiniMarket = { open: false, sessionDate: "2026-10-02" };
    const label = observationLabel("2026-10-02T06:00:00.000Z", market);
    expect(label).toBe("Fri 2 Oct, 11:30 IST · market closed · last session quote");
  });

  it("market open but stale (prior-day) observation says so", () => {
    const market: MiniMarket = { open: true, sessionDate: "2026-10-01" };
    const label = observationLabel("2026-09-30T09:44:00.000Z", market);
    expect(label).toBe("Wed 30 Sep, 15:14 IST · market open · stale — not from today's session");
  });

  it("no disclosed market state → stamp only, no state claim", () => {
    const label = observationLabel("2026-10-01T04:14:00.000Z", null);
    expect(label).toBe("Thu 1 Oct, 09:44 IST");
  });

  it("missing or unparsable observation time → null (never a fabricated clock)", () => {
    expect(observationLabel(null, { open: true, sessionDate: "2026-10-01" })).toBeNull();
    expect(observationLabel("not-a-date", { open: true, sessionDate: "2026-10-01" })).toBeNull();
    expect(observationLabel(undefined, null)).toBeNull();
  });
});

describe("Y3 — statusLabel: jargon replaced by the plain source label", () => {
  it("cached yahoo-bulk renders 'Delayed · Yahoo Finance (unofficial)'", () => {
    expect(statusLabel("cached", "yahoo-bulk")).toBe("Delayed · Yahoo Finance (unofficial)");
  });

  it("live yahoo renders the same plain transport label (delayed, not realtime)", () => {
    expect(statusLabel("live", "yahoo")).toBe("Delayed · Yahoo Finance (unofficial)");
  });

  it("derived yahoo names its transport without a realtime claim", () => {
    expect(statusLabel("derived", "yahoo-etf-proxy")).toBe("Derived · Yahoo Finance (unofficial)");
  });

  it("non-delayed sources keep the machine wording (unchanged)", () => {
    expect(statusLabel("live", "exchangerate-api")).toBe("LIVE · EXCHANGERATE-API");
    expect(statusLabel("cached", "fred-csv")).toBe("CACHED · FRED-CSV");
  });

  it("unavailable/loading wording unchanged", () => {
    expect(statusLabel("unavailable", undefined)).toBe("UNAVAILABLE");
    expect(statusLabel("loading", undefined)).toBe("LOADING…");
  });
});
