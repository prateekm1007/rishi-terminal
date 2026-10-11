// lib/featureFlags.ts — U4 (founder round 7): the ONE feature-flag source.
//
// RANKINGS_ENABLED gates the dashboard's ranked widgets (Top Buy Signals,
// Short Radar, Stock of the Day). Fail-closed (Rule 6): the flag is enabled
// ONLY by the exact string "true" — unset, "false", "1", "TRUE" all keep
// rankings off. Rationale: the widgets are seed-derived rankings; whether
// they are shown at all is a product/presentation decision (FD-22), and the
// failure mode of an ambiguous env value must be "off", never "on".
//
// No other module may read process.env.RANKINGS_ENABLED (Rule 14) — the
// source pin in test/rankingsFlag.test.ts enforces it.

/** Strict fail-closed read of the RANKINGS_ENABLED flag. */
export function rankingsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.RANKINGS_ENABLED === "true";
}

/**
 * FNO_ENABLED (R5-ADVICE-IDENTIFIERS, founder directive 2026-10-11:
 * "For the F&O strategy legs, escalate with a recommended default: hide
 * the route until the founder decides."). The recommended default is
 * RECORDED as the implemented state: the /fno routes refuse (fail-closed,
 * rule 6) while the founder decision is open — the flag flips ONLY in the
 * PR recording that decision (the lib/founderDecisions.ts discipline; a
 * flag here is the faster hand, same fail-closed direction). Same strict
 * contract as RANKINGS_ENABLED: enabled ONLY by the exact string "true".
 *
 * FOUNDER DECISION NEEDED: F&O strategy legs — the options/backtester
 * routes render strategy BUY/SELL legs (the user's own paper trades) and
 * the derivatives-data licence question (FD-2's SEBI positioning) is
 * open. Recommended default (implemented): hidden until decided.
 */
export function fnoEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.FNO_ENABLED === "true";
}
