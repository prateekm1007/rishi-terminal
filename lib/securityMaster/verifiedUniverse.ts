/**
 * Investor universe verification (14 October deliverable).
 *
 * Pure classifier: no I/O. Each product symbol is classified against the
 * official NSE equity list and, only when the official list has no entry
 * for the symbol, against the symbol history via the D1-02 resolver
 * (lib/db/securityMaster.ts). A rename is only ever linked through an ISIN.
 *
 * Status meanings (only VERIFIED_* is claimable on an investor surface):
 *   VERIFIED_EQ            symbol is in the official list, series EQ
 *   VERIFIED_OTHER_SERIES  symbol is in the official list, another series
 *   CONFIRMED_RENAME       ISIN links to an official symbol via an nse: source
 *   CANDIDATE_RENAME       ISIN links to an official symbol via a non-official
 *                          (seed or placeholder) source; not claimable
 *   UNMATCHED              no official symbol and no ISIN link; not claimable
 */
import { resolveSymbolToIsin, type SymbolHistoryRow } from "../db/securityMaster";

export type UniverseStatus =
  | "VERIFIED_EQ"
  | "VERIFIED_OTHER_SERIES"
  | "CONFIRMED_RENAME"
  | "CANDIDATE_RENAME"
  | "UNMATCHED";

export interface OfficialListingRow {
  symbol: string;
  name: string;
  series: string;
  listingDate: string;
  isin: string;
}

export interface ProductSymbol {
  symbol: string;
  name: string;
}

export interface UniverseRow {
  productSymbol: string;
  productName: string;
  status: UniverseStatus;
  officialSymbol: string | null;
  officialName: string | null;
  series: string | null;
  isin: string | null;
  listingDate: string | null;
  evidenceSource: string | null;
  reason: string;
}

export interface ClassifyInput {
  products: readonly ProductSymbol[];
  official: readonly OfficialListingRow[];
  history: readonly SymbolHistoryRow[];
}

export interface ClassifyOptions {
  /** Provenance label written into evidenceSource for direct official matches. */
  officialSource?: string;
}

const UNMATCHED_REASON = "no official symbol and no ISIN link in symbol history";

export function classifyUniverse(
  input: ClassifyInput,
  opts: ClassifyOptions = {},
): UniverseRow[] {
  const officialSource = opts.officialSource ?? "nse:equity_l";
  const bySymbol = new Map(input.official.map((o) => [o.symbol, o] as const));
  const byIsin = new Map(input.official.map((o) => [o.isin, o] as const));

  const rows: UniverseRow[] = input.products.map((p): UniverseRow => {
    const direct = bySymbol.get(p.symbol);
    if (direct) {
      return {
        productSymbol: p.symbol,
        productName: p.name,
        status: direct.series === "EQ" ? "VERIFIED_EQ" : "VERIFIED_OTHER_SERIES",
        officialSymbol: direct.symbol,
        officialName: direct.name,
        series: direct.series,
        isin: direct.isin,
        listingDate: direct.listingDate,
        evidenceSource: officialSource,
        reason: `symbol matches official list (series ${direct.series})`,
      };
    }
    const resolution = resolveSymbolToIsin(input.history, p.symbol);
    const linked = resolution ? byIsin.get(resolution.isin) : undefined;
    if (resolution && linked) {
      const confirmed = resolution.source.startsWith("nse:");
      return {
        productSymbol: p.symbol,
        productName: p.name,
        status: confirmed ? "CONFIRMED_RENAME" : "CANDIDATE_RENAME",
        officialSymbol: linked.symbol,
        officialName: linked.name,
        series: linked.series,
        isin: linked.isin,
        listingDate: linked.listingDate,
        evidenceSource: resolution.source,
        reason: `ISIN ${resolution.isin} links to official symbol ${linked.symbol} (source ${resolution.source})`,
      };
    }
    return {
      productSymbol: p.symbol,
      productName: p.name,
      status: "UNMATCHED",
      officialSymbol: null,
      officialName: null,
      series: null,
      isin: null,
      listingDate: null,
      evidenceSource: null,
      reason: UNMATCHED_REASON,
    };
  });

  // Two product symbols that resolve to one ISIN cannot both be right.
  const isinUse = new Map<string, number>();
  for (const r of rows) if (r.isin) isinUse.set(r.isin, (isinUse.get(r.isin) ?? 0) + 1);
  for (const r of rows) {
    if (r.isin && (isinUse.get(r.isin) ?? 0) > 1) {
      r.reason += `; duplicate ISIN shared with another product symbol`;
    }
  }
  return rows;
}
