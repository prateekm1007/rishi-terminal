import { NextRequest, NextResponse } from "next/server";
import { YAHOO_SPECIAL } from "@/lib/livePrice";
import { normalizeSymbolInput } from "@/lib/registry/validateInput";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';


type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";

const TF: Record<Timeframe, { yahooRange: string; yahooInterval: string; cgDays: string }> = {
  "1D":  { yahooRange: "1d",  yahooInterval: "5m",  cgDays: "1" },
  "1W":  { yahooRange: "5d",  yahooInterval: "15m", cgDays: "7" },
  "1M":  { yahooRange: "1mo", yahooInterval: "1d",  cgDays: "30" },
  "3M":  { yahooRange: "3mo", yahooInterval: "1d",  cgDays: "90" },
  "6M":  { yahooRange: "6mo", yahooInterval: "1d",  cgDays: "180" },
  "1Y":  { yahooRange: "1y",  yahooInterval: "1wk", cgDays: "365" },
  "3Y":  { yahooRange: "3y",  yahooInterval: "1wk", cgDays: "1095" },
  "5Y":  { yahooRange: "5y",  yahooInterval: "1wk", cgDays: "1825" },
  "MAX": { yahooRange: "max", yahooInterval: "1mo", cgDays: "max" },
};

// Minimal CoinGecko mapping (extend anytime)
const COINGECKO_IDS: Record<string, string> = {
  BTC:   "bitcoin",
  ETH:   "ethereum",
  SOL:   "solana",
  BNB:   "binancecoin",
  ADA:   "cardano",
  XRP:   "ripple",
  DOGE:  "dogecoin",
  POL: "polygon-ecosystem-token",
  DOT:   "polkadot",
  LINK:  "chainlink",
  UNI:   "uniswap",
  AAVE:  "aave",
  SKY:   "sky",
  SHIB:  "shiba-inu",
  AVAX:  "avalanche-2",
  ATOM:  "cosmos",
  LTC:   "litecoin",
  BCH:   "bitcoin-cash",
  XLM:   "stellar",
  ALGO:  "algorand",
  VET:   "vechain",
  FIL:   "filecoin",
  TRX:   "tron",
  ETC:   "ethereum-classic",
  XMR:   "monero",
  NEAR:  "near",
  FTM:   "fantom",
  SAND:  "the-sandbox",
  MANA:  "decentraland",
  CRO:   "crypto-com-chain",
};

function parseTf(input: string | null): Timeframe {
  const v = (input || "1M").toUpperCase();
  const ok = ["1D","1W","1M","3M","6M","1Y","3Y","5Y","MAX"] as const;
  return (ok as readonly string[]).includes(v) ? (v as Timeframe) : "1M";
}

function yahooTickerFromSymbol(symbolRaw: string): string {
  const symbol = symbolRaw.toUpperCase().trim();

  // Special mappings
  if (YAHOO_SPECIAL[symbol]) return YAHOO_SPECIAL[symbol];

  // Forex like USD/INR -> USDINR=X
  if (symbol.includes("/")) {
    const pair = symbol.replace("/", "");
    return `${pair}=X`;
  }

  // If already a Yahoo ticker format, leave it
  if (symbol.includes(".") || symbol.includes("=") || symbol.startsWith("^")) return symbol;

  // Default: assume NSE stock
  return `${symbol}.NS`;
}

async function fetchYahooSeries(ticker: string, tf: Timeframe) {
  const { yahooRange, yahooInterval } = TF[tf];
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=${encodeURIComponent(yahooRange)}&interval=${encodeURIComponent(yahooInterval)}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    // keep it snappy; upstream sometimes stalls
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp || [];
  const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close || [];

  const points = [];
  const n = Math.min(ts.length, closes.length);
  for (let i = 0; i < n; i++) {
    const v = closes[i];
    if (typeof v === "number" && Number.isFinite(v)) {
      points.push({ t: ts[i] * 1000, v });
    }
  }
  return points;
}

async function fetchCoinGeckoSeries(symbol: string, tf: Timeframe) {
  const id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) throw new Error(`Unsupported crypto symbol for CoinGecko: ${symbol}`);

  const days = TF[tf].cgDays;
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${encodeURIComponent(days)}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

  const json = await res.json();
  const prices: Array<[number, number]> = json?.prices || [];
  return prices
    .filter((p) => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number")
    .map((p) => ({ t: p[0], v: p[1] }));
}

export async function GET(req: NextRequest) {
  try {
    // R6 persistent per-IP rate limit (fails open).
    const rl = await checkRateLimit(`data:ip:${clientIp(req)}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const symbolRaw = (searchParams.get("symbol") || "").trim();
    const tf = parseTf(searchParams.get("tf"));

    // R5: registry/allow-list gate — this route forwards the symbol to
    // Yahoo; arbitrary strings are rejected before any upstream call.
    const symbol = normalizeSymbolInput(symbolRaw);
    if (!symbol) {
      return NextResponse.json({ error: `Unknown symbol: ${symbolRaw.slice(0, 20)}` }, { status: 400 });
    }

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    const upper = symbol.toUpperCase();
    let source: "yahoo" | "coingecko" = "yahoo";
    let points: Array<{ t: number; v: number }> = [];

    try {
      if (COINGECKO_IDS[upper]) {
        source = "coingecko";
        points = await fetchCoinGeckoSeries(upper, tf);
      } else {
        source = "yahoo";
        const ticker = yahooTickerFromSymbol(upper);
        points = await fetchYahooSeries(ticker, tf);
      }
    } catch (e) {
      // graceful fallback: empty points with an HONEST explanation —
      // Rule 10 (R9 §18): `warning: String(e)` rode upstream exception text
      // (vendor URLs, connection diagnostics) to the client on a 200 body.
      console.error(`[/api/history] ${source} series failed for ${upper}:`, e);
      return NextResponse.json(
        { symbol: upper, tf, source, points: [], warning: "upstream unavailable — no data returned" },
        { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }

    return NextResponse.json(
      { symbol: upper, tf, source, points },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (error) {
    // Rule 10 (R9 §18): generic outward, detailed inward — the previous body
    // leaked `detail: String(error)` (upstream exception text) to the client.
    console.error("[/api/history] fetch failed:", error);
    return NextResponse.json({ error: "History fetch failed" }, { status: 500 });
  }
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}
