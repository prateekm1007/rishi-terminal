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
