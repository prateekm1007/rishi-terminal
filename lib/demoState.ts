/**
 * lib/demoState — the ONE source for the demo-readiness states that two
 * surfaces render (rule 14): the dashboard's Today panel and the
 * methodology page's tracking line.
 *
 * DEMO-2 (founder order, 2026-10-12): "Add 'tracking: not started' to
 * methodology." The S2-03/S2-04 forward-return calibration track has not
 * begun; this constant retires when it does. It is a LITERAL, not a
 * computed value — computing it would fabricate a state that does not
 * exist (rule 1: never state what you have not verified).
 */

export const TRACKING_STATUS = "not started" as const;

/** The honest forward-return tracking line, word-for-word. */
export const trackingLine = (): string => `tracking: ${TRACKING_STATUS}`;
