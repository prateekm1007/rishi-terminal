import { NextResponse } from "next/server";

/**
 * Phase 4B / High Priority TODO: /api/history/breadth
 * Computes a REAL rolling 30-day average breadth score (0-100).
 * Fetches 1M historical data from the local history endpoint for NIFTY, SENSEX, BANKNIFTY.
 * Cached at the edge for 12 hours.
 */
export const runtime = "edge";
// Revalidate every 12 hours (43200 seconds)
export const revalidate = 43200;

interface ChartPoint { t: number; c: number; v?: number }

export async function GET(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rishi-terminal.vercel.app";
    
    // Fetch 1M (30 days) of history for the 3 main indices
    const fetchHistory = async (symbol: string): Promise<ChartPoint[]> => {
      const url = base + '/api/history?symbol=' + symbol + '&timeframe=1M';
      const res = await fetch(url, { next: { revalidate: 43200 } });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    };

    const [nifty, sensex, bank] = await Promise.all([
      fetchHistory("NIFTY50"),
      fetchHistory("SENSEX"),
      fetchHistory("BANK_NIFTY")
    ]);

    if (!nifty.length && !sensex.length && !bank.length) {
      throw new Error("Failed to fetch historical data for indices");
    }

    // Align timestamps (group by day)
    // Map: YYYY-MM-DD -> { NIFTY: number, SENSEX: number, BANK: number }
    const dailyPrices: Record<string, { n?: number; s?: number; b?: number }> = {};
    
    const addToMap = (data: ChartPoint[], key: 'n'|'s'|'b') => {
      data.forEach(p => {
        // convert unix timestamp to YYYY-MM-DD
        const date = new Date(p.t).toISOString().split('T')[0];
        if (!dailyPrices[date]) dailyPrices[date] = {};
        dailyPrices[date][key] = p.c;
      });
    };

    addToMap(nifty, 'n');
    addToMap(sensex, 's');
    addToMap(bank, 'b');

    // Sort dates chronological
    const dates = Object.keys(dailyPrices).sort();
    
    let totalBreadth = 0;
    let validDays = 0;
    const historyPoints: { date: string; breadth: number }[] = [];

    // Calculate day-over-day changes to get breadth for each day
    for (let i = 1; i < dates.length; i++) {
      const today = dailyPrices[dates[i]];
      const yesterday = dailyPrices[dates[i-1]];

      let nChg = 0; let sChg = 0; let bChg = 0;

      if (today.n && yesterday.n) nChg = ((today.n - yesterday.n) / yesterday.n) * 100;
      if (today.s && yesterday.s) sChg = ((today.s - yesterday.s) / yesterday.s) * 100;
      if (today.b && yesterday.b) bChg = ((today.b - yesterday.b) / yesterday.b) * 100;

      // Composite day-over-day change
      const compositeChg = (nChg * 0.5) + (bChg * 0.3) + (sChg * 0.2);
      
      // Scale % move to 0-100 breadth score (same formula as live prices)
      const dailyBreadth = Math.max(0, Math.min(100, 50 + (compositeChg * 5)));
      
      totalBreadth += dailyBreadth;
      validDays++;
      historyPoints.push({ date: dates[i], breadth: Math.round(dailyBreadth * 10) / 10 });
    }

    const breadth30dAvg = validDays > 0 ? (totalBreadth / validDays) : 50;

    return NextResponse.json({
      breadth30dAvg: Math.round(breadth30dAvg * 10) / 10,
      daysSampled: validDays,
      note: "True 30-day rolling average derived from 1M historical chart data",
      history: historyPoints,
      generatedAt: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("Breadth API Error:", err);
    // Fallback: return neutral breadth
    return NextResponse.json({
      breadth30dAvg: 50,
      daysSampled: 0,
      note: "fallback — history fetch failed",
      error: err?.message ?? "unknown",
      generatedAt: new Date().toISOString()
    }, { status: 200 });
  }
}