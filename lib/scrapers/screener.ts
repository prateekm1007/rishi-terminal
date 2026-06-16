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
  pe: number;
  roe: number;
  roce: number;
  bookValue: number;
  fcf: number;
  roa: number;
  debtToEquity: number;
  opm: number;
  revCagr3y: number;
  epsCagr: number;
  promoterHolding: number;
  marketCap: number;
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

function extractOPM(html: string): number {
  const plSection = html.match(/<section id="profit-loss"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = plSection.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (text.toLowerCase().includes("opm")) {
      const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
        .map((c: string) => c.replace(/<[^>]*>/g, "").trim());
      if (cells.length >= 2) return num(cells[cells.length - 1]);
    }
  }
  return 0;
}

function extractBalanceSheetDE(html: string): number {
  const bsSection = html.match(/<section id="balance-sheet"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = bsSection.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (text.toLowerCase().includes("debt to equity") || text.toLowerCase().includes("debt equity")) {
      const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
        .map((c: string) => c.replace(/<[^>]*>/g, "").trim());
      if (cells.length >= 2) return num(cells[cells.length - 1]);
    }
  }
  return 0;
}

function extractCAGR(html: string): { revCagr3y: number; epsCagr3y: number } {
  const cagrSection = html.match(/<section id="analysis"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
  const rows = cagrSection.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  let revCagr3y = 0;
  let epsCagr3y = 0;
  for (const row of rows) {
    const text = row.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? [])
      .map((c: string) => c.replace(/<[^>]*>/g, "").trim());
    if (text.includes("Sales CAGR") || text.includes("Revenue CAGR")) {
      if (cells.length >= 2) revCagr3y = num(cells[1]);
    }
    if (text.includes("EPS CAGR")) {
      if (cells.length >= 2) epsCagr3y = num(cells[1]);
    }
  }
  return { revCagr3y, epsCagr3y };
}

function extractPromoterFromMeta(html: string): number {
  const metaMatch = html.match(/<meta name="description" content="([^"]+)"/);
  if (!metaMatch) return 0;
  const desc = metaMatch[1];
  const match = desc.match(/Promoter.*?(\d+(\.\d+)?)\s*%/i);
  return match ? parseFloat(match[1]) : 0;
}

function extractMarketCap(html: string): number {
  const rangeSection = html.match(/<div class="ranges-table"[^>]*>([\s\S]*?)<\/div>/)?.[0] ?? "";
  const match = rangeSection.match(/Market Cap[^<]*<span[^>]*>([\d,]+)/i);
  return match ? num(match[1]) : 0;
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
    roe: r["ROE"] ?? 0,
    roce: r["ROCE"] ?? 0,
    bookValue: r["Book Value"] ?? 0,
    fcf: 0, // TODO: Extract from cash flow statement
    roa: 0, // TODO: Calculate from ratios
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