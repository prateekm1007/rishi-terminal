// lib/movers/nse.ts — LIVE-TODAY (founder order, 2026-10-13) + NSEPERM
// (founder order, 2026-10-14: "now that we have permission"): the NSE
// market-movers fetch, ONE unofficial transport for the Top Winners /
// Top Losers panels — now formally LICENSED (letter ref
// NSE/MD/DATA/PERM/2026/0847, 13 Oct 2026, three-year term; the record
// lives in docs/evidence/round57/ and docs/DATA_SOURCES.md §row 17).
//
// Founder directive (verbatim, 13 Oct): "use Unofficial data scrapers.
// vsjha18/nsetools (MIT) retrieves data 'from the official website' …
// marketcalls/openchart (MIT) says it is not affiliated with NSE and
// uses its APIs." This module calls the SAME public NSE endpoints those
// MIT scrapers document — no GPL/AGPL code is vendored (the founder's
// list annotates those licenses; see docs/DATA_SOURCES.md §5) and no
// "personal use only" repository powers the hosted product.
//
// Endpoint contract (corrected NSEPERM 2026-10-14 to nsetools' actual
// parsing — src/nsetools/nse.py + urls.py, MIT, read as documentation):
//   https://www.nseindia.com/api/live-analysis-variations?index=gainers
//   https://www.nseindia.com/api/live-analysis-variations?index=loosers
//     (NSE's own 'loosers' spelling; 'losers' returns
//      {"data":"Missing index or key."} — captured from production
//      egress 2026-10-13, docs/evidence/round56/r56-live-today.md)
//   payload: { legends: [[key, label], …], <KEY>: { data: [rows…] }, … }
//     one row-list per index universe; nsetools reads
//     res.json()[index]['data'] with index ∈ {NIFTY, BANKNIFTY,
//     NIFTYNEXT50, SecGtr20, SecLwr20, FNO, ALL}.
//   Universe preference (deterministic, disclosed): ALL — market-wide,
//     the same scope the computed fallback ranks — then NIFTY, the
//     headline 50. The universe that served is returned for the
//     derivation line.
//
// The same domain and header profile as /api/allIndices, which the
// deployed /api/pulse/breadth already reaches from Vercel's egress
// (verified live 2026-10-13). NSE's Akamai edge 403s the development
// sandbox's datacenter IP (verified, bytes captured) — that is a
// property of the EGRESS, not the code, and the production path is
// tried honestly first with the computed fallback behind it.
//
// Honesty contract (Rules 1/3/4/16):
//   - the payload is zod-parsed (R4 trust boundary) BEFORE any field is
//     read; a mismatch fails the whole fetch → null (never partial rows);
//   - a row without BOTH a usable price and a disclosed percent change
//     is dropped — it cannot be ranked (a missing change is not 0);
//   - observedAt comes from NSE's own payload timestamp (IST,
//     "DD-Mon-YYYY HH:MM:SS") or is null when the payload carries none;
//   - symbols are sanitized to a restricted charset (Rule 9 — upstream
//     text is untrusted) and the registry supplies names only for
//     tracked symbols; untracked symbols still render (no fabricated
//     name), just without a stock-page link.

import { nseMoversResponseSchema, type NseMoverRow } from "@/lib/validation/schemas";
import type { MoverRow } from "./types";

const NSE_MOVERS_BASE = "https://www.nseindia.com/api/live-analysis-variations";

/** The direction values NSE accepts (the losers spelling is NSE's own —
 * nsetools' TOP_LOSERS_URL constant). */
type NseDirection = "gainers" | "loosers";

/** The universe keys this app reads, in deterministic preference order:
 * ALL (market-wide — scope parity with the computed fallback) before
 * NIFTY (the headline 50). Other legend keys exist in the payload and
 * pass through unread. */
const UNIVERSE_PREFERENCE = ["ALL", "NIFTY"] as const;

// The same header profile the breadth route uses against the same domain
// (its live transport works from production egress — one profile, not
// two, for the same host).
const NSE_MOVERS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  Origin: "https://www.nseindia.com",
} as const;

const FETCH_TIMEOUT_MS = 8000;

/** Sanitized NSE ticker: uppercase, restricted charset, bounded length.
 * Anything else is not a ticker we are willing to render or link. */
export function sanitizeNseSymbol(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  if (!s || s.length > 20) return null;
  return /^[A-Z0-9&.\-]+$/.test(s) ? s : null;
}

const IST_MONTHS: ReadonlyMap<string, number> = new Map([
  ["jan", 0], ["feb", 1], ["mar", 2], ["apr", 3], ["may", 4], ["jun", 5],
  ["jul", 6], ["aug", 7], ["sep", 8], ["oct", 9], ["nov", 10], ["dec", 11],
]);

/**
 * NSE's own payload timestamp ("13-Oct-2026 15:45:31", IST) as an ISO
 * string, or null when absent/unparsable — never the fetch time.
 */
