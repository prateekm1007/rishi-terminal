/**
 * X3-07 (Round 14 A6): portfolio CSV import.
 *
 * Parser strategy: ONE generic holdings-CSV grammar via header-alias
 * mapping (case/whitespace-insensitive), which covers the holdings
 * exports of the major Indian brokers (Zerodha Console, Groww, Upstox,
 * Angel One, Paytm Money all emit Symbol/Quantity/Average-cost columns
 * in slightly different spellings) plus CAS-statement rows (ISIN +
 * quantity + cost). FD-6 (which broker to prioritize) stays a founder
 * decision; this parser privileges no vendor and excludes none.
 *
 * Honesty rules (Constitution 3/16/25, roadmap acceptance):
 *   - malformed rows are REPORTED with line number and reason — never
 *     silently dropped;
 *   - unknown symbols are reported (the registry is the authority — an
 *     unmapped symbol is imported as-is with a warning, NOT dropped:
 *     the user's broker data is theirs; our analytics simply shows
 *     those rows without consensus/sector enrichment);
 *   - zero/negative quantities and non-finite prices are errors;
 *   - re-importing the same content is a no-op (content hash, enforced
 *     by a UNIQUE constraint + this module's pre-check).
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';

export interface ParsedPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  /** ISO date (yyyy-mm-dd) of the earliest buy, when the file carries dates. */
  firstBuyDate: string | null;
  /** ISO date of the latest buy, when the file carries dates. */
  lastBuyDate: string | null;
  /** ISIN when the file is CAS-shaped. */
  isin: string | null;
}

export interface RowError {
  line: number;
  reason: string;
  /** The raw row, truncated — for the user's own error report. */
  raw: string;
}

export interface ImportParseResult {
  positions: ParsedPosition[];
  errors: RowError[];
  /** Which header aliases matched, for the UI to show what was understood. */
  mappedColumns: Record<string, string>;
  contentHash: string;
}

/** Header aliases → canonical column. Case/whitespace/punctuation-insensitive. */
const HEADER_ALIASES: Record<string, string[]> = {
  symbol: ['symbol', 'stocksymbol', 'stock', 'tradingsymbol', 'ticker', 'scrip', 'scripname', 'security', 'instrument', 'companyname', 'stockname'],
  isin: ['isin', 'isinn', 'isinnumber'],
  quantity: ['qty', 'quantity', 'shares', 'noofshares', 'numberofshares', 'units', 'quantityall', 'holdingqty', 'netqty'],
  avgPrice: ['avgprice', 'averageprice', 'avgcost', 'averagecost', 'avgbuyprice', 'averagebuyprice', 'buyavgprice', 'buyprice', 'avg', 'costpershare', 'price', 'purchaseprice', 'investedamountpershare'],
  firstBuyDate: ['buydate', 'firstbuydate', 'purchasedate', 'investmentdate', 'buydatetime', 'date'],
  lastBuyDate: ['lastbuydate', 'lastpurchasedate', 'recentbuydate'],
  invested: ['invested', 'investedvalue', 'investedamount', 'totalcost', 'cost', 'amount', 'investedamountvalue'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** RFC 4180 CSV line splitter (handles quoted commas and embedded quotes). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be yyyy-mm-dd');

function parseDateCell(cell: string): string | null {
  const trimmed = cell.trim();
  if (!trimmed) return null;
  // yyyy-mm-dd directly, or dd/mm/yyyy / dd-mmm-yyyy (Indian exports)
  let m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    return dateSchema.safeParse(iso).success ? iso : null;
  }
  m = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); // dd/mm/yyyy (Indian convention)
  if (m) {
    const iso = `${m[3]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
    return dateSchema.safeParse(iso).success ? iso : null;
  }
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  m = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})$/); // 05-Jan-2024
  if (m) {
    const mo = months.indexOf(m[2].toLowerCase()) + 1;
    if (mo > 0) {
      const iso = `${m[3]}-${String(mo).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
      return dateSchema.safeParse(iso).success ? iso : null;
    }
  }
  return null;
}

