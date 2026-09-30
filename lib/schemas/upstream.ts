import { z } from 'zod';

/**
 * R4: zod schemas for EVERY external payload the app accepts (trust
 * boundaries). Upstream APIs are unofficial and change shape without
 * notice; nothing from them enters the app untyped anymore.
 *
 * Conventions:
 * - Schemas are LOOSE (unknown extra fields pass through) because these
 *   APIs return far more than we consume; we validate only what we use.
 * - Numeric fields use `coerce` + `.catch` so one malformed field degrades
 *   to a safe value instead of failing a whole response that is otherwise
 *   usable — matching the previous fail-soft behaviour, but typed.
 * - `parseUpstream` returns `null` on any mismatch; callers already treat
 *   null as "feed unavailable".
 */

const num = z.coerce.number();
const numCatch = (fallback = 0) => num.catch(fallback);

// ── Yahoo Finance (v8 chart / v7 quote) ────────────────────────────────
export const YahooChartMetaSchema = z.looseObject({
  regularMarketPrice: numCatch(NaN).optional(),
  previousClose: numCatch(NaN).optional(),
});

export const YahooChartSchema = z.looseObject({
  chart: z
    .looseObject({
      result: z
        .array(
          z.looseObject({
            meta: YahooChartMetaSchema,
            timestamp: z.array(z.number()).nullish(),
            indicators: z.looseObject({
              quote: z
                .array(
                  z.looseObject({
                    close: z.array(num.nullable()).nullish(),
                    high: z.array(num.nullable()).nullish(),
                    low: z.array(num.nullable()).nullish(),
                    open: z.array(num.nullable()).nullish(),
                    volume: z.array(num.nullable()).nullish(),
                  }),
                )
                .nullish(),
            }),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

export const YahooChartMetaFullSchema = z.looseObject({
  chart: z
    .looseObject({
      result: z
        .array(
          z.looseObject({
            meta: z.looseObject({
              regularMarketPrice: numCatch(NaN).optional(),
              previousClose: numCatch(NaN).optional(),
              chartPreviousClose: numCatch(NaN).optional(),
              regularMarketVolume: numCatch(NaN).optional(),
            }),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

export const YahooQuoteSchema = z.looseObject({
  quoteResponse: z
    .looseObject({
      result: z
        .array(
          z.looseObject({
            regularMarketPrice: numCatch(NaN).optional(),
            regularMarketChangePercent: numCatch(NaN).optional(),
            symbol: z.string().optional(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

// ── NSE India (unofficial JSON API) ────────────────────────────────────
export const NseIndexSchema = z.looseObject({
  indexSymbol: z.string().optional(),
  index: z.string().optional(),
  last: numCatch(NaN).optional(),
  percentChange: numCatch(NaN).optional(),
  variation: numCatch(NaN).optional(),
  open: numCatch(NaN).optional(),
  high: numCatch(NaN).optional(),
  low: numCatch(NaN).optional(),
  previousClose: numCatch(NaN).optional(),
  yearHigh: numCatch(NaN).optional(),
  yearLow: numCatch(NaN).optional(),
});

export const NseAllIndicesSchema = z.object({
  data: z.array(NseIndexSchema).catch([]),
});

export const NseBulkDealSchema = z.looseObject({
  symbol: z.string().optional(),
  clientName: z.string().optional(),
  totalTradedVolume: numCatch(0).nullish(),
  lastPrice: numCatch(0).nullish(),
  pchange: numCatch(0).nullish(),
  lastUpdateTime: z.string().optional(),
  transactionType: z.string().optional(),
  change: numCatch(0).nullish(),
  series: z.string().optional(),
});

export const NseBulkDealsSchema = z.looseObject({
  data: z.array(NseBulkDealSchema).catch([]),
});

export const NseQuoteSchema = z.looseObject({
  priceInfo: z
    .looseObject({
      lastPrice: numCatch(NaN).optional(),
      pChange: numCatch(NaN).optional(),
    })
    .nullish(),
  underlyingValue: numCatch(NaN).optional(),
});

// ── BSE ────────────────────────────────────────────────────────────────
export const BseScribHeaderSchema = z.looseObject({
  CurrRate: z.string().optional(),
  Ltp: z.string().optional(),
  PcntChange: z.string().optional(),
  Change: z.string().optional(),
});

// ── Finnhub ────────────────────────────────────────────────────────────
export const FinnhubQuoteSchema = z.looseObject({
  c: numCatch(NaN).optional(), // current price
  d: numCatch(NaN).optional(), // change
  dp: numCatch(NaN).optional(), // change percent
  h: numCatch(NaN).optional(), // day high
  l: numCatch(NaN).optional(), // day low
  o: numCatch(NaN).optional(), // open
  pc: numCatch(NaN).optional(), // previous close
  t: numCatch(0).optional(), // unix timestamp
});

// ── FMP ────────────────────────────────────────────────────────────────
export const FmpMetricsSchema = z.looseObject({
  peRatio: numCatch(NaN).nullish(),
  returnOnEquity: numCatch(NaN).nullish(),
  returnOnCapitalEmployed: numCatch(NaN).nullish(),
  operatingProfitMargin: numCatch(NaN).nullish(),
  debtToEquity: numCatch(NaN).nullish(),
  bookValuePerShare: numCatch(NaN).nullish(),
  marketCap: numCatch(NaN).nullish(),
});

// ── Yahoo quoteSummary (lib/nse/fundamentals) ──────────────────────────
const rawNum = z.looseObject({ raw: num.nullish() });

export const YahooQuoteSummarySchema = z.looseObject({
  quoteSummary: z
    .looseObject({
      result: z
        .array(
          z.looseObject({
            defaultKeyStatistics: z
              .looseObject({
                trailingPE: rawNum.nullish(),
                trailingEps: rawNum.nullish(),
                marketCap: rawNum.nullish(),
                bookValue: rawNum.nullish(),
              })
              .nullish(),
            financialData: z
              .looseObject({
                returnOnEquity: rawNum.nullish(),
                returnOnCapitalEmployed: rawNum.nullish(),
              })
              .nullish(),
            summaryDetail: z
              .looseObject({
                trailingPE: rawNum.nullish(),
                dividendYield: rawNum.nullish(),
              })
              .nullish(),
          }),
        )
        .nullish(),
    })
    .nullish(),
});

// ── OpenAI-compatible chat provider (Agnes etc.) ───────────────────────
export const OpenAIChatResponseSchema = z.looseObject({
  choices: z
    .array(
      z.looseObject({
        message: z
          .looseObject({
            content: z.string().nullish(),
          })
          .nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .min(1),
});

// ── Google Gemini ──────────────────────────────────────────────────────
export const GeminiResponseSchema = z.looseObject({
  candidates: z
    .array(
      z.looseObject({
        content: z
          .looseObject({
            parts: z
              .array(
                z.looseObject({
                  text: z.string().nullish(),
                }),
              )
              .nullish(),
          })
          .nullish(),
        finishReason: z.string().nullish(),
      }),
    )
    .min(1),
});

// ── helper ─────────────────────────────────────────────────────────────

/**
 * Parse an upstream payload; returns a typed value or null. Never throws —
 * an upstream shape change must degrade to "feed unavailable", not a 500.
 */
export function parseUpstream<S extends z.ZodType>(
  schema: S,
  data: unknown,
  label: string,
): z.infer<S> | null {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[upstream] ${label}: payload did not match schema — treating as unavailable`);
    return null;
  }
  return parsed.data;
}

/** Fetch + parse in one step for the common `res.json()` pattern. */
export async function fetchUpstream<S extends z.ZodType>(
  url: string,
  init: RequestInit,
  schema: S,
  label: string,
): Promise<z.infer<S> | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parseUpstream(schema, json, label);
  } catch {
    return null;
  }
}
