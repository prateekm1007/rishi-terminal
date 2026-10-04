// N1 (round 3): the home page is a SERVER component.
//
// All ranking calls run here, on the single engine: Top Buys, the Short
// Radar, and the deterministic IST-date Stock of the Day. The interactive
// half (ticker, live prices, hydration) lives in
// components/dashboard/DashboardClient.tsx and receives these results as
// RSC props — the 944-record seed dataset and the scoring engine never
// enter the client bundle.
//
// Y1 (Round 12): the homepage is ISR again (revalidate 60 s). The W5
// defect was the hourly-ISR bake serving an EMPTY build-time price
// snapshot as "fresh" for up to an hour after every deploy; X3 answered
// with per-request dynamic rendering, which measured on production as
// warm page TTFB p95 ~0.36 s (cache-control: no-store on every hit) —
// the opposite of the latency goal. The Y1 contract keeps both honest:
//   - the build phase fetches NOTHING (initialPriceSnapshot returns {}
//     while NEXT_PHASE marks a build — CI has no database);
//   - every ISR regeneration (at most 60 s apart, under traffic) takes
//     ONE cheap batch read of the shared quote cache (never a vendor
//     fetch) for the symbols the page renders;
//   - every value keeps its own observation-time label, and a symbol
//     with no cached observation renders the honest "price unavailable"
//     state — never "Connecting…", never a fabricated number.
//   - the IST-date daily pick stays exact (deterministic, Rule 18): a
//     60 s revalidate rotates it within a minute of IST midnight.
//   - rankings only run when the flag is on (below).
//
// U2 (founder round 7): the initial-price snapshot rides the SAME price
// path the client endpoints use (lib/dashboardSnapshot → the shared quote
// cache). The client hook hydrates from it and revalidates on mount.
// Every value keeps its own observation-time label.
//
// U4 (founder round 7): the ranked widgets (Top Buy Signals, Short Radar,
// Stock of the Day) are gated behind RANKINGS_ENABLED (lib/featureFlags,
// fail-closed). When the flag is off the ranking calls DO NOT RUN — the
// dashboard renders an honest disabled state instead of seed-derived
// rankings. FD-22.
import { rankTopBuy, computeShortRadar, pickStockOfTheDay } from '@/lib/scoring/rankings'; // T13: real rankings
import { resolveStockMetrics, getQvps } from '@/lib/scoring'; // T10: single scoring surface
import { rankingsEnabled } from '@/lib/featureFlags'; // U4: the ONE flag source
import { initialPriceSnapshot } from '@/lib/dashboardSnapshot';
import { TICKER_SYMS, TOP_CRYPTO, WORLD_MARKETS } from '@/lib/dashboardSymbols';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const revalidate = 60;

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

  // U2: the SSR snapshot covers exactly the symbols the dashboard renders —
  // the list lives in lib/dashboardSymbols (one source of truth with the
  // client component), plus the rotating rankings symbols below.
  const initialPrices = await initialPriceSnapshot([
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
