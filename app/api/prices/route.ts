export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchLivePrice } from "@/lib/livePrice";
import { normalizeSymbolInput, parseSymbolsList } from "@/lib/registry/validateInput";

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
    const sym = (searchParams.get("symbol") ?? "").trim();
    const syms = (searchParams.get("symbols") ?? "").trim();

    // R5: registry/allow-list gate — unauthenticated data proxy; arbitrary
    // symbols are rejected with 400 before any upstream call.
    let list: string[];
    if (sym) {
      const n = normalizeSymbolInput(sym);
      if (n === null) {
        return NextResponse.json({ error: `Unknown symbol: ${sym.slice(0, 20)}` }, { status: 400 });
      }
      list = [n];
    } else if (syms) {
      const parsed = parseSymbolsList(syms);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      list = parsed.symbols;
    } else {
      list = DEFAULT_SYMBOLS;
    }

    const results = await Promise.allSettled(list.map(s => fetchLivePrice(s)));
    const prices: Record<string, { price: number; change: number; lastUpdated: string }> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) prices[list[i]] = r.value;
    });

    // If single symbol requested, return unwrapped object (not Record)
    if (sym && list.length === 1) {
      const singlePrice = prices[list[0]] ?? null;
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