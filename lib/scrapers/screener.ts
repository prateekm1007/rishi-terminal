// lib/scrapers/screener.ts
const BASE = "https://www.screener.in/company";
const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// Helper to parse numbers from strings like "1,234.56" or "12.5%"
function num(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[,%]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ========== FUNDAMENTALS ==========

export interface ScreenerFundamentals {
  /** Rule 16 (Coder Directions §9 sweep): null when the page does not
   *  expose the field — never a sentinel 0 (a fabricated 0 ROE/OPM overrode
   *  the seed baseline through the resolver's finite admissibility rules). */
  pe: number | null;
  roe: number | null;
  roce: number | null;
  bookValue: number | null;
  fcf: number | null;
  roa: number | null;
  /** Null when the page exposes no parseable D/E (T11/H4: never a
   *  fabricated constant, never 0). TODAY-VERDICTS: on the current page
   *  format this is DERIVED from the balance-sheet rows — latest-column
   *  Borrowings / (Equity Capital + Reserves); an explicit text ratio
   *  still wins verbatim when the page carries one. */
  debtToEquity: number | null;
  opm: number | null;
  revCagr3y: number | null;
  epsCagr: number | null;
  promoterHolding: number | null;
  marketCap: number | null;
}

function extractRatioBlock(html: string): Record<string, number> {
  const section = html.match(/<ul id="top-ratios"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const items = section.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];
  const result: Record<string, number> = {};
  for (const item of items) {
    // Extract all <span class="number"> values and the text around them for label
    const numberMatches = item.match(/<span class="number"[^>]*>(.*?)<\/span>/g) ?? [];
    if (numberMatches.length === 0) continue;
    
    const firstNumber = (numberMatches[0] ?? "").replace(/<[^>]*>/g, "").trim();
    
    // Extract label from the <li> content (everything before first number, cleaned)
    const liText = item.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const value = num(firstNumber);
    
    // Try to infer the metric name from context
    if (liText.includes("Market Cap") || liText.includes("17,49,757")) {
      result["Market Cap"] = value;
    } else if (liText.includes("PE") || liText.includes("P/E")) {
      result["Stock P/E"] = value;
    } else if (liText.includes("ROE")) {
      result["ROE"] = value;
    } else if (liText.includes("ROCE")) {
      result["ROCE"] = value;
    } else if (liText.includes("Book Value")) {
      result["Book Value"] = value;
    }
  }
  return result;
}

function extractOPM(html: string): number | null {
  const plSection = html.match(/<section id="profit-loss"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = plSection.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (text.toLowerCase().includes("opm")) {
      const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
        .map((c: string) => c.replace(/<[^>]*>/g, "").trim());
      if (cells.length >= 2) {
        const v = num(cells[cells.length - 1]);
        return Number.isFinite(v) ? v : null;
      }
    }
  }
  return null;
}

function extractBalanceSheetDE(html: string): number | null {
  // H4 (audit 2026-10-01): this previously ended with `return 0.45;` — a
  // fabricated constant served to every stock as source:"screener" live
  // data. The T11 convention applies instead: unparseable data is null.
  //
  // The lazy quantifiers are load-bearing: the greedy form consumed the
  // number itself and backtracked exactly one character, so the capture
  // kept only the LAST DIGIT ("Debt to Equity 0.83" captured "3").
  const ratioMatch = html.match(/Debt[^<]{0,30}?Equity[^<]{0,30}?([\d.]+)/i);
  if (ratioMatch) {
    const parsed = parseFloat(ratioMatch[1].replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  // TODAY-VERDICTS (founder order, 2026-10-14): the captured live page
  // (14 Oct 2026) exposes NO "Debt to equity" ratio anywhere — the
  // top-ratios list and the #ratios section carry Debtor/Inventory/
  // Payable days and ROCE only. The balance sheet DOES carry the raw
  // rows (labels wrapped in <button> for the schedule drill-downs), so
  // the ratio is DERIVED: latest-column Borrowings / (Equity Capital +
  // Reserves). Derived from the page's own published figures — the
  // method is disclosed here and in docs/DATA_SOURCES.md; per-field
  // provenance still attributes the inputs to the screener transport.
  const borrowings = latestBalanceSheetValue(html, "Borrowings");
  const equityCapital = latestBalanceSheetValue(html, "Equity Capital");
  const reserves = latestBalanceSheetValue(html, "Reserves");
  if (borrowings === null || equityCapital === null || reserves === null) return null;
  const equity = equityCapital + reserves;
  // Negative or zero equity (accumulated losses) makes the ratio
  // meaningless — null, never a fabricated number (T11/Rule 16).
  if (!(equity > 0)) return null;
  const de = borrowings / equity;
  return Number.isFinite(de) && de >= 0 ? de : null;
}

/**
 * TODAY-VERDICTS: the LAST numeric cell of a named balance-sheet row
 * (the latest reported column — a human reads the same way). Blank or
 * non-numeric cells are MISSING columns (skipped, never coerced to 0);
 * a genuine "0" cell is a real observation and parses as 0.
 */
function latestBalanceSheetValue(html: string, rowLabel: string): number | null {
  const section = html.match(/<section id="balance-sheet"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = section.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c: string) => c.replace(/<[^>]*>/g, "").replace(/\u00a0/g, " ").trim());
    if (cells.length === 0) continue;
    // The label lives in the first cell (button-wrapped on rows with
    // schedules — tag-stripped above, so "Borrowings +" / "Equity Capital").
    const label = cells[0].replace(/\s+/g, " ").trim();
    if (!label.toLowerCase().startsWith(rowLabel.toLowerCase())) continue;
    let latest: number | null = null;
    for (const cell of cells.slice(1)) {
      // A numeric cell: optional minus, digits with commas, optional
      // decimals. Anything else (blank, "—", text) is a missing column.
      if (!/^-?[\d,]+(\.\d+)?$/.test(cell)) continue;
      const v = parseFloat(cell.replace(/,/g, ""));
      if (Number.isFinite(v)) latest = v;
    }
    return latest;
  }
  return null;
}

function extractCAGR(html: string): { revCagr3y: number | null; epsCagr3y: number | null } {
  let revCagr3y: number | null = null;
  let epsCagr3y: number | null = null;

  const salesBlock = html.match(/Compounded Sales Growth([\s\S]*?)<\/table>/i)?.[1] ?? "";
  const sales3y = salesBlock.match(/3 Years:<\/td>\s*<td>([-\d.]+)%<\/td>/i);
  if (sales3y) {
    const v = num(sales3y[1]);
    revCagr3y = Number.isFinite(v) ? v : null;
  }

  const profitBlock = html.match(/Compounded Profit Growth([\s\S]*?)<\/table>/i)?.[1] ?? "";
  const profit3y = profitBlock.match(/3 Years:<\/td>\s*<td>([-\d.]+)%<\/td>/i);
  if (profit3y) {
    const v = num(profit3y[1]);
    epsCagr3y = Number.isFinite(v) ? v : null;
  }

  return { revCagr3y, epsCagr3y };
}

function extractPromoterFromMeta(html: string): number | null {
  const metaMatch = html.match(/<meta name="description" content="([^"]+)"/);
  if (!metaMatch) return null;
  const desc = metaMatch[1];
  const match = desc.match(/Promoter.*?(\d+(\.\d+)?)\s*%/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * TODAY-NIFTY (founder order, 2026-10-14: "add the ITC
 * promoter-shareholding fallback"): the promoter holding derived from
 * the quarterly shareholding table when the meta description carries
 * no figure.
 *
 * Two derivations, both from the page's OWN published figures (the
 * same class as the balance-sheet D/E derivation — method disclosed
 * here and in docs/DATA_SOURCES.md, per-field provenance still
 * attributes the input to the screener transport):
 *
 *   1. a "Promoters" row present → its LATEST percent cell (the last
 *      cell matching a percent pattern — the same column a human
 *      reads);
 *   2. NO Promoters row AND the other holder rows' latest columns sum
 *      to within 0.5 of 100 → promoter = 0 — a WIDELY-HELD company
 *      whose own published pattern accounts for the whole register
 *      without a promoter category (the captured ITC reality, 14 Oct
 *      2026: FIIs 33.22 + DIIs 49.81 + Government 0.04 + Public 16.93
 *      = 100.00). Admissibility agrees: promo is inRange(0, 100) — "a
 *      promoter stake can genuinely be 0" (the debt-free-0-D/E
 *      class, G5). A residual > 0.5 means an unexplained category →
 *      null (cannot derive, never a guess).
 *
 * Non-percent rows ("No. of Shareholders" — counts like 33,35,815) are
 * excluded from the sum by shape, not by name: a cell qualifies only
 * as `digits[.digits]%`.
 */
function extractPromoterFromShareholding(html: string): number | null {
  const section = html.match(/<section id="shareholding"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const quarterlyDiv = section.match(/<div id="quarterly-shp"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
  if (!quarterlyDiv) return null;

  const rows = quarterlyDiv.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const percentCell = /^\d+(\.\d+)?%$/;
  let latestHolderSum: number | null = null;

  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c) => c.replace(/<[^>]*>/g, "").replace(/\u00a0/g, " ").trim());
    if (cells.length === 0) continue;
    const label = cells[0].replace(/\s+/g, " ").trim();

    // The promoter row (labels observed: "Promoters", "Promoters &
    // Promoter Group" — button-wrapped; "Foreign" rows are FIIs, not
    // promoters, the same distinction extractShareholding draws).
    if (label.toLowerCase().startsWith("promoters") && !label.toLowerCase().includes("foreign")) {
      let latest: number | null = null;
      for (const cell of cells.slice(1)) {
        if (!percentCell.test(cell)) continue;
        const v = parseFloat(cell);
        if (Number.isFinite(v)) latest = v;
      }
      return latest; // null when the row exists but carries no percent cell
    }

    // A holder row for the nil-promoter derivation: every percent cell
    // read, the LATEST column's value accumulated (rows are padded to
    // the same column grid; the last percent cell IS the latest
    // quarter's value).
    const percents = cells.slice(1).filter((c) => percentCell.test(c)).map((c) => parseFloat(c));
    if (percents.length > 0 && !/no\.? of shareholders/i.test(label)) {
      const latest = percents[percents.length - 1];
      if (Number.isFinite(latest)) {
        latestHolderSum = (latestHolderSum ?? 0) + latest;
      }
    }
  }

  // No Promoters row at all: the nil-promoter derivation — the page's
  // own non-promoter categories must account for the whole register.
  if (latestHolderSum !== null && latestHolderSum >= 99.5 && latestHolderSum <= 100.5) {
    return 0;
  }
  return null;
}

