export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchLivePrice } from "@/lib/livePrice";

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

    let list: string[] = DEFAULT_SYMBOLS;
    if (sym) list = [sym];
    else if (syms) list = syms.split(",").map(s => s.trim()).filter(Boolean);

    list = Array.from(new Set(list)).slice(0, 200);

    const results = await Promise.allSettled(list.map(s => fetchLivePrice(s)));
    const prices: Record<string, any> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) prices[list[i]] = r.value;
    });

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[/api/prices] error:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}