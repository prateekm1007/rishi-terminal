// Y2 (Round 12): the quote-cache WARMER — an authenticated ingest endpoint
// that refreshes the shared quote cache for the whole universe in slices,
// driven by the GitHub Actions schedule (Vercel Hobby crons run at most
// once a day — the founder's Y2 directions approve the GH workflow).
//
// Contract:
//   POST /api/ingest/quotes-warm?slice=k&of=n[&force=1]
//   Authorization: Bearer <QUOTES_WARM_SECRET>  (lib/auth/cron — fail-closed)
//
//   - `slice`/`of` partition the 916-symbol universe deterministically
//     (STOCKS key order): the caller (the workflow) fires one request per
//     slice so every invocation stays far inside the function timeout.
//     Defaults slice=0&of=1 (whole universe — for local/manual runs).
//   - ISR60 (founder round-55, 13 Oct): `rotate=1` — the slice for THIS
//     tick is the UTC minute-of-hour modulo `of`. The production pg_cron
//     job fires every minute with rotate=1&of=15, so the whole universe
//     sweeps every 15 minutes at the SAME upstream volume as the retired
//     6-slices-per-tick command (896 fetches / 15 min), spread evenly —
//     and the quick set (below) refreshes every 60 seconds. rotate and
//     an explicit slice are mutually exclusive (400): a caller asking
//     for both has a broken command; refuse, do not guess.
//   - ISR60 quick set: quotePath.quickRefreshSymbols (the probe symbols
//     + the demo-path proposal) is warmed on EVERY invocation, then each
//     of its stock pages is revalidated (revalidatePath) and re-rendered
//     by a same-tick self-ping, so the served HTML for those pages
//     updates within 60 seconds — the founder's order, and the fix for
//     the 13 Oct /stock/SBIN sighting (age 1591, observation 29 min old
//     in an open session). Per-page ping outcomes are DISCLOSED in the
//     response; a failed ping is reported, never counted as refreshed.
//   - Market-hours gate: outside the NSE session (Mon-Fri 09:15-15:30 IST,
//     marketState's own contract — no second clock) the endpoint NO-OPS
//     honestly: 200 + { skipped: "market closed", ... }. `force=1` (same
//     Bearer secret) overrides for off-hours verification runs — the
//     acceptance battery must be reproducible on weekends.
//   - The refresh itself goes through cachedQuoteBatchForEquities — the
//     EXISTING claim mechanism (advisory locks, 60 s transport cache,
//     ledger) — never a naked fetch. Rows the upstream has nothing for
//     are honest misses in the report.
//   - Non-equity tiles (indexes, crypto, gold — Y2's tile extension) warm
//     through the same shared cache via serveQuote (cachedQuote with the
//     canonical fetchLivePrice refresher): a small fixed set, one point
//     fetch each, slice 0 only.
//
// No writes happen outside quote_cache's own path; no auth exists for
// callers other than the CRON_SECRET bearer (Rule 6/12 — the warmer is an
// infra path, not a user surface).

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireQuotesWarmAuth } from "@/lib/auth/cron";
import { marketState } from "@/lib/marketHours";
import { STOCKS } from "@/data/stocks";
import { logIngestion } from "@/lib/services/ingestion";
import {
  cachedQuoteBatchForEquities,
  nonEquityTileSymbols,
  quickRefreshSymbols,
  serveQuote,
} from "@/lib/quotePath";
import { refreshMovers } from "@/lib/movers/warm";
import { refreshVerdicts } from "@/lib/verdicts/warm"; // TODAY-VERDICTS: the verdicts-ledger step

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseSlice(req: NextRequest): { slice: number; of: number } {
  const of = Math.max(1, Math.min(64, Number(req.nextUrl.searchParams.get("of")) || 1));
  const slice = Math.max(0, Math.min(of - 1, Number(req.nextUrl.searchParams.get("slice")) || 0));
  return { slice, of };
}

/** ISR60: the rotating slice — the UTC minute-of-hour modulo `of`, so a
 * minute-cadence scheduler sweeps the universe deterministically without
 * carrying a tick counter between stateless invocations. */
function rotateSlice(of: number): number {
  return new Date().getUTCMinutes() % of;
}

