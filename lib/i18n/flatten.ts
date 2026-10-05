/** R4-06: flatten a nested messages catalog into dot-path keys.
 * Shared by scripts/i18nCoverage.ts and tests — one definition of
 * "key" (Constitution 14: one source of truth per concept). */
export function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else if (typeof v === 'string') {
      out[key] = v;
    }
    // Non-string leaves (numbers, booleans) are catalog bugs — the
    // coverage script treats their absence as "missing" because flatten
    // drops them; keep catalogs string-only.
  }
  return out;
}
