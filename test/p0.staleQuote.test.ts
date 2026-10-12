// P0 (Round 52, founder order 2026-10-12, words verbatim): the stale-quote
// freshness rule.
//
//   "A quote older than 15 minutes shows 'as of <time> · stale' and never
//    'market open · intraday quote'. Compute market status from IST trading
//    hours at display time. Acceptance: a test with a six-hour-old quote
//    shows 'stale', and the live page shows the current time."
//
// The defect: observationLabel granted "market open · intraday quote" to any
// observation whose IST calendar DATE matched the session date, and read the
// market state frozen into the ISR HTML at regeneration time — so a 13:28
// render kept claiming an intraday quote all afternoon. These contracts pin
// the display-time rule: the label takes the DISPLAY-TIME clock, derives the
// market state from IST trading hours at that clock, and renders any quote
// older than STALE_AFTER_MS as "as of <time> · stale".
//
// Fail-first: on the pre-P0 tree this file does not compile
// (observationLabel takes (observedIso, market), not (observedIso, nowMs)) —
// the import-fail RED pattern; run notes pasted in the PR.

import { describe, it, expect } from "vitest";
import {
  observationLabel,
  STALE_AFTER_MS,
} from "../lib/pricePresentation";

/** Trading-day fixtures (IST): Monday 2026-10-12, a plain NSE session. */
const MON_OPEN_1015_IST = "2026-10-12T04:45:00.000Z"; // Mon 12 Oct, 10:15 IST
const MON_1428_IST = "2026-10-12T08:58:00.000Z"; // Mon 12 Oct, 14:28 IST
/** Mon 12 Oct, 16:00 IST — after the 15:30 close. */
const MON_1600_IST_MS = Date.parse("2026-10-12T10:30:00.000Z");
/** Mon 12 Oct, 14:35 IST — market open. */
const MON_1435_IST_MS = Date.parse("2026-10-12T09:05:00.000Z");

describe("P0 — the stale-quote freshness rule (founder order 12 Oct 2026)", () => {
  it("a six-hour-old quote shows 'stale' — the founder's acceptance case (market open at display time)", () => {
    // Observed 10:15 IST, displayed 16:00 IST the same trading day: the
    // pre-P0 tree rendered "market open · intraday quote" here.
    const label = observationLabel(MON_OPEN_1015_IST, MON_1600_IST_MS);
    expect(label).toBe("as of Mon 12 Oct, 10:15 IST · stale");
  });

  it("a six-hour-old quote shows 'stale' with the market closed at display time too — the rule is absolute", () => {
    // 22:00 IST Monday — market closed; the old same-date "last session
    // quote" wording is also gone for an old quote.
    const label = observationLabel(
      MON_OPEN_1015_IST,
      Date.parse("2026-10-12T16:30:00.000Z"),
    );
    expect(label).toBe("as of Mon 12 Oct, 10:15 IST · stale");
  });

  it("the 13:28 defect itself: 14:28 quote displayed 14:35 renders intraday (7 min old — fresh)", () => {
    const label = observationLabel(MON_1428_IST, MON_1435_IST_MS);
    expect(label).toBe("Mon 12 Oct, 14:28 IST · market open · intraday quote");
  });

  it("the 13:28 defect after the window: the same quote displayed 32 minutes later is stale, never intraday", () => {
    const label = observationLabel(
      MON_1428_IST,
      Date.parse("2026-10-12T09:30:00.000Z"), // Mon 12 Oct, 15:00 IST
    );
    expect(label).toBe("as of Mon 12 Oct, 14:28 IST · stale");
    expect(label).not.toContain("intraday quote");
  });

  it("the boundary: one millisecond older than STALE_AFTER_MS is stale; exactly at the window is not yet", () => {
    const obs = Date.parse(MON_1428_IST);
    expect(observationLabel(MON_1428_IST, obs + STALE_AFTER_MS + 1)).toContain("· stale");
    expect(observationLabel(MON_1428_IST, obs + STALE_AFTER_MS)).toBe(
      "Mon 12 Oct, 14:28 IST · market open · intraday quote",
    );
  });

  it("market status comes from IST trading hours at DISPLAY time, not from the render time", () => {
    // Observed 15:29 IST (a minute before the close). Displayed 15:31 IST
    // the market is CLOSED (15:30 close) — even if the page was regenerated
    // while the market was open, the label must speak for display time.
    const obs = "2026-10-12T09:59:00.000Z"; // Mon 12 Oct, 15:29 IST
    const display = Date.parse("2026-10-12T10:01:00.000Z"); // 15:31 IST
    expect(observationLabel(obs, display)).toBe(
      "Mon 12 Oct, 15:29 IST · market closed · last session quote",
    );
  });

  it("a fresh quote on a closed market names the last session honestly", () => {
    // Displayed 15:35 IST; observed 15:29 — 6 minutes old, market closed.
    const label = observationLabel(
      "2026-10-12T09:59:00.000Z",
      Date.parse("2026-10-12T10:05:00.000Z"),
    );
    expect(label).toBe("Mon 12 Oct, 15:29 IST · market closed · last session quote");
  });

  it("a fresh observation from a PRIOR session says so even inside the 15-minute window", () => {
    // Tuesday 09:10 IST (before the open — market closed); observed Monday
    // 15:29 (the last session). Age ~17.5 h → stale per the absolute rule.
    const label = observationLabel(
      "2026-10-12T09:59:00.000Z",
      Date.parse("2026-10-13T03:40:00.000Z"), // Tue 13 Oct, 09:10 IST
    );
    expect(label).toBe("as of Mon 12 Oct, 15:29 IST · stale");
  });

  it("fail-closed: missing or unparsable observation time → null (never a fabricated clock)", () => {
    expect(observationLabel(null, MON_1435_IST_MS)).toBeNull();
    expect(observationLabel("not-a-date", MON_1435_IST_MS)).toBeNull();
    expect(observationLabel(undefined, MON_1600_IST_MS)).toBeNull();
  });
});
