// N1 (round 3): the home page is a SERVER component (hourly ISR).
//
// All ranking calls run here, once per revalidation window, on the single
// engine: Top Buys, the Short Radar, and the deterministic IST-date Stock
// of the Day. The interactive half (ticker, live prices, hydration)
// lives in components/dashboard/DashboardClient.tsx and receives these
// results as RSC props — the 944-record seed dataset and the scoring
// engine never enter the client bundle.
//
// `revalidate = 3600` keeps the IST-date daily pick correct (it rotates
// within an hour after IST midnight) without making the page dynamic.
import { rankTopBuy, computeShortRadar, pickStockOfTheDay } from '@/lib/scoring/rankings'; // T13: real rankings
import { resolveStockMetrics, getQvps } from '@/lib/scoring'; // T10: single scoring surface
import DashboardClient from '@/components/dashboard/DashboardClient';

export const revalidate = 3600;

export default function Page() {
  // T13: Top Buy = top-N by consensus among dataQuality==='OK' stocks,
  // deterministic tie-breaks. Shorts = actual trigger flags with reasons
  // derived from those flags, ranked by the (unvalidated) QVPS short model.
  // Stock of the Day = deterministic IST-date pick from the ranked pool.
  const rotatingStocks = rankTopBuy(6);
  const rotatingShorts = computeShortRadar(3);
  const stockOfDay = pickStockOfTheDay();

  // N1: QVPS commentary for the daily pick, computed server-side from the
  // seed baseline (labelled as the QVPS model, never "the Rishi Score").
  // Live fundamentals still hydrate the display cards client-side.
  const resolved = resolveStockMetrics(stockOfDay.symbol);
  const sodCommentary = resolved
    ? getQvps(resolved, 'LONG').commentary
    : stockOfDay.why;

  return (
    <DashboardClient
      rotatingStocks={rotatingStocks}
      rotatingShorts={rotatingShorts}
      stockOfDay={stockOfDay}
      sodCommentary={sodCommentary}
    />
  );
}
