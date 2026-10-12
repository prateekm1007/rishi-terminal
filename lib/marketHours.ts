// lib/marketHours.ts — U2 (founder round 6): NSE market-hours awareness.
//
// A PURE module (deterministic, no I/O): given a moment, is the NSE equity
// market open, and what TTL should the shared quote cache use?
//
//   - open:  Mon–Fri 09:15–15:30 IST (pre-open 09:00–09:15 is NOT "open"
//     for quote-freshness purposes — prices barely move and the 60 s TTL
//     would be wasted upstream volume).
//   - closed: nights, weekends, sourced NSE holidays → the last close is
//     the honest observation; NO polling (the client hook receives
//     "market open: false" and stops).
//
// Holidays — ADOPTED (round 55, 13 Oct 2026). The founder approved the
// free-data adoptions and designated the in-app source (GauravSh-7/
// nse-trading-holidays-2018-2026, MIT, community-compiled "cross-verified
// against official NSE India holiday calendars and exchange circulars"),
// which resolves the U2 FOUNDER DECISION NEEDED on the calendar source.
// The closed-day facts live in data/nse-holidays.json — the single source
// of truth shared with the post-deploy probe (rule 14) — and carry their
// provenance inline: 15 dates agreed by the designated source and the
// offline cross-check (pandas_market_calendars, MIT, tooling only — never
// an app dependency); the disputed 2026-01-15 is excluded pending the
// NSE-circular check (fail-closed direction; see the JSON block and
// docs/evidence/round55/r55-holidays-crosscheck.md). Scope is the 2026
// calendar year; outside it the module degrades to the honest weekend-only
// behavior (extra 60 s refreshes on unknown holidays, never a wrong
// label). The annual December ritual diffs the file against NSE's official
// list before each January and resolves the disputed date
// (docs/DATA_SOURCES.md row 16).

import holidaysData from "@/data/nse-holidays.json";

/** NSE equity session bounds in IST, as minutes-from-midnight. */
export const NSE_OPEN_MIN = 9 * 60 + 15; // 09:15 IST
export const NSE_CLOSE_MIN = 15 * 60 + 30; // 15:30 IST

/** The sourced NSE closed days (2026 scope) — built from
 *  data/nse-holidays.json, the same file the post-deploy probe reads. */
export const NSE_HOLIDAYS_IST: ReadonlySet<string> = new Set(
  holidaysData.holidays as readonly string[],
);
/** The calendar year the adopted holiday facts cover (from the same file). */
export const NSE_HOLIDAYS_SCOPE_YEAR: number = holidaysData.year;

/** Offset of IST from UTC, in minutes (+5:30). */
export const IST_OFFSET_MIN = 330;

/** The IST calendar moment for a JS timestamp (no locale dependence —
 *  computed arithmetically so render paths stay deterministic, Rule 18). */
export function istParts(nowMs: number = Date.now()): {
  year: number; month: number; day: number; weekday: number; minutesFromMidnight: number; isoDate: string;
} {
  const shifted = new Date(nowMs + IST_OFFSET_MIN * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const weekday = shifted.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const minutesFromMidnight = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { year, month, day, weekday, minutesFromMidnight, isoDate };
}

export interface MarketState {
  open: boolean;
  /** How long a quote may be served from the shared cache before one
   *  refresher may re-fetch. `null` when the market is closed: the last
   *  close IS the observation — no refresh is warranted. */
  ttlSeconds: number | null;
  /** Human-facing freshness suffix for the served label. */
  freshness: "live-delayed" | "close";
  /** The IST date string of the last session close (today when open, the
   *  most recent prior weekday when closed). */
  sessionDate: string;
}

/** Pure market-state computation for the NSE equity session. */
export function marketState(nowMs: number = Date.now()): MarketState {
  const ist = istParts(nowMs);
  const isWeekday = ist.weekday >= 1 && ist.weekday <= 5;
  const isHoliday = NSE_HOLIDAYS_IST.has(ist.isoDate);
  const tradingDay = isWeekday && !isHoliday;
  const withinSession =
    ist.minutesFromMidnight >= NSE_OPEN_MIN && ist.minutesFromMidnight < NSE_CLOSE_MIN;
  const open = tradingDay && withinSession;

  if (open) {
    return { open, ttlSeconds: 60, freshness: "live-delayed", sessionDate: ist.isoDate };
  }
  // Closed: walk back to the most recent trading day for the session label.
  const back = new Date(nowMs);
  for (let i = 0; i < 7; i += 1) {
    const p = istParts(back.getTime());
    const wd = p.weekday >= 1 && p.weekday <= 5;
    if (wd && !NSE_HOLIDAYS_IST.has(p.isoDate)) {
      // On a trading day BEFORE the open, the last session was the PRIOR
      // trading day; after the close, it is today.
      const beforeOpen = tradingDay && ist.minutesFromMidnight < NSE_OPEN_MIN;
      if (!(beforeOpen && p.isoDate === ist.isoDate)) {
        return { open, ttlSeconds: null, freshness: "close", sessionDate: p.isoDate };
      }
    }
    back.setTime(back.getTime() - 24 * 60 * 60 * 1000);
  }
  // Unreachable (7-day walk always finds a weekday) — kept total for types.
  return { open, ttlSeconds: null, freshness: "close", sessionDate: ist.isoDate };
}
