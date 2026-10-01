/**
 * lib/db/securityMaster.ts — pure resolution logic over the security
 * master tables (roadmap D1-02).
 *
 * Deliberately free of imports (no server-only, no data/stocks): every
 * consumer — ingestion jobs (D1-04/D1-05), scripts, tests — feeds it the
 * symbol_history rows it needs and gets deterministic answers. The
 * database is the only source of truth for these rows; nothing here
 * caches or fabricates mappings.
 *
 * Semantics of symbol_history rows (see migration 012 + SOURCES.md):
 *  - valid_from/valid_to are exchange-validity dates where known;
 *    NULL means "unbounded" (no claim either way). Rows sourced from
 *    the seed dataset or registry aliases make no exchange-validity
 *    claim — their `source` column says where the mapping came from.
 *  - A symbol can be REUSED by a different security after the original
 *    delists. Resolution therefore prefers the row with the latest
 *    valid_from (the most recent claimant), ties broken in favour of
 *    the official-listing source.
 */

export interface SymbolHistoryRow {
  isin: string;
  exchange: string;
  symbol: string;
  valid_from: string | null; // ISO date (YYYY-MM-DD)
  valid_to: string | null; // ISO date (YYYY-MM-DD)
  source: string;
}

export interface SymbolResolution {
  isin: string;
  matchedSymbol: string;
  exchange: string;
  source: string;
}

export interface ResolveOptions {
  /** Restrict to one exchange (e.g. 'NSE'). Default: any. */
  exchange?: string;
  /** ISO date the resolution is point-in-time for. Default: "now" (unbounded). */
  asOf?: string;
}

/**
 * Resolve a symbol to an ISIN as known at `asOf`.
 * Returns null when no row covers the symbol at that date — callers
 * must treat that as "unknown", never guess (D1-02).
 */
export function resolveSymbolToIsin(
  rows: readonly SymbolHistoryRow[],
  symbol: string,
  opts: ResolveOptions = {},
): SymbolResolution | null {
  const asOf = opts.asOf ?? "9999-12-31";
  const candidates = rows.filter((r) => {
    if (r.symbol !== symbol) return false;
    if (opts.exchange !== undefined && r.exchange !== opts.exchange) return false;
    if (r.valid_from !== null && r.valid_from > asOf) return false;
    if (r.valid_to !== null && r.valid_to < asOf) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  const rank = (r: SymbolHistoryRow): [string, number] => [
    r.valid_from ?? "0000-01-01", // most recent claimant wins
    r.source.startsWith("nse:") ? 1 : 0, // official listing beats variants on ties
  ];
  candidates.sort((a, b) => {
    const [av, ao] = rank(a);
    const [bv, bo] = rank(b);
    if (av !== bv) return av < bv ? 1 : -1;
    return bo - ao;
  });
  const best = candidates[0];
  return { isin: best.isin, matchedSymbol: best.symbol, exchange: best.exchange, source: best.source };
}

export interface DuplicateActiveSymbol {
  exchange: string;
  symbol: string;
  isins: string[];
  sources: string[];
}

/**
 * Active (valid_to IS NULL) rows grouped by (exchange, symbol) that claim
 * DIFFERENT isins — i.e. two securities fighting over one live symbol.
 * The partial unique index on symbol_history makes these impossible to
 * insert; this function is the detection half used by validation and
 * tests (a check that cannot fail is theatre — Constitution art. 24).
 */
export function findDuplicateActiveSymbols(
  rows: readonly SymbolHistoryRow[],
): DuplicateActiveSymbol[] {
  const groups = new Map<string, SymbolHistoryRow[]>();
  for (const r of rows) {
    if (r.valid_to !== null) continue;
    const key = `${r.exchange}\u0000${r.symbol}`;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  const out: DuplicateActiveSymbol[] = [];
  for (const [key, g] of groups) {
    const isins = [...new Set(g.map((r) => r.isin))];
    if (isins.length > 1) {
      const [exchange, symbol] = key.split("\u0000");
      out.push({ exchange, symbol, isins, sources: g.map((r) => r.source) });
    }
  }
  return out.sort((a, b) => a.symbol.localeCompare(b.symbol));
}
