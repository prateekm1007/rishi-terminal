// lib/portfolio/importCsv.ts
// X3-07 (Round 14): the CSV import pipeline — parse, validate, hash.
//
// FD-6 (which broker formats to support FIRST) is an OPEN founder decision,
// so this PR ships the two formats that need no vendor choice:
//   1. the CDSL/NSDL CAS statement's transaction section (the standard
//      consolidated statement every depository participant issues), and
//   2. a documented GENERIC broker format (one row per trade with the six
//      columns below, any column order, case-insensitive headers).
// Broker-specific quirks (Zerodha/Upstox/Groww exports) plug in as extra
// header maps against the SAME pipeline — flagged FOUNDER DECISION NEEDED.
//
// Contract (pinned by test/portfolio.import.test.ts):
//   - every row is accounted for: parsed transactions AND per-line errors
//     are both returned — a malformed row is NEVER silently dropped;
//   - the returned sourceHash (sha256 of the normalised content) makes
//     re-importing the same file a no-op at the API layer;
//   - the parser is pure: no DB, no clock (dates come from the file).

import { createHash } from "crypto";

export interface ParsedTx {
  tradeDate: string; // YYYY-MM-DD
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
}

export interface RowError {
  line: number; // 1-based line number IN THE FILE
  reason: string; // safe to surface to the user
  raw: string;
}

export interface ImportResult {
  transactions: ParsedTx[];
  errors: RowError[];
  sourceHash: string;
  totalRows: number;
}

const DATE_ALIASES = ["date", "trade date", "txn date", "transaction date", "trade_date"];
const SYMBOL_ALIASES = ["symbol", "scrip", "scrip name", "instrument", "stock", "security"];
const SIDE_ALIASES = ["side", "type", "transaction type", "buy/sell", "action"];
const QTY_ALIASES = ["quantity", "qty", "shares", "units"];
const PRICE_ALIASES = ["price", "avg price", "average price", "rate", "trade price", "purchase price", "price / nav", "price/nav"];

function findColumn(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.trim().toLowerCase() === alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** RFC-4180-ish CSV line splitter (handles quoted commas/doubled quotes). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseDateCell(raw: string): string | null {
  const s = raw.trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY (the CAS and most Indian broker exports)
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const month = Number(m);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function toSide(raw: string): "buy" | "sell" | null {
  const s = raw.trim().toLowerCase();
  if (["buy", "b", "purchase", "p"].includes(s)) return "buy";
  if (["sell", "s", "sale"].includes(s)) return "sell";
  return null;
}

function toNumber(raw: string): number | null {
  const s = raw.replace(/[,\s₹]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a CSV document. `format` selects the header mapping: the generic
 * trade format (default) or the CDSL CAS transaction section (detected
 * columns; the CAS mixes narrative lines — those are reported as skipped,
 * with their line numbers, never silently dropped).
 */
export function parsePortfolioCsv(csvText: string, format: "generic" | "cas" = "generic"): ImportResult {
  if (typeof csvText !== "string" || csvText.length === 0) {
    throw new Error("empty file");
  }
  if (csvText.length > 2_000_000) {
    throw new Error("file too large (2 MB limit)");
  }

  const lines = csvText.replace(/\r\n?/g, "\n").split("\n");
  const errors: RowError[] = [];
  const transactions: ParsedTx[] = [];

  let headerLine = -1;
  let headers: string[] = [];
  let colDate = -1, colSymbol = -1, colSide = -1, colQty = -1, colPrice = -1;

  if (format === "cas") {
    // CAS transaction rows begin with a ISIN-like "1207" series and carry
    // the columns the statement documents; the generic mapping still
    // applies once a header row is found (the CAS header line names them).
    for (let li = 0; li < Math.min(lines.length, 40); li++) {
      const cells = splitCsvLine(lines[li]).map(c => c.trim());
      const lower = cells.map(c => c.toLowerCase());
      const d = findColumn(lower, DATE_ALIASES);
      const q = findColumn(lower, QTY_ALIASES);
      const p = findColumn(lower, PRICE_ALIASES);
      if (d !== -1 && q !== -1 && p !== -1) {
        headerLine = li;
        headers = lower;
        colDate = d; colQty = q; colPrice = p;
        colSymbol = findColumn(lower, SYMBOL_ALIASES);
        colSide = findColumn(lower, SIDE_ALIASES);
        break;
      }
    }
  } else {
    headerLine = 0;
    headers = splitCsvLine(lines[0] ?? "").map(c => c.trim().toLowerCase());
    colDate = findColumn(headers, DATE_ALIASES);
    colSymbol = findColumn(headers, SYMBOL_ALIASES);
    colSide = findColumn(headers, SIDE_ALIASES);
    colQty = findColumn(headers, QTY_ALIASES);
    colPrice = findColumn(headers, PRICE_ALIASES);
  }

  if (headerLine === -1 || colDate === -1 || colQty === -1 || colPrice === -1 || colSymbol === -1) {
    throw new Error(
      "unrecognised format: need columns for date, symbol, quantity and price" +
      (format === "cas" ? " (CAS statement)" : ""),
    );
  }

  for (let li = headerLine + 1; li < lines.length; li++) {
    const line = lines[li];
    if (line.trim() === "") continue; // blank lines are not rows
    const cells = splitCsvLine(line);
    const fail = (reason: string) => errors.push({ line: li + 1, reason, raw: line.slice(0, 200) });

    const date = parseDateCell(cells[colDate] ?? "");
    if (!date) { fail(`bad date '${(cells[colDate] ?? "").trim()}'`); continue; }

    const symbol = (colSymbol >= 0 ? cells[colSymbol] : "").trim().toUpperCase();
    if (!symbol || symbol.length > 32 || !/^[A-Z0-9&.\-_ ]+$/.test(symbol)) {
      fail("bad symbol"); continue;
    }

    // CAS rows carry no side column: quantity sign IS the side
    let side: "buy" | "sell" | null = null;
    let qtyRaw: string;
    if (colSide >= 0) {
      side = toSide(cells[colSide] ?? "");
      qtyRaw = cells[colQty] ?? "";
    } else {
      // CAS rows carry no side column: the quantity's sign IS the side
      const qn = toNumber(cells[colQty] ?? "");
      if (qn === null) { fail("bad quantity"); continue; }
      side = qn < 0 ? "sell" : "buy";
      qtyRaw = cells[colQty] ?? "";
    }
    if (!side) { fail(`bad side '${(cells[colSide] ?? "").trim()}'`); continue; }

    const quantity = toNumber(qtyRaw);
    if (quantity === null || Math.abs(quantity) <= 0) { fail("bad quantity"); continue; }

    const price = toNumber(cells[colPrice] ?? "");
    if (price === null || price <= 0) { fail("bad price"); continue; }

    transactions.push({ tradeDate: date, symbol, side, quantity: Math.abs(quantity), price });
  }

  // Normalise + hash: whitespace-insensitive idempotency (the SAME file
  // re-exported by the broker with reordered blank lines hashes equal).
  const normalised = `${format}\n${transactions
    .map(t => `${t.tradeDate}|${t.symbol}|${t.side}|${t.quantity}|${t.price}`)
    .sort()
    .join("\n")}`;
  const sourceHash = createHash("sha256").update(normalised).digest("hex");

  return { transactions, errors, sourceHash, totalRows: transactions.length + errors.length };
}
