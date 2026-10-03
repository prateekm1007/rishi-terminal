// N1 (round 3, SUPERSEDED for the price path by X3 — founder round 11): the
// home page is a SERVER component. It rendered on hourly ISR; since X3 it
// renders per request (force-dynamic) so the first byte carries the last
// cached quote on EVERY request instead of depending on a first-visitor ISR
// revalidation (the founder's live audit: "Connecting…" and "——" on every
// tile, quote_cache barely populated, hourly ISR the only filler).
//
// All ranking calls run here, on the single engine: Top Buys, the Short
// Radar, and the deterministic IST-date Stock of the Day. The interactive
// half (ticker, live prices, hydration) lives in
// components/dashboard/DashboardClient.tsx and receives these results as
// RSC props — the 944-record seed dataset and the scoring engine never
// enter the client bundle.
//
// The IST-date daily pick stays correct per request: the pick is a
// deterministic function of the IST calendar date (lib/scoring/rankings),
// so per-request rendering changes nothing about when it rotates.
//
// U2 (founder round 7) → X3: the page fetches ONE initial-price snapshot
// per request — now a READ-ONLY peek of the shared quote cache
// (lib/dashboardSnapshot.cachedPriceSnapshot → quoteCache.peekCachedQuotes:
// no refresh claims, no upstream fetches, no writes — a cheap read). The
// client hook hydrates from it and revalidates on mount through the normal
// API. Every value keeps its own observation-time label; a symbol the cache
// cannot serve is omitted and the UI says so.
//
// U4 (founder round 7): the ranked widgets (Top Buy Signals, Short Radar,
// Stock of the Day) are gated behind RANKINGS_ENABLED (lib/featureFlags,
// fail-closed). When the flag is off the ranking calls DO NOT RUN — the
// dashboard renders an honest disabled state instead of seed-derived
// rankings. FD-22.
import { rankTopBuy, computeShortRadar, pickStockOfTheDay } from '@/lib/scoring/rankings'; // T13: real rankings
import { resolveStockMetrics, getQvps } from '@/lib/scoring'; // T10: single scoring surface
import { rankingsEnabled } from '@/lib/featureFlags'; // U4: the ONE flag source
import { cachedPriceSnapshot } from '@/lib/dashboardSnapshot'; // X3: read-only cache peek
import { TICKER_SYMS, TOP_CRYPTO, WORLD_MARKETS } from '@/lib/dashboardSymbols';
import DashboardClient from '@/components/dashboard/DashboardClient';

// X3: the homepage renders per request — the first byte carries the last
// cached quote on every visit, not just after a revalidation window.
export const dynamic = 'force-dynamic';

export default async function Page() {
  // U4: the flag decides whether the ranking engine runs at all. Off → no
  // ranked picks are computed and the dashboard shows the disabled state.
  const rankings = rankingsEnabled();

  // T13: Top Buy = top-N by consensus among dataQuality==='OK' stocks,
  // deterministic tie-breaks. Shorts = actual trigger flags with reasons
  // derived from those flags, ranked by the (unvalidated) QVPS short model.
  // Stock of the Day = deterministic IST-date pick from the ranked pool.
  const rotatingStocks = rankings ? rankTopBuy(6) : [];
  const rotatingShorts = rankings ? computeShortRadar(3) : [];
  const stockOfDay = rankings ? pickStockOfTheDay() : null;

  // N1: QVPS commentary for the daily pick, computed server-side from the
  // seed baseline (labelled as the QVPS model, never "the Rishi Score").
  // Live fundamentals still hydrate the display cards client-side.
  const sodCommentary = stockOfDay
    ? (() => {
        const resolved = resolveStockMetrics(stockOfDay.symbol);
        return resolved ? getQvps(resolved, 'LONG').commentary : stockOfDay.why;
      })()
    : null;

  // X3: the SSR snapshot covers exactly the symbols the dashboard renders —
  // the list lives in lib/dashboardSymbols (one source of truth with the
  // client component), plus the rotating rankings symbols below. It is a
  // read-only peek of the shared cache per request (cheap; hermetic —
  // infrastructure failure degrades to an empty snapshot, the UI labels the
  // gap honestly).
  const initialPrices = await cachedPriceSnapshot([
    ...TICKER_SYMS,
    ...rotatingStocks.map(s => s.symbol),
    ...rotatingShorts.map(s => s.symbol),
    ...WORLD_MARKETS.map(m => m.sym),
    ...TOP_CRYPTO.map(c => c.symbol),
    ...(stockOfDay ? [stockOfDay.symbol] : []),
  ]);

  return (
    <DashboardClient
      rankingsEnabled={rankings}
      rotatingStocks={rotatingStocks}
      rotatingShorts={rotatingShorts}
      stockOfDay={stockOfDay}
      sodCommentary={sodCommentary}
      initialPrices={initialPrices}
    />
  );
}
