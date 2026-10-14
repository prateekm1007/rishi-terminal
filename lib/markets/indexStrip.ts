// lib/markets/indexStrip.ts — INDEXSTRIP (founder order, 2026-10-14,
// option (b) verbatim: "NIFTY from NSE + SENSEX from the existing BSE
// provider with 'Source: BSE' attribution"): the dashboard Today panel's
// index strip — NIFTY 50 from the NSE letter-covered index endpoint
// (letter ref NSE/MD/DATA/PERM/2026/0847 §1 covers the index quote
// endpoints under www.nseindia.com/api/), SENSEX from the APPROVED BSE
// provider's realtime index endpoint (a NEW dataset class on an APPROVED
// host — the registry row extends in the same PR, and FD-32 records the
// founder's authorization).
//
// Honesty contract (Rules 1/3/4/16, P0-2, FD-15 wording class):
//   - every row carries ITS OWN source label derived from the row's
//     `source` field — a BSE row can never read "Source: NSE";
//   - a missing number renders "—", never 0 (P0-2);
//   - a leg with no observation produces NO row — the panel renders the
//     honest per-leg empty state, never a fabricated level;
//   - observedAt is the UPSTREAM payload's own timestamp parsed to an
//     ISO instant, or null — never the fetch time; the face renders it
//     in IST or "as-of not disclosed";
//   - both upstream parsers fail closed (zod) — an unparseable payload
//     is the honest null leg (R4 trust boundary);
//   - the fetchers carry the same header profile as the existing
//     transports for the same hosts (one profile per host) and null out
//     on any failure — a dead upstream is an empty leg, not an error row.
//
// SENSEX endpoint caveat (recorded honestly): BSE's edge 403s the
// development sandbox's datacenter IP (bytes captured 2026-10-14), so the
// response shape was written from BSE's documented realtime-index surface
// with alias-tolerant fields and validates against PRODUCTION egress bytes
// in the first post-merge smoke — until then a schema mismatch fails
// closed to the empty leg (never a wrong number).

import { z } from "zod";
import { nseAllIndicesSchema } from "@/lib/validation/schemas";
import { parseNseTimestamp } from "@/lib/movers/nse";

export type IndexStripSource = "nse" | "bse";

export interface IndexStripRow {
  symbol: string;
  source: IndexStripSource;
  value: number | null;
  changePct: number | null;
  observedAt: string | null;
}

export interface IndexStripSnapshot {
  rows: IndexStripRow[];
  derivation: string;
  writtenAt: string;
}

export interface IndexLeg {
  value: number;
  changePct: number | null;
  observedAt: string | null;
}

// ── NSE leg: NIFTY 50 from /api/allIndices ──────────────────────────

/** The NIFTY 50 leg from a zod-parsed allIndices payload, or null when
 * the payload parses but carries no NIFTY 50 row (the honest miss). */
export function nseIndexLegFromAllIndices(payload: unknown): IndexLeg | null {
  const parsed = nseAllIndicesSchema.safeParse(payload);
  if (!parsed.success) return null;
  const row = (parsed.data.data ?? []).find(i => i.indexSymbol === "NIFTY 50");
  if (!row || typeof row.last !== "number" || !Number.isFinite(row.last)) return null;
  const changePct = typeof row.percentChange === "number" && Number.isFinite(row.percentChange)
    ? row.percentChange
    : null;
  const observedAt = typeof parsed.data.timestamp === "string"
    ? parseNseTimestamp(parsed.data.timestamp)
    : null;
  return { value: row.last, changePct, observedAt };
}

// ── BSE leg: SENSEX from the realtime index endpoint ────────────────

/** Comma-formatted BSE numbers ("26,742.55") parse strictly; anything
 * non-finite is the honest null. */
const bseNumber = z.union([z.number(), z.string()]).transform((v): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const s = v.trim().replace(/,/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
});

/** BSE's realtime-index surface, alias-tolerant on the numeric fields
 * (the same json?.A ?? json?.B pattern the BSE scrip-header transport
 * uses) and strict everywhere else: a payload without a usable level
 * and a parseable shape is the null leg. */
