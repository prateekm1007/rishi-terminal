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

// ── NSE India: /api/allIndices ───────────────────────────────────────
export const nseIndexSchema = z.object({
  indexSymbol: z.string(),
  last: z.number().optional(),
  variation: z.number().optional(),
  percentChange: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  open: z.number().optional(),
  previousClose: z.number().optional(),
  yearHigh: z.number().optional(),
  yearLow: z.number().optional(),
  pe: z.number().optional(),
  pb: z.number().optional(),
});

export const nseAllIndicesSchema = z.object({
  data: z.array(nseIndexSchema).optional(),
});

export type NseIndex = z.infer<typeof nseIndexSchema>;

// ── NSE India: /api/block-deal ───────────────────────────────────────
export const nseBlockDealSchema = z.object({
  symbol: z.string().optional(),
  series: z.string().optional(),
  totalTradedVolume: z.number().optional(),
  lastPrice: z.number().optional(),
  pchange: z.number().optional(),
  change: z.number().optional(),
  lastUpdateTime: z.string().optional(),
});

export const nseBlockDealsSchema = z.object({
  data: z.array(nseBlockDealSchema).optional(),
  timestamp: z.string().optional(),
});

export type NseBlockDeal = z.infer<typeof nseBlockDealSchema>;

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
