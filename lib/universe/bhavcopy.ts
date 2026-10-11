import 'server-only';

/**
 * P1-LIVE-UNIVERSE (round 47): the official NSE EOD bhavcopy — the
 * price leg of the free official route (the founder's recommendation).
 *
 *   https://archives.nseindia.com/content/historical/EQUITIES/<YYYY>/<MON>/cm<DD><MON><YYYY>bhav.csv
 *
 * Honesty rules this module obeys:
 *   - only EQ-series rows are observations for this product's prices;
 *     a symbol's BE row is excluded (the fixture pins the duplicate);
 *   - a requested symbol absent from the file is an honest miss (absent
 *     from the result), never a zero or a stale guess;
 *   - a structurally malformed file (wrong header, wrong field count)
 *     fails closed to null — never a partial file presented as EOD;
 *   - the file's own TIMESTAMP column is carried as the observation
 *     time, never the fetch time.
 */

export interface BhavcopyRow {
  symbol: string;
  series: 'EQ';
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
  /** The bhavcopy's own TIMESTAMP column (e.g. "11-OCT-2026"). */
  timestamp: string;
  isin: string;
}

/** The official bhavcopy column contract (cm*.bhav.csv). */
const REQUIRED_COLUMNS = [
  'SYMBOL',
  'SERIES',
  'OPEN',
  'HIGH',
  'LOW',
  'CLOSE',
  'PREVCLOSE',
  'TIMESTAMP',
  'ISIN',
] as const;

function splitCsvLine(line: string): string[] {
  // bhavcopy fields never contain quoted commas; plain split is the
  // honest parser (no guessing at quoting the format does not use)
  return line.split(',');
}

/**
 * Parse the official bhavcopy CSV for the requested symbols.
 * Pure function — fixture-tested. Returns null when the file is
 * structurally malformed; a requested-but-absent symbol is simply not
 * present in the result.
 */
export function parseBhavcopyCsv(
  csv: string,
  symbols: string[],
): Record<string, BhavcopyRow> | null {
  if (typeof csv !== 'string' || csv.length === 0) return null;

  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const colIndex = new Map(header.map((h, i) => [h, i]));
  for (const col of REQUIRED_COLUMNS) {
    if (!colIndex.has(col)) return null; // not a bhavcopy file
  }
  const idx = (col: string) => colIndex.get(col) as number;
  const fieldCount = header.length;

  const wanted = new Set(symbols.map((s) => s.toUpperCase()));
  const out: Record<string, BhavcopyRow> = {};

  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    if (fields.length !== fieldCount) return null; // malformed row -> the file is suspect, fail closed

    const symbol = fields[idx('SYMBOL')].trim();
    const series = fields[idx('SERIES')].trim();
    if (!wanted.has(symbol)) continue;
    if (series !== 'EQ') continue; // only the EQ series is this product's observation

    const num = (col: string): number | null => {
      const v = Number(fields[idx(col)].trim());
      return Number.isFinite(v) ? v : null;
    };
    const close = num('CLOSE');
    const prevClose = num('PREVCLOSE');
    const open = num('OPEN');
    const high = num('HIGH');
    const low = num('LOW');
    if (close === null || prevClose === null) return null; // a price row without prices is malformed

    out[symbol] = {
      symbol,
      series: 'EQ',
      open: open ?? 0,
      high: high ?? 0,
      low: low ?? 0,
      close,
      prevClose,
      timestamp: fields[idx('TIMESTAMP')].trim(),
      isin: fields[idx('ISIN')].trim(),
    };
  }
  return out;
}

/** The official bhavcopy URL for a session date (IST calendar). */
export function bhavcopyUrl(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = MON[date.getUTCMonth()];
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const yyyyStr = String(yyyy);
  return `https://archives.nseindia.com/content/historical/EQUITIES/${yyyyStr}/${mon}/cm${dd}${mon}${yyyyStr}bhav.csv`;
}
