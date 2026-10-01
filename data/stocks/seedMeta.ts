// data/stocks/seedMeta.ts — PUBLIC seed-dataset metadata.
//
// N1 (round 3): the numeric seed dataset (data/stocks/index.ts, 944
// records) is server-only — it must never ship in a client bundle, and
// the constants below are the ONLY part client code may import (the
// banner needs them on every seed-derived surface). Keeping them in
// this tiny module lets `SeedDataBanner` stay a client component
// without dragging the dataset into the bundle.

export type SeedStatus = 'placeholder' | 'sourced';

export const SEED_STATUS: SeedStatus = 'placeholder';

/**
 * No capture date is provable for the placeholder dataset: the numbers
 * pre-date this repo's history and many are deliberately round
 * (RELIANCE 2500, 3MINDIA 28000, 360ONE 985), so claiming any
 * "as of <date>" would be a fabricated freshness claim (remediation
 * round 2, R1). Always null while SEED_STATUS === 'placeholder'.
 */
export const SEED_CAPTURED_AT: string | null = null;

export const SEED_DISCLAIMER =
  'Illustrative sample data \u2014 not current, not investment advice.';