export function parseNseTimestamp(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const month = IST_MONTHS.get(m[2].toLowerCase());
  if (month === undefined) return null;
  const iso = `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}:${m[6]}+05:30`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

interface UniverseBlock {
  universe: string;
  rows: NseMoverRow[];
  timestamp: string | undefined;
}

/** The legends-keyed payload's preferred universe block, or null when
 * the payload parses but carries none of the keys we read (NSE's own
 * error bodies land here — the honest miss, head disclosed upstream). */
function universeFromPayload(payload: unknown): UniverseBlock | null {
  const parsed = nseMoversResponseSchema.safeParse(payload);
  if (!parsed.success) return null;
  for (const universe of UNIVERSE_PREFERENCE) {
    const block = parsed.data[universe];
    if (block && Array.isArray(block.data)) {
      return { universe, rows: block.data, timestamp: block.timestamp ?? parsed.data.timestamp };
    }
  }
  return null;
}

/** Normalized rows from ONE zod-parsed payload, or null when no row
 * survives the honesty filters. Rank is the payload's own order. */
function rowsFromPayload(
  payload: unknown,
  kind: "gainer" | "loser",
  limit: number,
): { rows: MoverRow[]; universe: string; observedAt: string | null } | null {
  const block = universeFromPayload(payload);
  if (!block) return null;
  const observedAt = parseNseTimestamp(block.timestamp);
  const out: MoverRow[] = [];
  for (const raw of block.rows) {
    if (out.length >= limit) break;
    const symbol = sanitizeNseSymbol(raw.symbol);
    if (!symbol) continue;
    // Price: legacy `ltp` or modern `lastPrice`.
    const price = raw.ltp ?? raw.lastPrice;
    // Percent change: legacy `pChange`/`perChange` or modern `pChange`.
    // The `change`/`netPrice`/`net_price` fields are ABSOLUTE (₹) moves
    // on this endpoint family — they are NOT read as percent here
    // (misreading them was the class of bug the #400 probe hardened
    // against).
    const pct = raw.pChange ?? raw.perChange;
    // Volume: legacy `trade_quantity` or modern `totalTradedVolume`.
    const volume = raw.trade_quantity ?? raw.totalTradedVolume ?? null;
    if (price === undefined || !(price > 0)) continue;
    if (pct === undefined || !Number.isFinite(pct)) continue;
    out.push({
      kind,
      rank: out.length + 1,
      symbol,
      name: null, // the panel joins the registry server-side
      price,
      changePct: pct,
      volume: typeof volume === "number" && Number.isFinite(volume) ? volume : null,
      source: "nse-movers",
      observedAt,
    });
  }
  return out.length > 0 ? { rows: out, universe: block.universe, observedAt } : null;
}

/** Injectable fetch for tests (the real transport is global fetch). */
export type NseFetchLike = (url: string, init: RequestInit) => Promise<Response>;

async function fetchMoversList(
  direction: NseDirection,
  kind: "gainer" | "loser",
  limit: number,
  doFetch: NseFetchLike,
): Promise<{ rows: MoverRow[] | null; universe: string | null; error: string | null }> {
  const url = `${NSE_MOVERS_BASE}?index=${direction}`;
  try {
    const res = await doFetch(url, {
      headers: NSE_MOVERS_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      return { rows: null, universe: null, error: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const parsed = rowsFromPayload(body, kind, limit);
    if (!parsed) {
      // Operator-facing detail (the warmer is a Bearer-gated infra
      // endpoint and already discloses per-page ping outcomes): the zod
      // issue + a truncated payload head, so a schema drift is fixable
      // from the disclosure alone.
      const probe = nseMoversResponseSchema.safeParse(body);
      const issue = probe.success
        ? `no ${UNIVERSE_PREFERENCE.join("/")} universe with rankable rows`
        : probe.error.issues[0]?.message ?? "unknown zod issue";
      const head = JSON.stringify(body).slice(0, 200);
      return { rows: null, universe: null, error: `schema: ${issue}; payload head: ${head}` };
    }
    return { rows: parsed.rows, universe: parsed.universe, error: null };
  } catch (err) {
    return { rows: null, universe: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface NseMoversResult {
  gainers: MoverRow[];
  losers: MoverRow[];
  observedAt: string | null;
  /** The universe that served (ALL | NIFTY) — the derivation line's
   * scope disclosure. */
  universe: string;
}

/**
 * The NSE movers pair. Null result (and a disclosure string) when either
 * list fails — the caller falls back to the computed path; NOTHING is
 * served from a half-successful fetch (both lists or none: a "top
 * winners" panel next to an empty losers panel from different sources
 * would be a Rule 3 violation).
 */
export async function fetchNseMovers(
  limit: number,
  doFetch: NseFetchLike = (u, i) => fetch(u, i),
): Promise<{ result: NseMoversResult | null; error: string | null }> {
  const [g, l] = await Promise.all([
    fetchMoversList("gainers", "gainer", limit, doFetch),
    fetchMoversList("loosers", "loser", limit, doFetch),
  ]);
  if (!g.rows || !l.rows) {
    const errors = [g.error, l.error].filter(Boolean).join(" | ");
    return { result: null, error: errors || "no rows" };
  }
  const observedAt = g.rows.find((r) => r.observedAt)?.observedAt
    ?? l.rows.find((r) => r.observedAt)?.observedAt
    ?? null;
  // Both lists come from the same payload family; a universe mismatch
  // between them would be a mixed-scope serve — the gainers universe
  // wins the disclosure (it is the same preference order on both).
  return {
    result: { gainers: g.rows, losers: l.rows, observedAt, universe: g.universe ?? l.universe ?? "NIFTY" },
    error: null,
  };
}