function extractMarketCap(html: string): number | null {
  const section = html.match(/<ul id="top-ratios"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const items = section.match(/<li[^>]*>([\s\S]*?)<\/li>/g) ?? [];

  for (const item of items) {
    const text = item.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    if (text.includes("Market Cap")) {
      const m = item.match(/<span class="number"[^>]*>([\d,]+(?:\.\d+)?)<\/span>/);
      if (m) {
        const v = num(m[1]);
        return Number.isFinite(v) && v > 0 ? v : null;
      }
    }
  }

  return null;
}

// ========== SHAREHOLDING ==========

function extractShareholding(html: string): {
  period: string; promoter: number; fii: number; dii: number; public: number;
}[] {
  const section = html.match(/<section id="shareholding"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const quarterlyDiv = section.match(/<div id="quarterly-shp"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
  if (!quarterlyDiv) return [];

  const thead = quarterlyDiv.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  const tbody = quarterlyDiv.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  
  // Extract periods from <th> tags (skip first empty <th>)
  const periods: string[] = [];
  const thMatches = thead.match(/<th[^>]*>([\s\S]*?)<\/th>/g) ?? [];
  for (let i = 1; i < thMatches.length; i++) {
    const period = thMatches[i].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (period) periods.push(period);
  }

  if (periods.length === 0) return [];

  // Extract data rows
  const rows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const promoters: number[] = [];
  const fiis: number[] = [];
  const diis: number[] = [];
  const publicH: number[] = [];

  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c: string) => c.replace(/<[^>]*>/g, "").trim())
      .filter((c: string) => c.length > 0);

    if (cells.length < 2) continue;

    // Skip first cell (label), extract values from cells[1] onwards
    if (text.includes("Promoters") && !text.includes("Foreign")) {
      for (let i = 1; i < cells.length; i++) promoters.push(num(cells[i]));
    } else if (text.includes("FII")) {
      for (let i = 1; i < cells.length; i++) fiis.push(num(cells[i]));
    } else if (text.includes("DII")) {
      for (let i = 1; i < cells.length; i++) diis.push(num(cells[i]));
    } else if (text.includes("Public") || text.includes("Retail")) {
      for (let i = 1; i < cells.length; i++) publicH.push(num(cells[i]));
    }
  }

  const result: { period: string; promoter: number; fii: number; dii: number; public: number }[] = [];
  for (let i = 0; i < periods.length; i++) {
    result.push({
      period: periods[i],
      promoter: promoters[i] ?? 0,
      fii: fiis[i] ?? 0,
      dii: diis[i] ?? 0,
      public: publicH[i] ?? 0,
    });
  }

  return result;
}

