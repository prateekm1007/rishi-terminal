import { NextResponse } from "next/server";

/**
 * Phase 4B: /api/history/breadth
 * TRUE 30-day rolling average breadth score (0-100).
 * Calls /api/history which returns { symbol, tf, source, points: [{t,v},...] }
 * Uses nodejs runtime to call the internal nodejs history route.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChartPoint { t: number; v: number }

async function fetchHistory1M(base: string, symbol: string): Promise<ChartPoint[]> {
  try {
    const url = base + '/api/history?symbol=' + encodeURIComponent(symbol) + '&timeframe=1M';
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.error('[breadth] history fetch failed for', symbol, res.status);
      return [];
    }
    const raw = await res.json();

    // Response shape: { symbol, tf, source, points: [{t, v}, ...] }
    // Also handle fallback shapes just in case
    let arr: any[] = [];
    if (Array.isArray(raw?.points))      arr = raw.points;   // PRIMARY
    else if (Array.isArray(raw?.data))   arr = raw.data;     // fallback
    else if (Array.isArray(raw))         arr = raw;          // fallback

    // Filter valid numeric points
    return arr.filter(
      (p: any) => typeof p?.t === 'number' && typeof p?.v === 'number' && Number.isFinite(p.v)
    ) as ChartPoint[];
  } catch (err) {
    console.error('[breadth] fetchHistory1M exception for', symbol, String(err));
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://rishi-terminal.vercel.app';

    const [nifty, sensex, bank] = await Promise.all([
      fetchHistory1M(base, 'NIFTY50'),
      fetchHistory1M(base, 'SENSEX'),
      fetchHistory1M(base, 'BANK_NIFTY'),
    ]);

    const debugInfo = {
      niftyPoints:  nifty.length,
      sensexPoints: sensex.length,
      bankPoints:   bank.length,
    };

    if (nifty.length === 0 && sensex.length === 0 && bank.length === 0) {
      throw new Error('All three history fetches returned 0 points. Check /api/history endpoint.');
    }

    // Group by calendar date YYYY-MM-DD
    const byDate: Record<string, { n?: number; s?: number; b?: number }> = {};

    const addPoints = (pts: ChartPoint[], key: 'n' | 's' | 'b') => {
      for (const p of pts) {
        // t may be ms or seconds; Yahoo returns ms from our history route
        const ms   = p.t > 1e12 ? p.t : p.t * 1000;
        const date = new Date(ms).toISOString().split('T')[0];
        if (!byDate[date]) byDate[date] = {};
        byDate[date][key] = p.v;
      }
    };

    addPoints(nifty,  'n');
    addPoints(sensex, 's');
    addPoints(bank,   'b');

    const dates = Object.keys(byDate).sort();

    let totalBreadth = 0;
    let validDays    = 0;
    const historyPoints: { date: string; breadth: number }[] = [];

    for (let i = 1; i < dates.length; i++) {
      const tod  = byDate[dates[i]];
      const yest = byDate[dates[i - 1]];

      let nChg = 0, sChg = 0, bChg = 0;
      if (tod.n && yest.n && yest.n !== 0) nChg = ((tod.n - yest.n) / yest.n) * 100;
      if (tod.s && yest.s && yest.s !== 0) sChg = ((tod.s - yest.s) / yest.s) * 100;
      if (tod.b && yest.b && yest.b !== 0) bChg = ((tod.b - yest.b) / yest.b) * 100;

      const composite    = nChg * 0.5 + bChg * 0.3 + sChg * 0.2;
      const dailyBreadth = Math.max(0, Math.min(100, 50 + composite * 5));

      totalBreadth += dailyBreadth;
      validDays++;
      historyPoints.push({ date: dates[i], breadth: Math.round(dailyBreadth * 10) / 10 });
    }

    const breadth30dAvg = validDays > 0 ? totalBreadth / validDays : 50;

    return NextResponse.json(
      {
        breadth30dAvg: Math.round(breadth30dAvg * 10) / 10,
        daysSampled:   validDays,
        debug:         debugInfo,
        note:          'True 30-day rolling average — NIFTY50+SENSEX+BANK_NIFTY 1M daily closes',
        history:       historyPoints,
        generatedAt:   new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600' },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        breadth30dAvg: 50,
        daysSampled:   0,
        note:          'fallback — history fetch failed',
        error:         String(err?.message ?? err),
        generatedAt:   new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}