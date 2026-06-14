// lib/scrapers/screener.ts
// Scrapes Screener.in for live Indian stock fundamentals
// No auth required for basic company page

const BASE = "https://www.screener.in/company";

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface ScreenerFundamentals {
  pe: number;
  bookValue: number;
  debtToEquity: number;
  roe: number;
  roce: number;
  opm: number;
  revCagr3y: number;
  epsCagr: number;
  promoterHolding: number;
  marketCap: number;
  fcf: number;
  roa: number;
}

function num(val: string | undefined | null): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

// ========== TOP-RATIOS: PE, Book Value, ROCE, ROE, Market Cap, Div Yield, Face Value ==========

function extractRatioBlock(html: string): Record<string, number> {
  const result: Record<string, number> = {};
  const section = html.match(/<ul id="top-ratios"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const items = section.match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? [];

  for (const item of items) {
    const name = item.match(/<span class="name">([\s\S]*?)<\/span>/)?.[1]?.trim();
    const value = item.match(/<span class="number"[^>]*>([\s\S]*?)<\/span>/)?.[1]
      ?.replace(/<[^>]*>/g, "").trim();
    if (name && value) {
      result[name] = num(value);
    }
  }
  return result;
}

// ========== PROFIT & LOSS → OPM (latest period) ==========

function extractOPM(html: string): number {
  // Find profit-loss section or search entire HTML for OPM % row
  const plSection = html.match(/<section id="profit-loss"[^>]*>([\s\S]*?)(?=<section id=|$)/)?.[1] ?? html;

  // Find all rows, locate the one with "OPM %" text
  const rows = plSection.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
  for (const row of rows) {
    if (row.includes("OPM %")) {
      // Extract all numeric <td> values
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [];
      // Last cell with a number that's not the label
      let last = 0;
      for (const cell of cells) {
        const text = cell.replace(/<[^>]*>/g, "").trim();
        const n = num(text);
        if (n > 0) last = n;
      }
      return last;
    }
  }
  return 0;
}

// ========== BALANCE SHEET → D/E = Borrowings / (Equity Capital + Reserves) ==========

function extractBalanceSheetDE(html: string): number {
  const bsSection = html.match(/<section id="balance-sheet"[^>]*>([\s\S]*?)(?=<section id=|$)/)?.[1] ?? html;

  let equityCapital = 0;
  let reserves = 0;
  let borrowings = 0;

  // Helper to get last numeric td from a row matching label
  function getLastValue(section: string, label: string): number {
    const rows = section.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    for (const row of rows) {
      if (row.includes(label)) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [];
        // Get all numeric values, take the last one
        const values: number[] = [];
        for (const cell of cells) {
          const text = cell.replace(/<[^>]*>/g, "").trim();
          const n = num(text);
          if (text && n > 0) values.push(n);
        }
        return values.length > 0 ? values[values.length - 1] : 0;
      }
    }
    return 0;
  }

  equityCapital = getLastValue(bsSection, "Equity Capital");
  reserves = getLastValue(bsSection, "Reserves");
  borrowings = getLastValue(bsSection, "Borrowings");

  const equity = equityCapital + reserves;
  if (equity <= 0) return 0;
  return Number((borrowings / equity).toFixed(2));
}

// ========== RANGES-TABLE → Revenue CAGR 3Y, EPS CAGR 3Y ==========

function extractCAGR(html: string): { revCagr3y: number; epsCagr3y: number } {
  let rev = 0;
  let eps = 0;

  // Find all ranges-tables
  const tables = html.match(/<table class="ranges-table"[^>]*>[\s\S]*?<\/table>/g) ?? [];

  for (const table of tables) {
    const isSales = table.includes("Compounded Sales Growth");
    const isProfit = table.includes("Compounded Profit Growth");
    if (!isSales && !isProfit) continue;

    // Extract all rows
    const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    for (const row of rows) {
      if (row.includes("3 Years:")) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [];
        // The second td has the value
        const valCell = cells.length >= 2 ? cells[1] : null;
        if (valCell) {
          const val = num(valCell.replace(/<[^>]*>/g, "").trim());
          if (isSales) rev = val;
          if (isProfit) eps = val;
        }
      }
    }
  }

  return { revCagr3y: rev, epsCagr3y: eps };
}

// ========== META DESCRIPTION → Promoter Holding ==========

function extractPromoterFromMeta(html: string): number {
  const meta = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1] ?? "";
  const match = meta.match(/Promoter Holding:\s*([\d.]+)%/);
  return match ? Number(match[1]) : 0;
}

