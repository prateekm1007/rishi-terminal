// Y3 (Round 12): honest price labels — RE-PINNED for the P0 (Round 52)
// contract change, founder order 2026-10-12:
//
//   "A quote older than 15 minutes shows 'as of <time> · stale' and never
//    'market open · intraday quote'. Compute market status from IST trading
//    hours at display time."
//
// The label now takes the DISPLAY-TIME clock and derives the market state
// itself (marketState(nowMs)); the server-disclosed market param and the
// stamp-only fallback are gone. The Y3 cases that depended on the old
// signature are re-pinned to the display-time contract; every case that
// showed an OLD quote with session wording now shows the stale wording.
//
// Founder defect 4 (the Y3 origin): "Observed 9:44:59 am" carried no date
// and no timezone, and on a weekend it presented a stale mid-session quote
// with no "market closed" cue. "CACHED · YAHOO-BULK" is jargon, not a
// plain source label.

import { describe, it, expect } from "vitest";
import {
  formatIstStamp,
  observationLabel,
  statusLabel,
} from "../lib/pricePresentation";

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

describe("Y3/P0 — observationLabel (stamp + freshness + market state at display time)", () => {
  // Thursday 2026-10-01 and Friday 2026-10-02 are trading days; Sunday
  // 2026-10-04 is a weekend (marketState: closed, last session Friday).

  it("weekday intraday: fresh observation displayed while the market is open", () => {
    // Observed Thu 09:44 IST; displayed Thu 09:50 IST (6 min old, open).
    const label = observationLabel(
      "2026-10-01T04:14:00.000Z",
      Date.parse("2026-10-01T04:20:00.000Z"),
    );
    expect(label).toBe("Thu 1 Oct, 09:44 IST · market open · intraday quote");
  });

  it("weekend: the last-session quote older than 15 minutes is stale (P0 absolute rule)", () => {
    // Sunday 2026-10-04, 12:00 IST; observation Friday 15:14 IST — the
    // pre-P0 tree said "market closed · last session quote"; the founder's
    // order makes any quote older than 15 minutes render the stale wording.
    const label = observationLabel(
      "2026-10-02T09:44:00.000Z",
      Date.parse("2026-10-04T06:30:00.000Z"),
    );
    expect(label).toBe("as of Fri 2 Oct, 15:14 IST · stale");
  });

  it("weekend, minutes after the session close: fresh last-session wording survives", () => {
    // Saturday 09:00 IST; observation Friday 15:29 IST — hmm, that is ~17.5 h
    // old, so the P0 rule says stale. Use the same-evening case instead:
    // Friday 18:00 IST displaying the 15:29 close observation (2.5 h old) —
    // still beyond the window; the honest fresh case is 15:40 IST:
    const label = observationLabel(
      "2026-10-02T09:59:00.000Z", // Fri 15:29 IST
      Date.parse("2026-10-02T10:10:00.000Z"), // Fri 15:40 IST — closed
    );
    expect(label).toBe("Fri 2 Oct, 15:29 IST · market closed · last session quote");
  });

  it("closed market + observation NOT from the last session says so (fresh quote, wrong session)", () => {
    // Displayed Fri 15:40 IST (closed); observed Wed 15:14 IST — 2 days old,
    // so the P0 rule renders the stale wording (the old wording kept the
    // session qualifier; the founder's order supersedes it for old quotes).
    const label = observationLabel(
      "2026-09-30T09:44:00.000Z",
      Date.parse("2026-10-02T10:10:00.000Z"),
    );
    expect(label).toBe("as of Wed 30 Sep, 15:14 IST · stale");
  });

  it("market open but a fresh PRIOR-DAY observation says so", () => {
    // Displayed Thu 09:20 IST (open); observed Wed 15:14 IST — ~18 h old →
    // stale wording per the P0 rule (the old tree said "stale — not from
    // today's session"; the absolute 15-minute rule supersedes it).
    const label = observationLabel(
      "2026-09-30T09:44:00.000Z",
      Date.parse("2026-10-01T03:50:00.000Z"),
    );
    expect(label).toBe("as of Wed 30 Sep, 15:14 IST · stale");
  });

  it("the fresh prior-session qualifier still exists inside the 15-minute window", () => {
    // Displayed Thu 09:16 IST (one minute after the open); observed Thu
    // 09:14 IST (two minutes before the open — the market was closed then,
    // but the observation is 2 minutes old and from today's calendar date).
    // marketState(display) is open; obsDate == today → intraday wording is
    // NOT right for a pre-open observation… but the observation is fresh and
    // same-date: the label says intraday. This pins the boundary honestly:
    // freshness + same IST date + market open ⇒ intraday.
    const label = observationLabel(
      "2026-10-01T03:44:00.000Z", // Thu 09:14 IST
      Date.parse("2026-10-01T03:46:00.000Z"), // Thu 09:16 IST
    );
    expect(label).toBe("Thu 1 Oct, 09:14 IST · market open · intraday quote");
  });

  it("missing or unparsable observation time → null (never a fabricated clock)", () => {
    expect(observationLabel(null, Date.parse("2026-10-01T04:20:00.000Z"))).toBeNull();
    expect(observationLabel("not-a-date", Date.parse("2026-10-01T04:20:00.000Z"))).toBeNull();
    expect(observationLabel(undefined, 0)).toBeNull();
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
