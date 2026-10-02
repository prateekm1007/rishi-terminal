// lib/nse/fundamentals.ts
// Live fundamentals: NSE API (primary) + Yahoo Finance (fallback)
// NSE works server-side, no CORS issues in Next.js API routes
//
// Rule 16 (Coder Directions §9 sweep, 2026-10-02): every observation field
// is `number | null` — a field the upstream did not report is null, NEVER a
// sentinel 0. A fabricated 0 here was ADMITTED by the resolver's G5
// admissibility table (roe/opm/revcagr/bvps accept genuine zero as a real
// observation) and overrode the seed baseline with an invented value.

export interface LiveFundamentals {
  symbol: string;
  pe: number | null;
  eps: number | null;
  marketCap: number | null;
  roe: number | null;
  roce: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  faceValue: number;
  /** Provider observation time when disclosed, else null — never the fetch
   *  time (audit 2026-10-02 P0: `new Date().toISOString()` here fabricated
   *  provider provenance end-to-end). */
  lastUpdated: string | null;
}

// =============================================================================
// NSE India API (primary source - free, server-side only)
// =============================================================================

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

export async function fetchNSEFundamentals(symbol: string): Promise<Partial<LiveFundamentals> | null> {
  try {
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: NSE_HEADERS,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`[NSE] ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    
    // NSE response structure:
    // priceInfo: { lastPrice, change, pChange, totalTradedVolume, totalMarketCap }
    // info: { symbol, companyName, industry, isin }
    // metadata: { isin, industryInfo }
    // securityInfo: { faceValue, issuedSize }

    const priceInfo = data?.priceInfo || {};
    const info = data?.info || {};
    const securityInfo = data?.securityInfo || {};

    // NSE does not disclose P/E, EPS, book value, ROE, ROCE or dividend
    // yield in this response — null, never a sentinel 0 (Rule 16).
    // Calculate market cap: lastPrice * issuedSize (null unless both exist)
    const lastPrice = parseFloat(priceInfo?.lastPrice);
    const issuedSize = parseFloat(securityInfo?.issuedSize);
    const marketCap =
      Number.isFinite(lastPrice) && Number.isFinite(issuedSize) && lastPrice > 0 && issuedSize > 0
        ? lastPrice * issuedSize
        : null;
    const faceValueRaw = parseFloat(securityInfo?.faceValue);

    return {
      symbol,
      pe: null,
      eps: null,
      marketCap,
      bookValue: null,
      roe: null,
      roce: null,
      dividendYield: null,
      faceValue: Number.isFinite(faceValueRaw) && faceValueRaw > 0 ? faceValueRaw : 10,
      // NSE discloses no observation timestamp in this response — null.
      lastUpdated: null,
    };
  } catch (err) {
    console.error(`[NSE] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Yahoo Finance (fallback - provides P/E, ROE, etc)
// =============================================================================

export async function fetchYahooFundamentals(symbol: string): Promise<Partial<LiveFundamentals> | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=defaultKeyStatistics,financialData,summaryDetail`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`[Yahoo] ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const stats   = result.defaultKeyStatistics || {};
    const fin     = result.financialData || {};
    const summary = result.summaryDetail || {};

    // Rule 16: parse each field independently; a missing/garbage field is
    // null ("not reported"), never a fabricated 0. Negative ROE/EPS are
    // legitimate (loss-making) and survive as real observations.
    const numOrNull = (raw: unknown): number | null => {
      const v = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      return Number.isFinite(v) ? v : null;
    };
    const peStats = numOrNull(stats?.trailingPE?.raw);
    const peSummary = numOrNull(summary?.trailingPE?.raw);
    const pe = peStats ?? peSummary;
    const eps = numOrNull(stats?.trailingEps?.raw);
    const marketCap = numOrNull(stats?.marketCap?.raw);
    const bookValue = numOrNull(stats?.bookValue?.raw);
    const roeRaw = numOrNull(fin?.returnOnEquity?.raw);
    const roe = roeRaw === null ? null : roeRaw * 100;
    const dyRaw = numOrNull(summary?.dividendYield?.raw);
    const dividendYield = dyRaw === null ? null : dyRaw * 100;

    return {
      symbol,
      pe,
      eps,
      marketCap,
      bookValue,
      roe,
      roce: null, // not disclosed by these Yahoo modules
      dividendYield,
      faceValue: 10,
      // Yahoo's quoteSummary modules carry no fundamentals observation
      // time — null, never the fetch time (audit 2026-10-02 P0).
      lastUpdated: null,
    };
  } catch (err) {
    console.error(`[Yahoo] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Hybrid Strategy: NSE market cap + Yahoo fundamentals
// =============================================================================

export async function fetchLiveFundamentals(symbol: string): Promise<LiveFundamentals | null> {
  // Fetch both in parallel
  const [nse, yahoo] = await Promise.allSettled([
    fetchNSEFundamentals(symbol),
    fetchYahooFundamentals(symbol),
  ]);

  const nseData = nse.status === 'fulfilled' ? nse.value : null;
  const yahooData = yahoo.status === 'fulfilled' ? yahoo.value : null;

  // Prefer NSE market cap (more accurate), Yahoo for P/E, ROE
  if (yahooData || nseData) {
    return {
      symbol,
      pe:            yahooData?.pe ?? null,
      eps:           yahooData?.eps ?? null,
      marketCap:     nseData?.marketCap ?? yahooData?.marketCap ?? null,
      roe:           yahooData?.roe ?? null,
      roce:          null, // not disclosed by either upstream here
      bookValue:     yahooData?.bookValue ?? null,
      dividendYield: yahooData?.dividendYield ?? null,
      faceValue:     nseData?.faceValue ?? yahooData?.faceValue ?? 10,
      // Neither upstream in this merge discloses a fundamentals observation
      // time — null (audit 2026-10-02 P0).
      lastUpdated:   null,
    };
  }

  return null;
}

// =============================================================================
// Bulk Fetch (rate-limited)
// =============================================================================

export async function fetchBulkFundamentals(symbols: string[]): Promise<Record<string, LiveFundamentals>> {
  const results: Record<string, LiveFundamentals> = {};

  // 2 parallel at a time to respect NSE rate limits
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 2) {
    chunks.push(symbols.slice(i, i + 2));
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk.map(sym => fetchLiveFundamentals(sym)));
    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        results[chunk[idx]] = result.value;
      }
    });
    // 1 second between chunks
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}