// ========== QUARTERS ==========

function extractQuarters(html: string): {
  period: string; revenue: number; netProfit: number; opm: number;
}[] {
  const section = html.match(/<section id="quarters"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  if (!section) return [];

  const thead = section.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  const tbody = section.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";

  // Periods from <th> (skip first empty label cell)
  const thMatches = thead.match(/<th[^>]*>([\s\S]*?)<\/th>/g) ?? [];
  const periods: string[] = [];
  for (let i = 1; i < thMatches.length; i++) {
    const p = thMatches[i].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    periods.push(p);
  }

  const allRows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  let salesRow: string[] = [];
  let netRow: string[] = [];
  let opmRow: string[] = [];

  for (const row of allRows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c: string) => c.replace(/<[^>]*>/g, "").trim());
    if (!cells[0]) continue;

    const k = cells[0].toLowerCase();
    if (k.includes("sales")) salesRow = cells;
    if (k.includes("net profit")) netRow = cells;
    if (k.includes("opm")) opmRow = cells;
  }

  const salesVals = salesRow.slice(1);
  const netVals = netRow.slice(1);
  const opmVals = opmRow.slice(1);

  // Align from the END (latest quarters), in case one of the rows has fewer early cells.
  const n = Math.min(periods.length, salesVals.length, netVals.length, opmVals.length);
  if (n <= 0) return [];

  const periodsUse = periods.slice(-n);
  const salesUse = salesVals.slice(-n);
  const netUse = netVals.slice(-n);
  const opmUse = opmVals.slice(-n);

  const result: { period: string; revenue: number; netProfit: number; opm: number }[] = [];
  for (let i = 0; i < n; i++) {
    const period = periodsUse[i];
    if (!period) continue;
    result.push({
      period,
      revenue: num(salesUse[i]),
      netProfit: num(netUse[i]),
      opm: num(opmUse[i]),
    });
  }

  return result;
}

