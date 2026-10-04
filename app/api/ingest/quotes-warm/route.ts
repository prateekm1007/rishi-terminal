// Y2 (Round 12): the quote-cache WARMER — an authenticated ingest endpoint
// that refreshes the shared quote cache for the whole universe in slices,
// driven by the GitHub Actions schedule (Vercel Hobby crons run at most
// once a day — the founder's Y2 directions approve the GH workflow).
//
// Contract:
//   POST /api/ingest/quotes-warm?slice=k&of=n[&force=1]
//   Authorization: Bearer <CRON_SECRET>          (lib/auth/cron — fail-closed)
//
//   - `slice`/`of` partition the 916-symbol universe deterministically
//     (STOCKS key order): the caller (the workflow) fires one request per
//     slice so every invocation stays far inside the function timeout.
//     Defaults slice=0&of=1 (whole universe — for local/manual runs).
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
import { requireCronAuth } from "@/lib/auth/cron";
import { marketState } from "@/lib/marketHours";
import { STOCKS } from "@/data/stocks";
import {
  cachedQuoteBatchForEquities,
  nonEquityTileSymbols,
  serveQuote,
} from "@/lib/quotePath";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseSlice(req: NextRequest): { slice: number; of: number } {
  const of = Math.max(1, Math.min(64, Number(req.nextUrl.searchParams.get("of")) || 1));
  const slice = Math.max(0, Math.min(of - 1, Number(req.nextUrl.searchParams.get("slice")) || 0));
  return { slice, of };
}

export async function POST(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const force = req.nextUrl.searchParams.get("force") === "1";
  const ms = marketState();
  if (!ms.open && !force) {
    return NextResponse.json({
      warmed: 0,
      skipped: "market closed",
      market: ms,
      note: "no-op outside the NSE session (Mon-Fri 09:15-15:30 IST); force=1 with the same Bearer secret overrides for verification runs",
    });
  }

  const universe = Object.keys(STOCKS);
  const { slice, of } = parseSlice(req);
  const mine = universe.filter((_, i) => i % of === slice);

  // Equity slice: the existing claim+bulk path, chunked so one slice's
  // wall time stays bounded even when the whole universe is stale.
  const CHUNK = 60;
  let refreshed = 0;
  let misses = 0;
  for (let i = 0; i < mine.length; i += CHUNK) {
    const chunk = mine.slice(i, i + CHUNK);
    const r = await cachedQuoteBatchForEquities(chunk);
    for (const sym of chunk) {
      const q = r.quotes[sym];
      if (q && q.quote) refreshed++;
      else misses++;
    }
  }

  // Non-equity tiles ride slice 0 only (small fixed set, no partitioning).
  // The set itself is quotePath.nonEquityTileSymbols — the SAME derivation
  // /api/health counts as its coverage denominator (Rule 14).
  let tiles = 0;
  let tileMisses = 0;
  if (slice === 0) {
    for (const sym of nonEquityTileSymbols()) {
      const q = await serveQuote(sym);
      if (q) tiles++;
      else tileMisses++;
    }
  }

  return NextResponse.json({
    slice,
    of,
    universe: universe.length,
    inSlice: mine.length,
    equities: { refreshed, misses },
    tiles: slice === 0 ? { warmed: tiles, misses: tileMisses } : { skipped: "non-zero slice" },
    market: ms,
    forced: force && !ms.open,
  });
}
