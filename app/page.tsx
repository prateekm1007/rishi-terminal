// N1 (round 3): the home page is a SERVER component.
//
// All ranking calls run here, on the single engine: Top Buys, the Short
// Radar, and the deterministic IST-date Stock of the Day. The interactive
// half (ticker, price hydration, live overlays) lives in
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
import { initialPriceSnapshot, isBuildPhase } from '@/lib/dashboardSnapshot';
import { readMoversSnapshot } from '@/lib/movers/store'; // LIVE-TODAY: the Top Winners / Top Losers snapshot
import { readVerdictsToday, readTrackingState } from '@/lib/verdicts/store'; // TODAY-VERDICTS: the verdicts ledger + the tracking state (one read each, the same cache-read class)
import { rankVerdictTopBuy, rankVerdictShortRadar } from '@/lib/verdicts/rank'; // TODAY-NIFTY: the ledger-sourced panel rankings
import { aggregateLiveNews } from '@/lib/news/server'; // TODAY-MOVERS: the ONE live-news source (the /api/news route shares it)
import { TodayPanel, type TodayLatestNews } from '@/components/dashboard/TodayPanel'; // DEMO-4 + LIVE-TODAY + TODAY-MOVERS: the honest Today view (server component, zero JS)
import { TICKER_SYMS, TOP_CRYPTO, WORLD_MARKETS } from '@/lib/dashboardSymbols';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { dashboard, dashboard2 } from '@/messages/en.json';

// X4 (Round 11): this page's dictionary namespaces are imported on the
// server and handed to the client tree via <NamespaceProvider> — they ride
// the streamed flight payload instead of the blocking JS chunks, and the
// dashboard carries only its own strings (the shell namespaces every route
// needs come from the root layout's shell prop).

export const revalidate = 60;

// TODAY-VERDICTS: the ISR generation clock — the same sanctioned
// helper pattern the stock page uses (P0, Round 52): the helper body
// keeps the react-compiler impure-call rule (a CLIENT render purity
// guard) from misfiring on a server component's once-per-generation
// clock read, which the verdicts ledger's today-slice read needs.
function isrRenderClock(): number {
  return Date.now();
}

export default async function Page() {
  // U4: the flag decides whether the ranking engine runs at all. Off → no
  // ranked picks are computed and the dashboard shows the disabled state.
  const rankings = rankingsEnabled();

  // T13: Top Buy = top-N by consensus among verdict-allowed stocks (P0-1:
  // getStockScore nulls every seed/missing consensus, so the null filter
  // is the verdict gate), deterministic tie-breaks. Shorts = actual
  // trigger flags with reasons derived from those flags, ranked by the
  // (unvalidated) QVPS short model. Stock of the Day = deterministic
  // IST-date pick from the ranked pool — null (the honest disabled panel)
  // when no verdict-allowed record exists.
  const rotatingStocks = rankings ? rankTopBuy(6) : [];
  const rotatingShorts = rankings ? computeShortRadar(3) : [];
  const stockOfDay = rankings ? pickStockOfTheDay() : null;

  // N1: QVPS commentary for the daily pick, computed server-side from the
  // seed baseline (labelled as the QVPS model, never "the Rishi Score").
  // Live fundamentals still hydrate the display cards client-side.
  const sodCommentary = stockOfDay
    ? (() => {
        const resolved = resolveStockMetrics(stockOfDay.symbol);
        return resolved ? getQvps(resolved, 'UPSIDE').commentary : stockOfDay.why;
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

  // LIVE-TODAY: the movers snapshot — ONE cheap read of market_movers
  // (migration 033), the same cache-read class as initialPriceSnapshot:
  // never a vendor fetch in the render path (the Y1 contract), and the
  // build phase fetches NOTHING (prerender stays hermetic — the panel
  // renders its honest not-generated state until the first ISR
  // regeneration after a warmer tick).
  const movers = isBuildPhase() ? null : await readMoversSnapshot();

  // TODAY-VERDICTS: the verdicts ledger's today slice + the calibration
  // track's state — ONE cheap read each (migration 036), the same
  // cache-read class as readMoversSnapshot: never a vendor fetch in the
  // render path (the Y1 contract), and the build phase fetches NOTHING
  // (prerender stays hermetic — both rows render their honest empty
  // state until the first ISR regeneration after a warmer tick).
  const verdicts = isBuildPhase() ? null : await readVerdictsToday(isrRenderClock());
  const tracking = isBuildPhase() ? null : await readTrackingState();

  // TODAY-NIFTY (founder order, 2026-10-14: "eventually rank 'Top Buy
  // Signals / Short Radar' from the verdicts ledger as coverage
  // grows"): the two ranked panels rank TODAY'S produced verdicts when
  // the day's pool reaches the coverage gate (the registry path above
  // stays the seed-gated engine it is — its pools are honestly empty,
  // which is what the awaiting copy disclosed until now). The same ONE
  // ledger read the Today row uses — no second query, no vendor fetch.
  const verdictBuy = rankVerdictTopBuy(verdicts, 6);
  const verdictShorts = rankVerdictShortRadar(verdicts, 3);

  // TODAY-MOVERS (founder order, 2026-10-13): the Today panel's news row
  // renders the live aggregation's ACTUAL state (the same ONE source the
  // /api/news route serves). Build stays hermetic: no RSS fetch during
  // prerender (CI has no upstream network) — the honest empty wording
  // covers the build bake.
  const latestNews: TodayLatestNews | null = isBuildPhase()
    ? null
    : await aggregateLiveNews().then(items =>
        items[0]
          ? { headline: items[0].headline, source: items[0].source, minutesAgo: items[0].minutesAgo }
          : null,
      );

  return (
    <NamespaceProvider ns={{ dashboard, dashboard2 }}>
      <TodayPanel movers={movers} latestNews={latestNews} verdicts={verdicts} tracking={tracking} />
      <DashboardClient
        rankingsEnabled={rankings}
        rotatingStocks={rotatingStocks}
        rotatingShorts={rotatingShorts}
        stockOfDay={stockOfDay}
        sodCommentary={sodCommentary}
        verdictBuy={verdictBuy}
        verdictShorts={verdictShorts}
        initialPrices={initialPrices}
      />
    </NamespaceProvider>
  );
}
