// lib/validation/schemas.ts
// T18: zod schemas at the TRUST BOUNDARIES — every external API response
// (Yahoo Finance, NSE India, Gemini) is parsed here before the app reads
// a single field. Anything that does not match the declared shape fails
// closed instead of poisoning the UI with undefined/NaN.
//
// Our OWN API responses (the /api/pulse/* family) get plain interfaces at
// the bottom — they are internal contracts, not untrusted input.
import { z } from 'zod';

// ── Yahoo Finance: /v8/finance/chart/<symbol> ────────────────────────
export const yahooChartMetaSchema = z.object({
  regularMarketPrice: z.number().optional(),
  chartPreviousClose: z.number().optional(),
  previousClose: z.number().optional(),
});

export const yahooChartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: yahooChartMetaSchema,
          timestamp: z.array(z.number()).optional(),
          indicators: z
            .object({
              quote: z
                .array(
                  z.object({
                    close: z.array(z.number().nullable()).optional(),
                    open: z.array(z.number().nullable()).optional(),
                    high: z.array(z.number().nullable()).optional(),
                    low: z.array(z.number().nullable()).optional(),
                    volume: z.array(z.number().nullable()).optional(),
                  }),
                )
                .optional(),
            }),
        }),
      )
      .optional(),
    error: z.unknown().optional(),
  }),
});

export type YahooChart = z.infer<typeof yahooChartSchema>;

// ── NSE numeric coercion ─────────────────────────────────────────────
// NSE schema drift (observed 2026-09-30): allIndices numerics arrive as
// strings (e.g. "24,405.55", sometimes ""), tripping z.number(). Coerce
// number | numeric-string | null → number | undefined. Indian digit
// grouping (commas) tolerated; empty/unparseable → undefined so optional
// fields stay optional and no NaN leaks into arithmetic (R4 per-field).
const nseNumeric = z
  .union([z.number(), z.string(), z.null()])
  .optional()
  .transform((v): number | undefined => {
    if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
    if (typeof v !== "string") return undefined;
    const s = v.trim().replace(/,/g, "");
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  });

// ── NSE India: /api/allIndices ───────────────────────────────────────
export const nseIndexSchema = z.object({
  indexSymbol: z.string(),
  last: nseNumeric,
  variation: nseNumeric,
  percentChange: nseNumeric,
  high: nseNumeric,
  low: nseNumeric,
  open: nseNumeric,
  previousClose: nseNumeric,
  yearHigh: nseNumeric,
  yearLow: nseNumeric,
  pe: nseNumeric,
  pb: nseNumeric,
});

export const nseAllIndicesSchema = z.object({
  data: z.array(nseIndexSchema).optional(),
});

export type NseIndex = z.infer<typeof nseIndexSchema>;

// ── NSE India: /api/block-deal ───────────────────────────────────────
export const nseBlockDealSchema = z.object({
  symbol: z.string().optional(),
  series: z.string().optional(),
  totalTradedVolume: nseNumeric,
  lastPrice: nseNumeric,
  pchange: nseNumeric,
  change: nseNumeric,
  lastUpdateTime: z.string().optional(),
});

export const nseBlockDealsSchema = z.object({
  data: z.array(nseBlockDealSchema).optional(),
  timestamp: z.string().optional(),
});

export type NseBlockDeal = z.infer<typeof nseBlockDealSchema>;

// ── NSE India: /api/live-analysis-variations?index=gainers|loosers ────
// LIVE-TODAY (founder order, 2026-10-13) + NSEPERM (2026-10-14): the
// market-movers endpoint the MIT-licensed unofficial scrapers
// (vsjha18/nsetools, marketcalls/openchart) document. NSEPERM corrected
// the contract to nsetools' ACTUAL parsing (src/nsetools/nse.py + urls.py,
// MIT — read as documentation, nothing vendored) after the round-56
// production attempt served the computed fallback:
//   - the ?index= param selects the DIRECTION, and the losers direction
//     is spelled 'loosers' (nsetools' TOP_LOSERS_URL constant; the
//     correctly-spelled 'losers' returns {"data":"Missing index or key."}
//     — captured from production egress 2026-10-13);
//   - the payload is legends-keyed: { legends: [[key, label], …],
//     <KEY>: { data: [rows…] } } with one row-list per index universe
//     (nsetools reads res.json()[index]['data'], index ∈ {NIFTY,
//     BANKNIFTY, NIFTYNEXT50, SecGtr20, SecLwr20, FNO, ALL});
//   - numeric fields arrive as STRINGS (nsetools ships a recursive
//     string→number caster) — nseNumeric already coerces those.
// The field spellings below accept BOTH the legacy shape (ltp /
// net_price / pChange / perChange / trade_quantity) and the modern API
// shape (lastPrice / change / pChange / totalTradedVolume). A mismatch
// fails the
// whole parse (fail closed, R4) and the warmer discloses the zod issue
// so the first production capture can correct the schema in one commit.
export const nseMoverRowSchema = z
  .object({
    symbol: z.string().min(1).max(24),
    ltp: nseNumeric,
    lastPrice: nseNumeric,
    netPrice: nseNumeric,
    net_price: nseNumeric,
    change: nseNumeric,
    pChange: nseNumeric,
    perChange: nseNumeric,
    totalTradedVolume: nseNumeric,
    trade_quantity: nseNumeric,
  })
  .passthrough();

