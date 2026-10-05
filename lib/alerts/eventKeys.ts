// lib/alerts/eventKeys.ts (X3-08) — deterministic alert-event identity.
//
// The idempotency contract ("one alert per trigger event") is decided by
// the DATABASE (alerts_events UNIQUE (trigger_id, event_key) + INSERT ON
// CONFLICT DO NOTHING). This module only derives the key — deterministically
// (Constitution 18: no Date.now() in render paths; here the caller passes
// `now` explicitly) and honest about granularity:
//
//   key = kind:symbol:threshold:IST-date
//
// One alert per trigger per IST calendar day. A condition that stays true
// all week re-alerts at most once per day, and the per-user hourly rate
// limit (alerts_rate_limit) bounds the total — that belt-and-braces is the
// anti-spam shape the founder's acceptance implies.

/** IST calendar date (YYYY-MM-DD) for a UTC instant. */
export function istDate(now: Date): string {
  // IST is UTC+5:30 with no DST.
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function alertEventKey(args: {
  kind: string;
  symbol: string;
  threshold: number;
  now: Date;
}): string {
  const { kind, symbol, threshold, now } = args;
  return `${kind}:${symbol.toUpperCase()}:${threshold}:${istDate(now)}`;
}

/** The rate-limit hour bucket (UTC hour, e.g. '2026-10-05T09'). */
export function rateLimitBucket(now: Date): string {
  return now.toISOString().slice(0, 13);
}