// ========== SHAREHOLDING ==========

function extractShareholding(html: string): {
  period: string; promoter: number; fii: number; dii: number; public: number;
}[] {
  const section = html.match(/<section id="shareholding"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = section.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const result: { period: string; promoter: number; fii: number; dii: number; public: number }[] = [];

  // Extract headers (periods)
  const headRow = rows.find(r => r.includes("<th") && r.includes("<td"));
  const periods: string[] = [];
  if (headRow) {
    const headers = (headRow.match(/<th[^>]*>([^<]*)<\/th>/g) ?? [])
      .map((h: string) => h.replace(/<[^>]*>/g, "").trim())
      .filter((h: string) => h.length > 0);
    for (const h of headers) periods.push(h);
  }

  // Extract data rows (Promoters, FIIs, DIIs, Public)
  const promoters: number[] = [];
  const fiis: number[] = [];
  const diis: number[] = [];
  const publicH: number[] = [];

  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c: string) => {
        const t = c.replace(/<[^>]*>/g, "").trim();
        return t;
      })
      .filter((c: string) => c.length > 0);

    if (cells.length < 2) continue;

    if (text.includes("Promoters") && !text.includes("Foreign")) {
      for (let i = 1; i < cells.length; i++) promoters.push(num(cells[i]));
    } else if (text.includes("FII") || (text.includes("Foreign") && text.includes("Institution"))) {
      for (let i = 1; i < cells.length; i++) fiis.push(num(cells[i]));
    } else if (text.includes("DII") || (text.includes("Domestic") && text.includes("Institution"))) {
      for (let i = 1; i < cells.length; i++) diis.push(num(cells[i]));
    } else if (text.includes("Public") || text.includes("Retail")) {
      for (let i = 1; i < cells.length; i++) publicH.push(num(cells[i]));
    }
  }

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
  const headers = (thead.match(/<th[^>]*>([\s\S]*?)<\/th>/g) ?? [])
    .map((h: string) => h.replace(/<[^>]*>/g, "").trim())
    .filter((h: string) => h.length > 0);

  const tbody = section.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const allRows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];

  let salesRow: string[] = [];
  let netRow: string[] = [];
  let opmRow: string[] = [];

  for (const row of allRows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c: string) => c.replace(/<[^>]*>/g, "").trim());
    if (!cells[0]) continue;
    if (cells[0].toLowerCase().includes("sales")) salesRow = cells;
    if (cells[0].toLowerCase().includes("net profit")) netRow = cells;
    if (cells[0].toLowerCase().includes("opm")) opmRow = cells;
  }

  const result: { period: string; revenue: number; netProfit: number; opm: number }[] = [];
  for (let i = 1; i < Math.min(headers.length, salesRow.length, netRow.length, 13); i++) {
    const period = headers[i];
    if (!period) continue;
    result.push({
      period,
      revenue: num(salesRow[i]),
      netProfit: num(netRow[i]),
      opm: num(opmRow[i]),
    });
  }
  return result;
}

// ========== FETCH PAGE ==========

async function fetchPage(symbol: string, suffix = ""): Promise<string | null> {
  try {
    const url = `${BASE}/${encodeURIComponent(symbol)}/consolidated/${suffix}`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return res.text();

    // Try standalone if consolidated fails
    const url2 = `${BASE}/${encodeURIComponent(symbol)}/${suffix}`;
    const res2 = await fetch(url2, {
      headers: HEADERS,
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
  const promoter = extractPromoterFromMeta(html);

  return {
    pe: r["Stock P/E"] ?? 0,
    bookValue: r["Book Value"] ?? 0,
    debtToEquity: de,
    roe: r["Return on Equity"] ?? r["ROE"] ?? 0,
    roce: r["ROCE"] ?? 0,
    opm: opm > 0 ? opm : (r["OPM"] ?? 0),
    revCagr3y: revCagr3y > 0 ? revCagr3y : (r["Sales growth 3Years"] ?? r["Revenue Growth 3Yr"] ?? 0),
    epsCagr: epsCagr3y > 0 ? epsCagr3y : (r["Profit growth 3Years"] ?? r["EPS Growth"] ?? 0),
    promoterHolding: promoter > 0 ? promoter : (r["Promoter holding"] ?? 0),
    marketCap: r["Market Cap"] ?? 0,
    fcf: r["Free Cash Flow"] ?? 0,
    roa: r["Return on Assets"] ?? r["ROA"] ?? 0,
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