/** One universe's row-list inside the legends-keyed movers payload. */
export const nseMoversUniverseSchema = z
  .object({
    data: z.array(nseMoverRowSchema),
    timestamp: z.string().optional(),
  })
  .passthrough();

/** The legends-keyed movers payload. Only the universes this app reads
 * are declared (preference order lives in lib/movers/nse.ts); the other
 * legend keys pass through unread. NSE's own error body for a bad
 * direction ({"data":"Missing index or key."}) parses to NO universes —
 * the honest miss with the head disclosed. */
export const nseMoversResponseSchema = z
  .object({
    legends: z.array(z.tuple([z.string(), z.string()])).optional(),
    timestamp: z.string().optional(),
    ALL: nseMoversUniverseSchema.optional(),
    NIFTY: nseMoversUniverseSchema.optional(),
  })
  .passthrough();

export type NseMoverRow = z.infer<typeof nseMoverRowSchema>;
export type NseMoversResponse = z.infer<typeof nseMoversResponseSchema>;

// ── NSE index constituents (TODAY-NIFTY, founder order 2026-10-14) ───
//
// The verdicts candidate set derives from NSE's own Nifty-50 constituent
// list — the index-browse endpoint the MIT scrapers document
// (marketcalls/openchart's quotes-by-index; the same licence covers it —
// the letter's scope is all nseindia.com/api/ quote and index endpoints):
//   GET /api/equity-stockIndices?index=NIFTY%2050
//     payload = { timestamp: "14-Oct-2026 12:10:30",
//                 data: [ { symbol: "NIFTY 50", priority: 1, … },
//                         { symbol: "RELIANCE", series: "EQ", … }, … ] }
// Only the SYMBOL is declared — the quote fields ride through unread
// (the constituent list is the product, not the quotes). The index row's
// own symbol ("NIFTY 50") carries a space and is dropped downstream BY
// THE SYMBOL SANITIZER, not by a name blacklist. NSE's error body for a
// bad index ({"data":"Missing index or key."}) fails the data-array
// requirement — the honest miss.
export const nseConstituentRowSchema = z
  .object({
    symbol: z.string().min(1).max(40),
  })
  .passthrough();

export const nseConstituentsResponseSchema = z
  .object({
    timestamp: z.string().optional(),
    data: z.array(nseConstituentRowSchema).min(1),
  })
  .passthrough();

export type NseConstituentsResponse = z.infer<typeof nseConstituentsResponseSchema>;

// ── Google Gemini: generateContent completion ────────────────────────
export const geminiCompletionSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export type GeminiCompletion = z.infer<typeof geminiCompletionSchema>;

// ── Our API contracts (internal, trusted shape declarations) ─────────
export interface BreadthSector {
  sector: string;
  last: number | undefined;
  change: number | undefined;
  changePct: number | undefined;
  high: number | undefined;
  low: number | undefined;
  open: number | undefined;
  prevClose: number | undefined;
  yearHigh: number | undefined;
  yearLow: number | undefined;
}

export interface BreadthResponse {
  nifty: {
    last: number | undefined;
    change: number | undefined;
    changePct: number | undefined;
    pe: number | undefined;
    pb: number | undefined;
  } | null;
  bankNifty: { last: number | undefined; change: number | undefined; changePct: number | undefined } | null;
  breadth: {
    advances: number;
    declines: number;
    unchanged: number;
    total: number;
    advanceDeclineRatio: number;
  };
  sectors: BreadthSector[];
  generatedAt: string;
}

export interface CurrencyQuote {
  pair: string;
  rate: number;
  change: number;
  changePct: number;
  trend: 'strengthening' | 'stable' | 'weakening';
  volatility: 'low' | 'medium' | 'high';
  signal: string;
  error?: boolean;
}

export interface CurrencyResponse {
  currencies: CurrencyQuote[];
  generatedAt: string;
}

export interface BlockDeal {
  time: string;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  change: number;
  changePct: number;
  side: 'BUY' | 'SELL';
  series: string;
}

export interface BlocksResponse {
  deals: BlockDeal[];
  count: number;
  timestamp: string;
  generatedAt: string;
}
