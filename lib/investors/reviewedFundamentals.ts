/**
 * lib/investors/reviewedFundamentals.ts — the reviewed-data-file contract
 * for the /investors route (founder round-55 order, 13 Oct, words
 * verbatim: "Fundamentals come from a reviewed data file, with source,
 * page, date, checked-by and checked-on for every figure. No prices and
 * no valuation readings.").
 *
 * Constitution anchors:
 *  - C2/rule 9 (validate at every trust boundary): the data file is
 *    human-authored input — it parses through zod here, and anything that
 *    fails the parse is REFUSED with a typed error, never defaulted,
 *    never partially rendered (rule 16: null is a real value; a missing
 *    PROVENANCE field is not — it is a refused record).
 *  - C4/rule 4 (never fabricate): the price/valuation vocabulary is
 *    banned at the KEY level — a "price" or "peRatio" figure cannot even
 *    enter the dataset. The route shows fundamentals only.
 *  - C1 (verified truth only): every figure carries its six provenance
 *    fields; the shipped dataset is a TEST FIXTURE until the founder
 *    confirms the company list (#418 checkboxes) and the round-56
 *    filings-citation build lands.
 */

import { z } from "zod";

/** The route gate: dev and test only. Production carries no
 * INVESTORS_ROUTE_DEV env value, so the route 404s there — "nothing on
 * the public site changes" is structural (fail-closed, C2/rule 6). */
export function investorsRouteEnabled(): boolean {
  return process.env.INVESTORS_ROUTE_DEV === "1";
}

/** The banner's machine-readable marker — every screen renders it, and
 * the route test counts occurrences against the screen count. */
export const INVESTOR_BANNER_MARKER = "data-investor-banner";

/** The price/valuation vocabulary banned from figure KEYS (founder:
 * "No prices and no valuation readings"). The check is token-aware —
 * camelCase splits ("peRatio" -> pe + ratio) so compound keys cannot
 * smuggle a banned token past a word-boundary regex (the first draft's
 * `\bpe\b` missed "peRatio": the test caught it, RED before GREEN). */
const BANNED_KEY_SUBSTRINGS = [
  "price",
  "marketcap",
  "evtoebitda",
  "evebitda",
  "upside",
  "target",
  "fairvalue",
  "valuation",
  "verdict",
  "rating",
  "recommend",
];
const BANNED_KEY_TOKENS = new Set(["pe", "pb", "ps", "cap"]);

/** Split a figure key into lowercase tokens: camelCase boundaries,
 * underscores, hyphens and spaces all separate. */
function keyTokens(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\s-]+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean);
}

/** The ban verdict for one figure key: the joined form (substrings) and
 * the token form (exact tokens) are both checked. */
export function figureKeyBanned(key: string): string | null {
  const joined = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const sub of BANNED_KEY_SUBSTRINGS) {
    if (joined.includes(sub)) return `"${key}" (matched "${sub}")`;
  }
  for (const token of keyTokens(key)) {
    if (BANNED_KEY_TOKENS.has(token)) return `"${key}" (token "${token}")`;
  }
  return null;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO calendar date (YYYY-MM-DD)");

const figureSchema = z.object({
  /** The figure's value; null = not disclosed in the reviewed source
   * (rule 16) — the UI renders "—" and keeps the provenance. */
  value: z.number().nullable(),
  unit: z.string().min(1, "unit is required"),
  source: z.string().min(1, "source is required (the reviewed document)"),
  sourcePage: z.string().min(1, "sourcePage is required (where in the source)"),
  sourceDate: isoDate,
  checkedBy: z.string().min(1, "checkedBy is required (who verified the figure)"),
  checkedOn: isoDate,
});

const companySchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9&-]+$/, "symbol must be the NSE ticker form"),
  name: z.string().min(3),
  sector: z.string().min(3),
  fiscalYear: z.string().regex(/^FY\d{2}$/, "fiscalYear must be the FYxx form"),
  figures: z.record(z.string(), figureSchema).refine(
    (figs) => Object.keys(figs).length >= 1,
    "at least one figure per company",
  ),
});

export type ReviewedFigure = z.infer<typeof figureSchema>;
export type ReviewedCompany = z.infer<typeof companySchema>;

export type ReviewedFundamentalsParse =
  | { ok: true; companies: ReviewedCompany[] }
  | { ok: false; error: string };

/** Parse-and-refuse at the boundary: the reviewed data file (or any
 * replacement) enters the route ONLY through this function. A record
 * that fails the schema, or a figure key from the banned vocabulary,
 * refuses the WHOLE dataset with the offending symbol/key named — the
 * route then renders the honest refusal, never a partial page. */
export function parseReviewedFundamentals(input: unknown): ReviewedFundamentalsParse {
  let parsed: z.infer<typeof companySchema>[];
  try {
    parsed = z.array(companySchema).parse(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      const path = first ? first.path.join(".") : "?";
      return {
        ok: false,
        error: `reviewed-fundamentals refused: ${path ? path + ": " : ""}${first?.message ?? "schema mismatch"}`,
      };
    }
    return { ok: false, error: "reviewed-fundamentals refused: not an array of company records" };
  }

  // The price/valuation ban, at the key level (after the shape parse so
  // the error names the offending symbol + key precisely).
  for (const company of parsed) {
    for (const key of Object.keys(company.figures)) {
      const banned = figureKeyBanned(key);
      if (banned) {
        return {
          ok: false,
          error: `reviewed-fundamentals refused: ${company.symbol}.${key} — the investors route shows fundamentals only; price and valuation readings are banned (founder order 13 Oct): ${banned}`,
        };
      }
    }
  }

  return { ok: true, companies: parsed };
}