export async function POST(req: NextRequest) {
  const denied = requireQuotesWarmAuth(req);
  if (denied) return denied;

  const force = req.nextUrl.searchParams.get("force") === "1";
  const rotate = req.nextUrl.searchParams.get("rotate") === "1";
  const explicitSlice = req.nextUrl.searchParams.get("slice") !== null;
  if (rotate && explicitSlice) {
    // Fail closed (Rule 6): rotate derives the slice from the clock; an
    // explicit slice in the same call is a broken caller command — refuse
    // rather than guess which one was meant.
    return NextResponse.json(
      {
        error: "rotate and slice are mutually exclusive — rotate derives the slice from the UTC minute; fix the caller command",
      },
      { status: 400 },
    );
  }
  const ms = marketState();
  if (!ms.open && !force) {
    // G6: an off-session no-op ingests nothing, so it logs nothing — a
    // zero-records "ingestion" row would keep the health price signal
    // green through a weekend of no-ops (Rule 3: label data by what it
    // is; the staleness SLO is allowed to decay over long closures).
    return NextResponse.json({
      warmed: 0,
      skipped: "market closed",
      market: ms,
      note: "no-op outside the NSE session (Mon-Fri 09:15-15:30 IST); force=1 with the same Bearer secret overrides for verification runs",
    });
  }

  const started_at = new Date().toISOString();

  const universe = Object.keys(STOCKS);
  const parsed = parseSlice(req);
  const { of } = parsed;
  const slice = rotate ? rotateSlice(of) : parsed.slice;
  const mine = universe.filter((_, i) => i % of === slice);

  // Equity slice: the existing claim+bulk path, chunked so one slice's
  // wall time stays bounded even when the whole universe is stale.
  //
  // Y2 follow-up (Rule 2 — names describe behavior): the report now
  // separates an UPSTREAM WRITE (the claim winner fetched + upserted a
  // row: state "stale-revalidated" / tile status LIVE) from a cache SERVE
  // ("fresh" / "stale-served" — the row existed and no upstream call was
  // made, which is the correct closed-market behavior). Counting serves
  // as "refreshed" made the intraday coverage evidence uninterpretable.
  const CHUNK = 60;
  let upstreamWrites = 0;
  let served = 0;
  let misses = 0;
  for (let i = 0; i < mine.length; i += CHUNK) {
    const chunk = mine.slice(i, i + CHUNK);
    const r = await cachedQuoteBatchForEquities(chunk);
    for (const sym of chunk) {
      const entry = r.quotes[sym];
      if (entry && entry.quote) {
        served++;
        if (entry.state === "stale-revalidated") upstreamWrites++;
      } else {
        misses++;
      }
    }
  }

  // Non-equity tiles ride slice 0 only (small fixed set, no partitioning).
  // The set itself is quotePath.nonEquityTileSymbols — the SAME derivation
  // /api/health counts as its coverage denominator (Rule 14).
  let tileWrites = 0;
  let tilesServed = 0;
  let tileMisses = 0;
  if (slice === 0) {
    for (const sym of nonEquityTileSymbols()) {
      const q = await serveQuote(sym);
      if (q) {
        tilesServed++;
        // serveQuote maps a this-request revalidation to status LIVE.
        if (q.status === "LIVE") tileWrites++;
      } else {
        tileMisses++;
      }
    }
  }

  // ── ISR60: the quick set — warmed EVERY tick, then its stock pages are
  // revalidated and re-rendered within this same tick. The self-ping is
  // the "next visit" revalidatePath needs (Next 16 route-handler
  // semantics: the revalidation happens on the next visit to the path),
  // so the ISR cache for these pages is re-baked on the warmer's own
  // request — a visitor always hits a page at most one tick (~60 s) old
  // during market hours. The origin comes from the request the scheduler
  // made (req.nextUrl.origin) so the ping lands on this deployment's
  // public URL, not a loopback the CDN would not serve.
  const quick = quickRefreshSymbols().filter((s) => s in STOCKS);
  let quickUpstreamWrites = 0;
  let quickServed = 0;
  let quickMisses = 0;
  if (quick.length > 0) {
    const r = await cachedQuoteBatchForEquities(quick);
    for (const sym of quick) {
      const entry = r.quotes[sym];
      if (entry && entry.quote) {
        quickServed++;
        if (entry.state === "stale-revalidated") quickUpstreamWrites++;
      } else {
        quickMisses++;
      }
    }
  }

  // Revalidate + re-render each quick-set page. Outcomes are disclosed
  // per page (HTTP status, or the transport error string) — a failed
  // ping is never counted as a refresh (Rule 3: label data by what it
  // is). The pings run in parallel; each is bounded by the fetch's own
  // abort so one slow page cannot eat the whole tick.
  //
  // LIVE-TODAY (round 56): the homepage joins the ping set — the Today
  // view's Top Winners / Top Losers panels ride the same 60-second
  // regeneration contract as the quick-set stock pages, so the
  // dashboard never serves a movers list older than one tick during
  // the session.
  const pageOutcomes: Record<string, number | string> = {};
  let pagesRendered = 0;
  const revalidatePaths: string[] = [];
  if (quick.length > 0) {
    for (const sym of quick) {
      revalidatePaths.push(`/stock/${sym}`);
    }
  }
  revalidatePaths.push("/");
  for (const p of revalidatePaths) {
    revalidatePath(p);
  }
  const pingTargets: string[] = [
    ...quick.map((sym) => `/stock/${encodeURIComponent(sym)}`),
    "/",
  ];
  if (pingTargets.length > 0) {
    const origin = req.nextUrl.origin;
    const pingOne = async (path: string): Promise<void> => {
      try {
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 20_000);
        try {
          const res = await fetch(`${origin}${path}`, {
            cache: "no-store",
            signal: abort.signal,
          });
          pageOutcomes[path] = res.status;
          if (res.status === 200) pagesRendered++;
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        pageOutcomes[path] = err instanceof Error ? err.message : String(err);
      }
    };
    await Promise.all(pingTargets.map(pingOne));
  }

  // ── LIVE-TODAY: the movers step — Top Winners / Top Losers for the
  // dashboard's Today view. NSE's own movers endpoint first (unofficial,
  // the nsetools/openchart contract), the quote-cache computation as the
  // always-available fallback; whichever won is written to market_movers
  // (migration 033) and DISCLOSED here. A failure never fails the tick
  // (the equity coverage above is the critical path); the panels keep
  // serving the previous snapshot with its own stamps until a later
  // tick succeeds.
  const moversOutcome = await refreshMovers();

  // ── TODAY-VERDICTS: the verdicts step — produces Rishi verdicts on
  // LIVE fundamentals for the disclosed candidate set (TODAY-NIFTY: the
  // set derives from NSE's OWN Nifty-50 constituent list — fetched once
  // per IST day, cached in verdicts_meta; the founder-confirmed five
  // are the floor any honest miss serves), through the SAME scoring
  // surface the stock page runs (the P0-1 gate refuses seed-mixed
  // records upstream). Screener.in primary — with the balance-sheet D/E
  // derivation and the shareholding-table promoter fallback — Yahoo+NSE
  // fallback. Produced verdicts + their day-0 baselines are written to
  // verdicts_produced (migration 036) and DISCLOSED here. A candidate
  // that already produced today is NOT re-fetched (fundamentals move
  // quarterly — the (symbol, ist_date) key is the TTL); a candidate
  // that refused within its reason-classed retry window is skipped
  // (verdicts_refused, migration 037 — the coverage-expansion guard);
  // `force` re-produces for the operator's acceptance run. A failure
  // never fails the tick (the same class as the movers step).
  const verdictsOutcome = await refreshVerdicts({ force });

  // G6 (round 23): this slice IS a price ingestion — record it so
  // /api/health's price signal tracks the REAL freshness mechanism (the
  // pg_cron warmer) instead of a job name nothing writes. records_out
  // counts upstream WRITES only (fresh-cache serves prove the cache is
  // current but are not new data); misses make the row "partial" — the
  // log must not imply complete coverage. The off-session no-op path
  // above deliberately does NOT log (nothing was ingested). ISR60: the
  // quick set's writes and misses are folded into the same row — one
  // ingestion per tick, whatever it warmed.
  const totalMisses = misses + quickMisses + (slice === 0 ? tileMisses : 0);
  await logIngestion({
    job_name: "quotes_warm",
    status: totalMisses > 0 ? "partial" : "success",
    records_out: upstreamWrites + quickUpstreamWrites + (slice === 0 ? tileWrites : 0),
    source: "quotes-cache-warmer",
    started_at,
  });

  return NextResponse.json({
    slice,
    of,
    rotated: rotate,
    universe: universe.length,
    inSlice: mine.length,
    equities: { upstreamWrites, served, misses },
    tiles: slice === 0 ? { upstreamWrites: tileWrites, served: tilesServed, misses: tileMisses } : { skipped: "non-zero slice" },
    isr60: {
      quick: { upstreamWrites: quickUpstreamWrites, served: quickServed, misses: quickMisses },
      revalidated: revalidatePaths.length,
      pagesRendered,
      pages: pageOutcomes,
    },
    movers: moversOutcome,
    verdicts: verdictsOutcome,
    market: ms,
    forced: force && !ms.open,
  });
}
