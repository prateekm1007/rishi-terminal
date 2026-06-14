// app/api/fundamentals/route.ts
// Live fundamentals endpoint with Screener.in + Yahoo fallback
// Cache: 24 hours

import { NextRequest, NextResponse } from "next/server";
import { fetchFullFundamentals, fetchLiveQuarterly, fetchLiveShareholding } from "@/lib/liveFundamentals";
import { STOCKS } from "@/data/stocks/index";

const cache = new Map<string, { data: any; cachedAt: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function getCached(symbol: string) {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) { cache.delete(symbol); return null; }
  return entry.data;
}

function setCache(symbol: string, data: any) {
  cache.set(symbol, { data, cachedAt: Date.now() });
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const type = req.nextUrl.searchParams.get("type") || "fundamentals";

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const cacheKey = `${symbol}:${type}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true }, {
      headers: { "Cache-Control": "public, s-maxage=86400" },
    });
  }

  if (type === "quarterly") {
    const live = await fetchLiveQuarterly(symbol);
    if (live) {
      setCache(cacheKey, live);
      return NextResponse.json(live);
    }

    // Fallback: synthetic
    const stock = (STOCKS as any)[symbol];
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const revPerQ = Math.round((stock.rev || 0) * 0.25);
    const npPerQ = Math.round((stock.np || 0) * 0.25);
    const synthetic = {
      symbol,
      quarters: [
        { period: "Q3 FY24", revenue: revPerQ, netProfit: npPerQ, opm: stock.opm || 0 },
        { period: "Q2 FY24", revenue: Math.round(revPerQ * 0.96), netProfit: Math.round(npPerQ * 0.92), opm: Math.round((stock.opm || 0) * 0.98) },
        { period: "Q1 FY24", revenue: Math.round(revPerQ * 1.04), netProfit: Math.round(npPerQ * 1.08), opm: Math.round((stock.opm || 0) * 1.02) },
        { period: "Q4 FY23", revenue: revPerQ, netProfit: npPerQ, opm: Math.round((stock.opm || 0) * 0.95) },
      ],
      source: "generated",
    };
    setCache(cacheKey, synthetic);
    return NextResponse.json(synthetic);
  }

  if (type === "shareholding") {
    const live = await fetchLiveShareholding(symbol);
    if (live) {
      setCache(cacheKey, live);
      return NextResponse.json(live);
    }

    // Fallback: synthetic
    const stock = (STOCKS as any)[symbol];
    if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const promo = stock.promo || 0;
    const synthetic = {
      symbol,
      history: [
        { period: "Current", promoter: promo, fii: 25, dii: 18, public: 100 - promo - 25 - 18 },
        { period: "6M Ago", promoter: Math.max(0, promo - 1), fii: 24, dii: 17, public: 100 - Math.max(0, promo - 1) - 24 - 17 },
        { period: "1Y Ago", promoter: Math.max(0, promo - 2), fii: 22, dii: 16, public: 100 - Math.max(0, promo - 2) - 22 - 16 },
        { period: "2Y Ago", promoter: Math.max(0, promo - 4), fii: 20, dii: 15, public: 100 - Math.max(0, promo - 4) - 20 - 15 },
      ],
      source: "generated",
    };
    setCache(cacheKey, synthetic);
    return NextResponse.json(synthetic);
  }

  // Default: fundamentals
  const live = await fetchFullFundamentals(symbol);
  if (live) {
    setCache(cacheKey, live);
    return NextResponse.json(live);
  }

  // Fallback: static
  const stock = (STOCKS as any)[symbol];
  if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const staticData = {
    symbol,
    pe: stock.pe || 0,
    eps: stock.np && stock.sh ? Math.round((stock.np / stock.sh) * 100) / 100 : 0,
    marketCap: stock.mktcap || 0,
    roe: stock.roe || 0,
    roce: stock.roce || 0,
    bookValue: stock.bvps || 0,
    dividendYield: 0,
    faceValue: 10,
    debtToEquity: stock.de || 0,
    opm: stock.opm || 0,
    revCagr3y: stock.revcagr || 0,
    epsCagr: stock.epscagr || 0,
    promoterHolding: stock.promo || 0,
    fcf: 0,
    roa: 0,
    lastUpdated: new Date().toISOString(),
    source: "static",
  };
  setCache(cacheKey, staticData);
  return NextResponse.json(staticData);
}

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }

    const result: Record<string, any> = {};
    const toFetch: string[] = [];

    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      const cached = getCached(`fund:${upper}`);
      if (cached) result[upper] = { ...cached, fromCache: true };
      else toFetch.push(upper);
    }

    await Promise.allSettled(
      toFetch.map(async (sym) => {
        const live = await fetchFullFundamentals(sym);
        if (live) {
          setCache(`fund:${sym}`, live);
          result[sym] = live;
        } else {
          const stock = (STOCKS as any)[sym];
          if (stock) {
            result[sym] = {
              symbol: sym,
              pe: stock.pe ?? 0,
              eps: 0,
              marketCap: stock.mktcap ?? 0,
              roe: stock.roe ?? 0,
              roce: stock.roce ?? 0,
              bookValue: stock.bvps ?? 0,
              dividendYield: 0,
              faceValue: 10,
              debtToEquity: stock.de ?? 0,
              opm: stock.opm ?? 0,
              revCagr3y: stock.revcagr ?? 0,
              epsCagr: stock.epscagr ?? 0,
              promoterHolding: stock.promo ?? 0,
              fcf: stock.fcf ?? 0,
              roa: 0,
              lastUpdated: new Date().toISOString(),
              source: "static",
            };
          }
        }
      })
    );

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed', details: (err as Error).message }, { status: 500 });
  }
}