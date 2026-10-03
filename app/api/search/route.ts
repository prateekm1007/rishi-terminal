import { NextRequest, NextResponse } from "next/server";
import { STOCKS } from "@/data/stocks";
import { CRYPTO_ASSETS } from "@/data/crypto";
import { COMMODITIES } from "@/data/markets";
import { FOREX_PAIRS } from "@/data/forex";
import { BONDS } from "@/data/bonds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// R11-06 (founder directive 11, Rule 14): every search candidate is
// DERIVED from the canonical registries — the same data files the detail
// pages themselves serve. The previous implementation hand-listed
// crypto/commodity/forex arrays that had already drifted from the
// registries (it advertised XRP/DOGE/SHIB and six commodities the
// platform never served, and served zero bonds despite the Category type
// promising them). A second ticker set is a loaded gun (rule 14): any
// registry change used to silently leave dead search links to pages that
// render notFound().

type Category = "stock" | "crypto" | "commodity" | "forex" | "bond";

type SearchResult = {
  symbol: string;
  name: string;
  category: Category;
  url: string;
  sector?: string;
};

/** The searchable candidates, derived once from the registries. */
const CANDIDATES: Array<{ symbol: string; name: string; category: Category; url: string; sector?: string }> = [
  ...Object.values(STOCKS).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    category: "stock" as const,
    url: `/stock/${s.symbol}`,
    sector: s.sector,
  })),
  ...CRYPTO_ASSETS.map((a) => ({
    symbol: a.symbol,
    name: a.name,
    category: "crypto" as const,
    url: `/crypto/${a.symbol}`,
  })),
  ...COMMODITIES.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    category: "commodity" as const,
    url: `/commodities/${c.symbol}`,
  })),
  ...FOREX_PAIRS.map((f) => ({
    symbol: f.symbol,
    name: f.name,
    category: "forex" as const,
    url: `/forex/${f.symbol}`,
  })),
  ...BONDS.map((b) => ({
    symbol: b.symbol,
    name: b.name,
    category: "bond" as const,
    url: `/bonds/${b.symbol}`,
  })),
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

    // R11-06: collect every registry match, THEN rank and slice. The old
    // implementation truncated per hand-listed class before sorting, so a
    // few stock name-substrings could crowd out an exact crypto/bond
    // symbol match. With 900+ candidates this is still trivially cheap and
    // exact-symbol matches always win.
    const scored: Array<{ entry: (typeof CANDIDATES)[number]; score: number }> = [];
    for (const entry of CANDIDATES) {
      const score = matchScore(entry.symbol, entry.name, q);
      if (score !== 9) scored.push({ entry, score });
    }

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      // Deterministic tiebreak: registry order is stable (categories in
      // service order, symbols within each registry's own order).
      return 0;
    });

    const results: SearchResult[] = scored.slice(0, limit).map(({ entry }) => ({
      symbol: entry.symbol,
      name: entry.name,
      category: entry.category,
      url: entry.url,
      ...(entry.sector !== undefined ? { sector: entry.sector } : {}),
    }));

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
