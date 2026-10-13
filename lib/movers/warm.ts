// lib/movers/warm.ts — LIVE-TODAY (founder order, 2026-10-13): the
// warmer's movers step. Runs INSIDE the authenticated quotes-warm tick
// (Bearer QUOTES_WARM_SECRET) after the equity slice and the ISR60
// quick set, so the dashboard's Top Winners / Top Losers panels stay
// within one minute of the market during the session.
//
// Production order (both disclosed in the warmer's response):
//   1. NSE's own movers endpoint (unofficial, the nsetools/openchart
//      contract) — the exchange's own ranking when the transport is
//      reachable from this egress;
//   2. the computed derivation from the shared quote cache — always
//      available, ranked from the freshest session observations, every
//      row keeping its own source + observed_at.
//
// A movers failure NEVER fails the warm tick (it is disclosed, not
// thrown): the tick's equity coverage is the critical path, and the
// panels honestly show the previous snapshot (each row still carrying
// its own stamps) until a later tick succeeds. `error` on a successful
// outcome carries the PRIOR path's failure (why the fallback ran) —
// operator disclosure, not a serving failure.

import { fetchNseMovers } from "./nse";
import { computeMoversFromCache } from "./compute";
import { writeMoversSnapshot } from "./store";
import { STOCKS } from "@/data/stocks";
import type { MoverRow, MoversSnapshot } from "./types";

/** The panel row count (the founder's ask: "top 5 losers and top 5
 *  winner stocks"). One constant, one derivation (Rule 14). */
export const MOVERS_LIMIT = 5;

export interface MoversWarmOutcome {
  path: "nse" | "computed" | "none";
  gainers: number;
  losers: number;
  universeObserved: number | null;
  /** null when the winning path succeeded cleanly; otherwise the
   *  prior path's failures (disclosed) or the reason nothing served. */
  error: string | null;
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Join registry names onto NSE rows (tracked symbols only; the panel
 * links exactly those). */
function withRegistryNames(rows: MoverRow[]): MoverRow[] {
  return rows.map((r) => ({ ...r, name: STOCKS[r.symbol]?.name ?? null }));
}

/**
 * One movers step: try NSE, fall back to the computed derivation, write
 * whichever won, return the disclosure. `nowMs` injectable for tests.
 */
export async function refreshMovers(nowMs: number = Date.now()): Promise<MoversWarmOutcome> {
  const priorErrors: string[] = [];

  // Path 1: NSE's own movers ranking.
  const nse = await fetchNseMovers(MOVERS_LIMIT);
  if (nse.result) {
    const snap: MoversSnapshot = {
      gainers: withRegistryNames(nse.result.gainers),
      losers: withRegistryNames(nse.result.losers),
      derivation: "nse",
      universeObserved: null,
      writtenAt: new Date(nowMs).toISOString(),
    };
    try {
      await writeMoversSnapshot(snap);
      return {
        path: "nse",
        gainers: snap.gainers.length,
        losers: snap.losers.length,
        universeObserved: null,
        error: null,
      };
    } catch (e) {
      // A store failure on the NSE rows does not justify skipping the
      // always-available derivation — fall through with the disclosure.
      priorErrors.push(`nse store write failed: ${msg(e)}`);
    }
  } else if (nse.error) {
    priorErrors.push(`nse: ${nse.error}`);
  }

  // Path 2: computed from the shared quote cache.
  const computed = await computeMoversFromCache(MOVERS_LIMIT, nowMs);
  if (computed) {
    const snap: MoversSnapshot = {
      gainers: computed.gainers,
      losers: computed.losers,
      derivation: "computed",
      universeObserved: computed.universeObserved,
      writtenAt: new Date(nowMs).toISOString(),
    };
    try {
      await writeMoversSnapshot(snap);
      return {
        path: "computed",
        gainers: snap.gainers.length,
        losers: snap.losers.length,
        universeObserved: snap.universeObserved,
        error: priorErrors.length > 0 ? priorErrors.join(" | ") : null,
      };
    } catch (e) {
      priorErrors.push(`computed store write failed: ${msg(e)}`);
    }
  } else {
    priorErrors.push("computed: quote_cache read returned nothing");
  }

  return {
    path: "none",
    gainers: 0,
    losers: 0,
    universeObserved: null,
    error: priorErrors.join(" | ") || "no derivations available",
  };
}
