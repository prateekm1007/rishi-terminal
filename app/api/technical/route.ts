// app/api/technical/route.ts
import { NextRequest, NextResponse } from "next/server";
import { computeIndicators } from "@/lib/technical";

function cleanNumArray(arr: any): number[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((v) => typeof v === "number" && Number.isFinite(v));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolRaw = (searchParams.get("symbol") ?? "").trim();
  if (!symbolRaw) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  // Default mapping for Indian equities
  const yahooSymbol =
    symbolRaw.includes(".") || symbolRaw.startsWith("^") || symbolRaw.includes("=")
      ? symbolRaw
      : `${symbolRaw}.NS`;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo HTTP ${res.status}` }, { status: 502 });
    }

    const json: any = await res.json();
    const result = json?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];

    const closes = cleanNumArray(quote?.close);
    const highs = cleanNumArray(quote?.high);
    const lows = cleanNumArray(quote?.low);
    const volumes = cleanNumArray(quote?.volume);

    if (closes.length < 20 || highs.length < 20 || lows.length < 20) {
      return NextResponse.json({ error: "Insufficient OHLCV data" }, { status: 502 });
    }

    const indicators = computeIndicators(closes, highs, lows, volumes);

    return NextResponse.json(
      {
        symbol: symbolRaw,
        yahooSymbol,
        indicators,
        lastUpdated: new Date().toISOString(),
        points: closes.length,
        source: "yahoo",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to compute technicals" },
      { status: 500 }
    );
  }
}