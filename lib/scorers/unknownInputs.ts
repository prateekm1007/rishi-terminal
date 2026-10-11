import 'server-only';

/**
 * P0-2 (founder audit 2026-10-11): the shared insufficient-data comp
 * detail. The verdict CONTRACT itself lives in lib/scorers/verdictGuards
 * (the merged #337 implementation — one declaration, rule 14); Nemish's
 * X6-heritage comp-level details use this one wording helper.
 */
export function insuffDetail(what: string): string {
  return `insufficient data (seed placeholder — ${what} unknown, no verdict)`;
}
