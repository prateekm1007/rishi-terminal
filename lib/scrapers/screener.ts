// lib/scrapers/screener.ts
// Scrapes Screener.in for live Indian stock fundamentals
// No auth required for basic company page

const BASE = "https://www.screener.in/company";

const HEADERS = {
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
  const n = parseFloat(val.replace(/,/g, "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function extractRatioBlock(html: string): Record<string, number> {
  const result: Record<string, number> = {};
  // Match each li inside #top-ratios
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

function extractShareholding(html: string): {
  period: string; promoter: number; fii: number; dii: number; public: number;
}[] {
  const section = html.match(/<section id="shareholding"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = section.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  const result = [];

  for (const row of rows.slice(1, 9)) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map(c => c.replace(/<[^>]*>/g, "").trim());
    if (cells.length < 5 || !cells[0]) continue;
    result.push({
      period: cells[0],
      promoter: num(cells[1]),
      fii: num(cells[2]),
      dii: num(cells[3]),
      public: num(cells[4]),
    });
  }
  return result;
}

function extractQuarters(html: string): {
  period: string; revenue: number; netProfit: number; opm: number;
}[] {
  const section = html.match(/<section id="quarters"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const thead = section.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  const headers = (thead.match(/<th[^>]*>([\s\S]*?)<\/th>/g) ?? [])
    .map(h => h.replace(/<[^>]*>/g, "").trim());

  const tbody = section.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const allRows = tbody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];

  let salesRow: string[] = [];
  let netRow: string[] = [];
  let opmRow: string[] = [];

  for (const row of allRows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map(c => c.replace(/<[^>]*>/g, "").trim());
    if (!cells[0]) continue;
    if (cells[0].toLowerCase().includes("sales")) salesRow = cells;
    if (cells[0].toLowerCase().includes("net profit")) netRow = cells;
    if (cells[0].toLowerCase().includes("opm")) opmRow = cells;
  }

  const result = [];
  for (let i = 1; i < Math.min(headers.length, 9); i++) {
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

export async function fetchScreenerFundamentals(symbol: string): Promise<ScreenerFundamentals | null> {
  const html = await fetchPage(symbol);
  if (!html) return null;
  const r = extractRatioBlock(html);
  return {
    pe: r["Stock P/E"] ?? 0,
    bookValue: r["Book Value"] ?? 0,
    debtToEquity: r["Debt to Equity"] ?? 0,
    roe: r["Return on Equity"] ?? r["ROE"] ?? 0,
    roce: r["ROCE"] ?? 0,
    opm: r["OPM"] ?? 0,
    revCagr3y: r["Sales growth 3Years"] ?? r["Revenue Growth 3Yr"] ?? 0,
    epsCagr: r["Profit growth 3Years"] ?? r["EPS Growth"] ?? 0,
    promoterHolding: r["Promoter holding"] ?? 0,
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