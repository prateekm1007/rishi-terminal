import 'server-only';

/**
 * Round-46 P0-3 — THE SECTOR GATE (founder audit 2026-10-11: "banks must
 * not be scored on D/E/OPM/FCF/P-NCAV/current-ratio; Greenblatt must
 * refuse banks").
 *
 * Lender balance sheets make the corporate ratios structurally
 * inapplicable: deposits are not corporate debt (D/E), interest paid is
 * the cost of goods rather than an operating line (OPM), free cash flow
 * to the firm is not defined the same way (FCF), and current assets and
 * liabilities are the loan book itself — P/NCAV and the current ratio do
 * not value a bank. A framework whose verdict REQUIRES any of these
 * fields cannot honestly evaluate a lender row on ANY data quality:
 * inapplicability is structural, which is a stronger refusal than the
 * P0-2 "unknown" (a live observation cannot cure a metric that does not
 * exist for the sector).
 *
 * ONE declaration (rule 14): the closed sector vocabulary, the closed
 * inapplicable-field vocabulary, and the one intersection rule. The
 * scorers consume it through `sectorRefusal` (verdictGuards.ts — the
 * module that owns the refusal verdicts), so every framework verdict
 * flows through the gate and no surface can bypass it.
 *
 * Scope decision (logged in the PR): Banking + NBFC + Finance are the
 * lending family the founder's audit names (the "bank/NBFC gate");
 * Fintech rows are platform businesses whose corporate ratios can be
 * observed — they stay scorable until the sector-taxonomy item says
 * otherwise. Greenblatt refuses lenders ENTIRELY (lenderPolicy "refuse"
 * in SCORER_VERDICT_CONTRACT): the Magic Formula's earnings-yield and
 * return-on-capital tests presume a non-lender balance sheet even though
 * np/mktcap is computable.
 */

/** The closed lender-sector vocabulary (exact match, never substring). */
export const LENDER_SECTORS: readonly string[] = ["Banking", "NBFC", "Finance"];

/**
 * The closed inapplicable-field vocabulary — the Stock fields behind the
 * founder's list: de = D/E, opm = OPM, fcf = FCF, ca + tl = the fields
 * behind P/NCAV and the current ratio.
 */
export const LENDER_INAPPLICABLE_FIELDS: readonly string[] = ["de", "opm", "fcf", "ca", "tl"];

/** The founder's ratio vocabulary for the refusal insights (rule 1: the
 *  text names the ratio the founder named, with the raw field id kept
 *  machine-checkable alongside). */
export const FIELD_DISPLAY: Record<string, string> = {
  de: "D/E",
  opm: "OPM",
  fcf: "FCF",
  ca: "current assets",
  tl: "total liabilities",
};

/** "D/E, OPM (fields de, opm)" — display names + the raw ids. */
export function describeFields(fields: readonly string[]): {
  text: string;
  rawList: string;
  isAre: "is" | "are";
} {
  const text = fields.map((f) => FIELD_DISPLAY[f] ?? f).join(", ");
  return {
    text,
    rawList: fields.join(", "),
    isAre: fields.length > 1 ? "are" : "is",
  };
}

export function isLenderSector(sector: string): boolean {
  return LENDER_SECTORS.includes(sector);
}

/**
 * The P0-3 gate for ONE scorer's required-field list: which of the
 * fields do not exist for this stock's sector. Empty off the lender
 * vocabulary — the gate is a no-op for every non-lender row.
 */
export function inapplicableAmong(
  sector: string,
  fields: readonly string[],
): string[] {
  if (!isLenderSector(sector)) return [];
  return fields.filter((f) => LENDER_INAPPLICABLE_FIELDS.includes(f));
}
