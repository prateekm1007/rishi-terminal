export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchLivePrice } from "@/lib/livePrice";
import { validateSymbolInput, validateSymbolsInput } from "@/lib/registry/validateInput";
import { consumeIpBudget, clientIpFromHeaders } from '@/lib/ratelimit/persistent';

const DEFAULT_SYMBOLS = [
  "NIFTY50","SENSEX","BANK_NIFTY",
  "BTC","ETH","SOL","BNB",
  "GOLD","SILVER","WTI","BRENT",
  "USD/INR","EUR/INR","GBP/INR",
  "TCS","RELIANCE","INFY","WIPRO",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
  // R5: persistent per-IP rate limit (shared Postgres counter).
  const ip = clientIpFromHeaders(req.headers);
  if (!(await consumeIpBudget(ip, 'prices', 60)).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
    const sym = (searchParams.get("symbol") ?? "").trim();
    const syms = (searchParams.get("symbols") ?? "").trim();

    let list: string[] = DEFAULT_SYMBOLS;
    if (sym) {
      const one = validateSymbolInput(sym);
      if (!one.ok) return NextResponse.json({ error: one.reason }, { status: 400 });
      list = [one.symbol];
    } else if (syms) {
      const many = validateSymbolsInput(syms, { max: 50 });
      if (!many.ok) return NextResponse.json({ error: many.reason }, { status: 400 });
      list = many.symbols;
    }
    list = Array.from(new Set(list));

    const results = await Promise.allSettled(list.map(s => fetchLivePrice(s)));
    const prices: Record<string, { price: number; change: number; lastUpdated: string } | null> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) prices[list[i]] = r.value;
    });

    // If single symbol requested, return unwrapped object (not Record)
    if (sym && list.length === 1) {
      const singlePrice = prices[sym] ?? null;
      return NextResponse.json(singlePrice, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Multi-symbol: return Record
    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[/api/prices] error:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}