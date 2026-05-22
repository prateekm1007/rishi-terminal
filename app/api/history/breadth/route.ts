import { NextResponse } from "next/server";

/**
 * Phase 4B: /api/history/breadth
 * Returns a rolling 30-day average breadth score (0-100).
 * Currently derived from NIFTY50 30-day momentum heuristic.
 * Replace body with real DB/cache lookup when history store is available.
 */
export const runtime = "edge";

export async function GET() {
  try {
    // Fetch current prices to derive a momentum-based 30d avg proxy
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rishi-terminal.vercel.app";
    const res = await fetch(`${base}/api/prices`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error("prices fetch failed");
    const data = await res.json();

    const getPct = (x: any): number => {
      if (!x) return 0;
      if (typeof x.changePercent === "number") return x.changePercent;
      if (typeof x.percentChange === "number") return x.percentChange;
      if (typeof x.pChange === "number") return x.pChange;
      if (typeof x.change === "number" && typeof x.price === "number" && x.price !== 0)
        return (x.change / x.price) * 100;
      return 0;
    };

    // Use multiple indices to build a breadth composite
    const niftyChg    = getPct(data?.["NIFTY50"]);
    const bankNiftyChg = getPct(data?.["BANK_NIFTY"]);
    const sensexChg   = getPct(data?.["SENSEX"]);

    // Weight: NIFTY 50%, BANK_NIFTY 30%, SENSEX 20%
    const composite = (niftyChg * 0.5) + (bankNiftyChg * 0.3) + (sensexChg * 0.2);

    // Scale composite % move to 0-100 breadth score
    // +2% move → ~60, -2% move → ~40, flat → 50
    const breadth30dAvg = Math.max(0, Math.min(100, 50 + (composite * 5)));

    return NextResponse.json({
      breadth30dAvg: Math.round(breadth30dAvg * 10) / 10,
      composite: Math.round(composite * 100) / 100,
      inputs: { niftyChg, bankNiftyChg, sensexChg },
      note: "Phase 4B: multi-index composite proxy. Replace with real 30d history when available.",
      generatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    // Fallback: return neutral breadth
    return NextResponse.json({
      breadth30dAvg: 50,
      composite: 0,
      inputs: {},
      note: "fallback — prices fetch failed",
      error: err?.message ?? "unknown",
      generatedAt: new Date().toISOString()
    }, { status: 200 });
  }
}
