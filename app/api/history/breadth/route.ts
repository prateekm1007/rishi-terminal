import { NextResponse } from "next/server";

/**
 * Phase 4B / High Priority TODO: /api/history/breadth
 * Computes a REAL rolling 30-day average breadth score (0-100).
 * Fetches 1M historical data from /api/history for NIFTY50, SENSEX, BANK_NIFTY.
 * Cached 12 hours at the edge.
 */
export const runtime = "edge";

interface ChartPoint { t: number; v: number }

export async function GET() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://rishi-terminal.vercel.app";

    // Fetch 1M history for each index
    // Response from /api/history: NextResponse.json([{t, v}, ...]) or {data: [{t,v},...]}
    const fetchHistory = async (symbol: string): Promise<ChartPoint[]> => {
      try {
        const url = base + '/api/history?symbol=' + encodeURIComponent(symbol) + '&timeframe=1M';
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return [];
        const raw = await res.json();
        // Handle both raw array and wrapped {data: [...]} shapes
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        // Filter to only valid points with numeric t and v
        return arr.filter((p: any) => typeof p?.t === 'number' && typeof p?.v === 'number');
      } catch {
        return [];
      }
    };

    const [nifty, sensex, bank] = await Promise.all([
      fetchHistory('NIFTY50'),
      fetchHistory('SENSEX'),
      fetchHistory('BANK_NIFTY'),
    ]);

    // Debug: log how many points we got per symbol
    const debugInfo = {
      niftyPoints: nifty.length,
      sensexPoints: sensex.length,
      bankPoints: bank.length,
    };

    if (nifty.length === 0 && sensex.length === 0 && bank.length === 0) {
      throw new Error('All three index history fetches returned 0 points');
    }

    // Group by calendar date (YYYY-MM-DD), keeping last closing value per day per index
    const byDate: Record<string, { n?: number; s?: number; b?: number }> = {};

    const addPoints = (pts: ChartPoint[], key: 'n' | 's' | 'b') => {
      for (const p of pts) {
        // t is in milliseconds
        const ms = p.t > 1e12 ? p.t : p.t * 1000;
        const date = new Date(ms).toISOString().split('T')[0];
        if (!byDate[date]) byDate[date] = {};
        byDate[date][key] = p.v;
      }
    };

    addPoints(nifty, 'n');
    addPoints(sensex, 's');
    addPoints(bank, 'b');

    // Sort dates ascending
    const dates = Object.keys(byDate).sort();

    let totalBreadth = 0;
    let validDays = 0;
    const historyPoints: { date: string; breadth: number }[] = [];

    // Day-over-day % change → composite → breadth score
    for (let i = 1; i < dates.length; i++) {
      const tod = byDate[dates[i]];
      const yest = byDate[dates[i - 1]];

      let nChg = 0, sChg = 0, bChg = 0;
      if (tod.n && yest.n && yest.n !== 0) nChg = ((tod.n - yest.n) / yest.n) * 100;
      if (tod.s && yest.s && yest.s !== 0) sChg = ((tod.s - yest.s) / yest.s) * 100;
      if (tod.b && yest.b && yest.b !== 0) bChg = ((tod.b - yest.b) / yest.b) * 100;

      const composite = (nChg * 0.5) + (bChg * 0.3) + (sChg * 0.2);
      const dailyBreadth = Math.max(0, Math.min(100, 50 + composite * 5));

      totalBreadth += dailyBreadth;
      validDays++;
      historyPoints.push({ date: dates[i], breadth: Math.round(dailyBreadth * 10) / 10 });
    }

    const breadth30dAvg = validDays > 0 ? totalBreadth / validDays : 50;

    return NextResponse.json(
      {
        breadth30dAvg: Math.round(breadth30dAvg * 10) / 10,
        daysSampled: validDays,
        debug: debugInfo,
        note: 'True 30-day rolling average from NIFTY50+SENSEX+BANK_NIFTY 1M chart data',
        history: historyPoints,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        breadth30dAvg: 50,
        daysSampled: 0,
        note: 'fallback — history fetch failed',
        error: String(err?.message ?? err),
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}