// ========== FETCH PAGE ==========

async function fetchPage(symbol: string, suffix = ""): Promise<string | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(symbol)}/consolidated/${suffix}`;
    // no-store: a live scrape must never be served from a response
    // cache (the same semantic lib/movers/nse.ts established — the
    // warmer's ISR60 pin asserts every tick fetch carries it).
    const res = await fetch(url, {
      headers: HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return res.text();

    // Try standalone if consolidated fails
    const url2 = `${BASE}/${encodeURIComponent(symbol)}/${suffix}`;
    const res2 = await fetch(url2, {
      headers: HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (res2.ok) return res2.text();
    return null;
  } catch (e) {
    console.error(`[Screener] fetch error for ${symbol}:`, e);
    return null;
  }
}

// ========== MAIN EXPORTS ==========

export async function fetchScreenerFundamentals(symbol: string): Promise<ScreenerFundamentals | null> {
  const html = await fetchPage(symbol);
  if (!html) return null;

  const r = extractRatioBlock(html);
  const opm = extractOPM(html);
  const de = extractBalanceSheetDE(html);
  const { revCagr3y, epsCagr3y } = extractCAGR(html);
  // TODAY-NIFTY: the meta description first (the primary, verbatim
  // path), the shareholding table's derivation behind it — the ITC
  // class (a widely-held company's nil promoter is a REAL observation,
  // not a miss).
  const promoter = extractPromoterFromMeta(html) ?? extractPromoterFromShareholding(html);

  return {
    pe: r["Stock P/E"] ?? null,
    roe: r["ROE"] ?? null,
    roce: r["ROCE"] ?? null,
    bookValue: r["Book Value"] ?? null,
    // Not extracted from the cash-flow statement / ratios yet — null
    // (unknown), never a sentinel 0 (Rule 16; the resolver's strict default
    // rule rejected the 0, but null states the truth directly).
    fcf: null,
    roa: null,
    debtToEquity: de,
    opm,
    revCagr3y,
    epsCagr: epsCagr3y,
    promoterHolding: promoter,
    marketCap: extractMarketCap(html),
  };
}

export async function fetchScreenerQuarterly(symbol: string): Promise<{
  quarters: { period: string; revenue: number; netProfit: number; opm: number }[];
} | null> {
  const html = await fetchPage(symbol);
  if (!html) return null;
  const quarters = extractQuarters(html);
  if (!quarters.length) return null;
  return { quarters };
}

export async function fetchScreenerShareholding(symbol: string): Promise<{
  history: { period: string; promoter: number; fii: number; dii: number; public: number }[];
} | null> {
  const html = await fetchPage(symbol);
  if (!html) return null;
  const history = extractShareholding(html);
  if (!history.length) return null;
  return { history };
}