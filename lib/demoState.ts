/**
 * lib/demoState — the ONE source for the demo-readiness states that two
 * surfaces render (rule 14): the dashboard's Today panel and the
 * methodology page's tracking line.
 *
 * DEMO-2 (founder order, 2026-10-12): "Add 'tracking: not started' to
 * methodology." The S2-03/S2-04 forward-return calibration track had not
 * begun; TRACKING_STATUS states that. It is a LITERAL, not a computed
 * value — computing it would fabricate a state that does not exist
 * (rule 1: never state what you have not verified).
 *
 * TODAY-VERDICTS (founder order, 2026-10-14: "make sure the full today
 * panel is populated on dashboard"): the track's day-0 record now EXISTS
 * — the verdicts ledger (migration 036) records each produced verdict's
 * BASELINE price, and the first recorded baseline is the day the track
 * began. The STATE derives from the ledger (lib/verdicts/store —
 * readTrackingState, one source); the WORDING stays here (one owner).
 * The not-started literal remains the fallback when nothing is recorded
 * (and the fail-closed rendering when the read fails).
 */

import type { TrackingState } from "@/lib/verdicts/types";

export const TRACKING_STATUS = "not started" as const;

/** The honest forward-return tracking line, word-for-word (the state
 *  with nothing recorded — DEMO-2's original contract). */
export const trackingLine = (): string => `tracking: ${TRACKING_STATUS}`;

/**
 * TODAY-VERDICTS: the tracking line for a RECORDED track state. The
 * first recorded baseline date is the start (stated as the IST calendar
 * day it is); the baseline count is the day-0 record; the first
 * forward-return measurements become possible only after the next
 * session closes — stated, never promised as done.
 *
 * A null state (read failure / nothing recorded) keeps the not-started
 * literal — fail-closed (C2).
 */
export function trackingLineFor(state: TrackingState | null): string {
  if (!state || state.baselines === 0 || !state.startedOn) {
    return trackingLine();
  }
  return `tracking: started ${state.startedOn} — ${state.baselines} verdict baseline${state.baselines === 1 ? "" : "s"} recorded; forward returns measurable after the next session close`;
}

/** The bold status word the two surfaces render (data-tracking-status). */
export function trackingStatusFor(state: TrackingState | null): string {
  if (!state || state.baselines === 0 || !state.startedOn) {
    return TRACKING_STATUS;
  }
  return "started";
}