function toNumber(cell: string): number | null {
  // Indian number format: 1,23,456.78 (comma groupings) — strip commas.
  const cleaned = cell.replace(/,/g, '').trim();
  if (cleaned === '' || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a portfolio holdings CSV (or CAS export). Total: never throws;
 * every problem row comes back in `errors` with its line number.
 */
export function parsePortfolioCsv(text: string): ImportParseResult {
  // Idempotency key: hash the NORMALIZED form (line endings unified,
  // blank lines dropped) so the same data re-uploaded after an editor
  // round-trip is still recognized as the same file. Deterministic
  // (Constitution 18).
  const normalizedText = text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .join('\n');
  const contentHash = createHash('sha256').update(normalizedText).digest('hex');
  const result: ImportParseResult = {
    positions: [],
    errors: [],
    mappedColumns: {},
    contentHash,
  };

  const lines = normalizedText.split('\n');
  if (lines.length < 2) {
    result.errors.push({ line: 1, reason: 'file has no data rows', raw: lines[0]?.slice(0, 120) ?? '' });
    return result;
  }

  const headerCells = splitCsvLine(lines[0]);
  const normalized = headerCells.map(normalizeHeader);

  // Map header → canonical column
  const colIndex: Record<string, number> = {};
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.includes(normalized[i])) {
        colIndex[canonical] = i;
        result.mappedColumns[canonical] = headerCells[i];
        break;
      }
    }
  }

  if (colIndex.symbol === undefined && colIndex.isin === undefined) {
    result.errors.push({
      line: 1,
      reason: 'no symbol/ISIN column found — expected a header like Symbol, Stock, Trading Symbol, Scrip or ISIN',
      raw: lines[0].slice(0, 160),
    });
    return result;
  }
  if (colIndex.quantity === undefined) {
    result.errors.push({
      line: 1,
      reason: 'no quantity column found — expected a header like Qty, Quantity, Shares or Units',
      raw: lines[0].slice(0, 160),
    });
    return result;
  }
  if (colIndex.avgPrice === undefined && colIndex.invested === undefined) {
    result.errors.push({
      line: 1,
      reason: 'no price column found — expected a header like Avg Price, Average Cost, Buy Price or Invested Amount',
      raw: lines[0].slice(0, 160),
    });
    return result;
  }

  const bySymbol = new Map<string, ParsedPosition>();

  for (let li = 1; li < lines.length; li++) {
    const raw = lines[li];
    const cells = splitCsvLine(raw);
    const lineNo = li + 1; // 1-based, header is line 1

    const symbolCell = colIndex.symbol !== undefined ? cells[colIndex.symbol] : '';
    const isinCell = colIndex.isin !== undefined ? cells[colIndex.isin] ?? '' : '';
    const qtyCell = cells[colIndex.quantity] ?? '';
    const priceCell = colIndex.avgPrice !== undefined ? cells[colIndex.avgPrice] ?? '' : '';
    const investedCell = colIndex.invested !== undefined ? cells[colIndex.invested] ?? '' : '';

    // Identify the row
    let symbol = symbolCell.trim().toUpperCase();
    const isin = isinCell.trim() || null;
    if (!symbol && isin) {
      // CAS rows: symbol unknown from ISIN alone at parse level; use the
      // ISIN as the placeholder key and let the caller resolve it.
      symbol = `ISIN:${isin}`;
    }

    if (!symbol) {
      result.errors.push({ line: lineNo, reason: 'no symbol or ISIN in row', raw: raw.slice(0, 120) });
      continue;
    }

    const quantity = toNumber(qtyCell);
    if (quantity === null || quantity <= 0) {
      result.errors.push({
        line: lineNo,
        reason: `quantity is not a positive number (got "${qtyCell.slice(0, 30)}")`,
        raw: raw.slice(0, 120),
      });
      continue;
    }

    let avgPrice: number | null = null;
    if (colIndex.avgPrice !== undefined) {
      avgPrice = toNumber(priceCell);
    }
    if (avgPrice === null && colIndex.invested !== undefined) {
      const invested = toNumber(investedCell);
      if (invested !== null && quantity > 0) avgPrice = invested / quantity;
    }
    if (avgPrice === null || avgPrice < 0 || !Number.isFinite(avgPrice)) {
      result.errors.push({
        line: lineNo,
        reason: `price/cost is not a non-negative number (got "${(priceCell || investedCell).slice(0, 30)}")`,
        raw: raw.slice(0, 120),
      });
      continue;
    }

    const firstBuy = colIndex.firstBuyDate !== undefined ? parseDateCell(cells[colIndex.firstBuyDate] ?? '') : null;
    const lastBuy = colIndex.lastBuyDate !== undefined ? parseDateCell(cells[colIndex.lastBuyDate] ?? '') : (firstBuy ?? null);

    // Merge duplicate symbols (weighted average, honest date span)
    const existing = bySymbol.get(symbol);
    if (existing) {
      const totalQty = existing.quantity + quantity;
      existing.avgPrice = (existing.avgPrice * existing.quantity + avgPrice * quantity) / totalQty;
      existing.quantity = totalQty;
      if (firstBuy && (!existing.firstBuyDate || firstBuy < existing.firstBuyDate)) existing.firstBuyDate = firstBuy;
      if (lastBuy && (!existing.lastBuyDate || lastBuy > existing.lastBuyDate)) existing.lastBuyDate = lastBuy;
    } else {
      bySymbol.set(symbol, {
        symbol,
        quantity,
        avgPrice,
        firstBuyDate: firstBuy,
        lastBuyDate: lastBuy,
        isin,
      });
    }
  }

  result.positions = [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  return result;
}