const bseRealtimeIndexSchema = z
  .object({
    IndexName: z.string().optional(),
    IndexValue: bseNumber.optional(),
    CurrVal: bseNumber.optional(),
    Ltp: bseNumber.optional(),
    PctChange: bseNumber.optional(),
    PcntChange: bseNumber.optional(),
    pChange: bseNumber.optional(),
    LastUpdated: z.string().optional(),
    lastUpdateTime: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .refine(v => v.IndexValue !== undefined || v.CurrVal !== undefined || v.Ltp !== undefined, {
    message: "no usable index level",
  });

const BSE_MONTHS: ReadonlyMap<string, number> = new Map([
  ["jan", 0], ["feb", 1], ["mar", 2], ["apr", 3], ["may", 4], ["jun", 5],
  ["jul", 6], ["aug", 7], ["sep", 8], ["oct", 9], ["nov", 10], ["dec", 11],
]);

/** BSE's timestamp ("14 Oct 2026 13:44:00", IST) as an ISO instant, or
 * null — never the fetch time. */
export function parseBseTimestamp(raw: string | undefined): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const month = BSE_MONTHS.get(m[2].toLowerCase());
  if (month === undefined) return null;
  const iso = `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4].padStart(2, "0")}:${m[5]}:${m[6] ?? "00"}+05:30`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function bseIndexLegFromRealtimeIndex(payload: unknown): IndexLeg | null {
  const parsed = bseRealtimeIndexSchema.safeParse(payload);
  if (!parsed.success) return null;
  const v = parsed.data;
  const value = v.IndexValue ?? v.CurrVal ?? v.Ltp;
  if (value === undefined || !Number.isFinite(value)) return null;
  const changePct = v.PctChange ?? v.PcntChange ?? v.pChange;
  const observedAt = parseBseTimestamp(v.LastUpdated ?? v.lastUpdateTime ?? v.timestamp);
  return {
    value,
    changePct: changePct !== undefined && Number.isFinite(changePct) ? changePct : null,
    observedAt,
  };
}

// ── Derivation ───────────────────────────────────────────────────────

/** The snapshot's fixed row order (NIFTY 50 first, SENSEX second), only
 * present legs, and the disclosed derivation line. */
export function deriveIndexStripSnapshot(
  nifty: IndexLeg | null,
  sensex: IndexLeg | null,
  writtenAt: string,
): IndexStripSnapshot {
  const rows: IndexStripRow[] = [];
  if (nifty) rows.push({ symbol: "NIFTY 50", source: "nse", ...nifty });
  if (sensex) rows.push({ symbol: "SENSEX", source: "bse", ...sensex });
  return {
    rows,
    derivation:
      "NIFTY 50 from NSE /api/allIndices (licensed, letter NSE/MD/DATA/PERM/2026/0847); " +
      "SENSEX from the BSE realtime index endpoint; per-row source and as-of stamped; " +
      "missing figures render as em dashes, never zeros",
    writtenAt,
  };
}

// ── Fetchers (one header profile per host, fail-closed nulls) ────────

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  Origin: "https://www.nseindia.com",
} as const;

const BSE_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://www.bseindia.com/",
  Accept: "application/json",
} as const;

/** NIFTY 50 from the letter-covered index endpoint. Any failure —
 * HTTP, schema, timeout — is the honest null leg. */
export async function fetchNiftyFromNse(): Promise<IndexLeg | null> {
  try {
    const res = await fetch("https://www.nseindia.com/api/allIndices", {
      signal: AbortSignal.timeout(8000),
      headers: NSE_HEADERS,
    });
    if (!res.ok) return null;
    return nseIndexLegFromAllIndices(await res.json());
  } catch {
    return null;
  }
}

/** SENSEX from BSE's realtime index endpoint (indexid 16). Any failure
 * is the honest null leg. indexid 16 = SENSEX per BSE's site surface;
 * validated against production egress bytes post-merge. */
export async function fetchSensexFromBse(): Promise<IndexLeg | null> {
  try {
    const res = await fetch(
      "https://api.bseindia.com/RealTimeBSEChartAPI/GetRealTimeIndexData?indexid=16",
      { signal: AbortSignal.timeout(6000), headers: BSE_HEADERS },
    );
    if (!res.ok) return null;
    return bseIndexLegFromRealtimeIndex(await res.json());
  } catch {
    return null;
  }
}

// ── Presentation (the face the panel renders) ────────────────────────

export interface IndexStripRowFace {
  symbol: string;
  valueText: string;
  changeText: string;
  sourceLabel: string;
  asOfText: string;
}

const SOURCE_LABELS: Record<IndexStripSource, string> = {
  nse: "Source: NSE",
  bse: "Source: BSE",
};

const LEVEL_FMT = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The row's rendered face: "—" for every missing number (P0-2), the
 * sign always explicit on a disclosed change, the source label derived
 * from the row's OWN source field, the as-of in IST or the FD-15-class
 * "as-of not disclosed". */
export function indexStripRowsFace(rows: IndexStripRow[]): IndexStripRowFace[] {
  return rows.map(r => {
    const valueText = r.value === null || !Number.isFinite(r.value) ? "—" : LEVEL_FMT.format(r.value);
    let changeText = "—";
    if (r.changePct !== null && Number.isFinite(r.changePct)) {
      changeText = `${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%`;
    }
    const asOfText = r.observedAt
      ? `${new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(r.observedAt))} IST`
      : "as-of not disclosed";
    return {
      symbol: r.symbol,
      valueText,
      changeText,
      sourceLabel: SOURCE_LABELS[r.source],
      asOfText,
    };
  });
}
