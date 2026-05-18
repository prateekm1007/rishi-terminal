import { NextRequest, NextResponse } from "next/server";
import { STOCKS } from "@/data/stocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Category = "stock" | "crypto" | "commodity" | "forex" | "bond";

type SearchResult = {
  symbol: string;
  name: string;
  category: Category;
  url: string;
  sector?: string;
};

const CRYPTOS: Array<{ symbol: string; name: string }> = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "SHIB", name: "Shiba Inu" },
];

const COMMODITIES: Array<{ symbol: string; name: string }> = [
  { symbol: "GOLD", name: "Gold" },
  { symbol: "SILVER", name: "Silver" },
  { symbol: "CRUDEOIL", name: "Crude Oil" },
  { symbol: "NATURALGAS", name: "Natural Gas" },
  { symbol: "COPPER", name: "Copper" },
  { symbol: "ALUMINIUM", name: "Aluminium" },
  { symbol: "ZINC", name: "Zinc" },
  { symbol: "NICKEL", name: "Nickel" },
  { symbol: "LEAD", name: "Lead" },
  { symbol: "BRENTCRUDE", name: "Brent Crude" },
  { symbol: "PLATINUM", name: "Platinum" },
];

const FOREX: Array<{ symbol: string; name: string; urlPair: string }> = [
  { symbol: "EURUSD", name: "EUR / USD", urlPair: "EURUSD" },
  { symbol: "GBPUSD", name: "GBP / USD", urlPair: "GBPUSD" },
  { symbol: "JPYUSD", name: "JPY / USD", urlPair: "JPYUSD" },
  { symbol: "USDINR", name: "USD / INR", urlPair: "USDINR" },
  { symbol: "AUDUSD", name: "AUD / USD", urlPair: "AUDUSD" },
];

function matchScore(sym: string, name: string, q: string) {
  const S = sym.toUpperCase();
  const N = name.toUpperCase();
  if (S === q) return 0;
  if (S.startsWith(q)) return 1;
  if (N.includes(q)) return 2;
  return 9;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = (searchParams.get("q") ?? "").trim();
    if (!rawQ) {
      return NextResponse.json(
        { results: [] as SearchResult[] },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const q = rawQ.toUpperCase();
    const limit = Math.min(Number(searchParams.get("limit") ?? "8") || 8, 15);

    const results: SearchResult[] = [];

    // Stocks first
    for (const s of Object.values(STOCKS)) {
      if (results.length >= limit) break;
      const sym = (s.symbol || "").toUpperCase();
      const name = s.name || "";
      const score = matchScore(sym, name, q);
      if (score !== 9) {
        results.push({
          symbol: s.symbol,
          name: s.name,
          category: "stock",
          url: `/stock/${s.symbol}`,
          sector: s.sector,
        });
      }
    }

    // Crypto
    for (const c of CRYPTOS) {
      if (results.length >= limit) break;
      const score = matchScore(c.symbol, c.name, q);
      if (score !== 9) {
        results.push({
          symbol: c.symbol,
          name: c.name,
          category: "crypto",
          url: `/crypto/${c.symbol}`,
        });
      }
    }

    // Commodities
    for (const c of COMMODITIES) {
      if (results.length >= limit) break;
      const score = matchScore(c.symbol, c.name, q);
      if (score !== 9) {
        results.push({
          symbol: c.symbol,
          name: c.name,
          category: "commodity",
          url: `/commodities/${c.symbol}`,
        });
      }
    }

    // Forex
    for (const f of FOREX) {
      if (results.length >= limit) break;
      const score = matchScore(f.symbol, f.name, q);
      if (score !== 9) {
        results.push({
          symbol: f.symbol,
          name: f.name,
          category: "forex",
          url: `/forex/${f.urlPair}`,
        });
      }
    }

    // Sort best matches overall
    results.sort((a, b) => {
      const sa = matchScore(a.symbol, a.name, q);
      const sb = matchScore(b.symbol, b.name, q);
      return sa - sb;
    });

    return NextResponse.json(
      { results: results.slice(0, limit) },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}