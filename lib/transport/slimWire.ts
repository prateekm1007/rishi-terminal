// wireIndex.ts (R16 C5) — the RSC transport codec for the slim index.
//
// Why: the flight payload of /screener (2.20 MB raw / 97 kB gzip) and /lab
// (1.03 MB raw / 65 kB gzip) serialized the SAME seven verdict-metadata
// objects (name/full/label/origin) for every one of the 916 stocks —
// `full` appeared 6,412 times, `label` 6,412 times, `origin` 4,580 times
// (measured: docs/evidence/round16/c5-payload-forensics.md). RSC flight
// dedupes object REFERENCES, not repeated string values in fresh literals,
// so getSlimIndex()'s per-stock object literals duplicated everything.
//
// The codec: verdict metadata is sent ONCE as a legend; each verdict on a
// row is { m: legendIndex, score }. Decoding on the client rebuilds the
// exact SlimStockRow[] every consumer already expects — no tab, table or
// picker component changes shape. /screener and /chat do not render
// verdict summaries at all, so those pages take the narrower
// ScreenerPickerRow projection instead (what is rendered is what ships).
//
// This module MUST stay importable from client components: no
// 'server-only', no imports of slimIndex (which is server-only). The row
// SHAPE types live here and slimIndex re-exports them — one source of
// truth (Constitution 14).

export interface SlimVerdictSummary {
  name: string;
  full: string;
  label: string;
  /** null = insufficient data (T11) — rendered as an em dash. */
  score: number | null;
}

export type SlimOrigin =
  | 'Global'
  | 'India'
  | 'Bharat'
  | 'Crypto'
  | 'Commodity'
  | 'Forex/Macro';

/** Free-slice per-Rishi verdict (name/full/label/score/origin only). */
export interface SlimVerdictScore {
  name: string;
  full: string;
  label: string;
  score: number | null;
  origin: SlimOrigin;
}

/**
 * One stock's free, display-safe fields. Deliberately narrow — see the
 * slimIndex module header before adding anything.
 */
export interface SlimStockRow {
  symbol: string;
  name: string;
  sector: string;
  /** THE consensus number (free for everyone); null = insufficient data. */
  consensus: number | null;
  category: string;
  dataQuality: 'OK' | 'INCOMPLETE';
  topBull: SlimVerdictSummary | null;
  topBear: SlimVerdictSummary | null;
  /** Council tension summary (free fields, part of SanitizedConsensus). */
  tension: string;
  tensionSpread: number;
  /** Bounded per-Rishi summary slice for LIST payloads (see slimIndex). */
  summaryScores: SlimVerdictScore[];
  /** Free display / preset-filter fields (shown on every stock page). */
  pe: number;
  roe: number;
  mktcap: number;
  de: number;
  revcagr: number;
  fcf: number;
}

/**
 * What /screener and the /chat picker actually RENDER and FILTER: the flat
 * fields. Verdict summaries (topBull/topBear/summaryScores), tension and
 * fcf are not read by either surface, so they do not ship (founder
 * Round-16 C5: "slim the RSC payload to what's rendered").
 */
export interface ScreenerPickerRow {
  symbol: string;
  name: string;
  sector: string;
  consensus: number | null;
  category: string;
  dataQuality: 'OK' | 'INCOMPLETE';
  pe: number;
  roe: number;
  mktcap: number;
  de: number;
  /** SCREENER_PRESETS' minRevCAGR filter reads this. */
  revcagr: number;
}

/** Verdict metadata sent once per payload (the dedup legend). */
export interface VerdictLegendEntry {
  name: string;
  full: string;
  label: string;
  origin?: SlimOrigin;
}

/** A verdict on the wire: legend index + the per-stock score. */
export interface WireVerdict {
  m: number;
  score: number | null;
}

export interface WireSlimRow extends Omit<
  SlimStockRow,
  'topBull' | 'topBear' | 'summaryScores'
> {
  topBull: WireVerdict | null;
  topBear: WireVerdict | null;
  summaryScores: WireVerdict[];
}

export interface SlimWirePayload {
  legend: VerdictLegendEntry[];
  rows: WireSlimRow[];
}

function legendKey(entry: VerdictLegendEntry): string {
  return `${entry.name}\u0000${entry.full}\u0000${entry.label}\u0000${entry.origin ?? ''}`;
}

/** Encode the slim index for RSC transport (server side of the codec). */
export function encodeSlimIndex(rows: SlimStockRow[]): SlimWirePayload {
  const legend: VerdictLegendEntry[] = [];
  const legendIndex = new Map<string, number>();
  const intern = (entry: VerdictLegendEntry): number => {
    const key = legendKey(entry);
    let idx = legendIndex.get(key);
    if (idx === undefined) {
      idx = legend.length;
      legend.push(entry);
      legendIndex.set(key, idx);
    }
    return idx;
  };

  const wire: WireSlimRow[] = rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    consensus: row.consensus,
    category: row.category,
    dataQuality: row.dataQuality,
    tension: row.tension,
    tensionSpread: row.tensionSpread,
    topBull: row.topBull
      ? { m: intern({ name: row.topBull.name, full: row.topBull.full, label: row.topBull.label }), score: row.topBull.score }
      : null,
    topBear: row.topBear
      ? { m: intern({ name: row.topBear.name, full: row.topBear.full, label: row.topBear.label }), score: row.topBear.score }
      : null,
    summaryScores: row.summaryScores.map((s) => ({
      m: intern({ name: s.name, full: s.full, label: s.label, origin: s.origin }),
      score: s.score,
    })),
    pe: row.pe,
    roe: row.roe,
    mktcap: row.mktcap,
    de: row.de,
    revcagr: row.revcagr,
    fcf: row.fcf,
  }));

  return { legend, rows: wire };
}

/** Decode back to SlimStockRow[] (client side of the codec). The output
 *  equals the original rows key-for-key — round-trip tested. */
export function decodeSlimIndex(wire: SlimWirePayload): SlimStockRow[] {
  return wire.rows.map((row) => {
    const summary = (w: WireVerdict): SlimVerdictSummary => {
      const e = wire.legend[w.m];
      return { name: e.name, full: e.full, label: e.label, score: w.score };
    };
    const score = (w: WireVerdict): SlimVerdictScore => {
      const e = wire.legend[w.m];
      return { name: e.name, full: e.full, label: e.label, score: w.score, origin: e.origin as SlimOrigin };
    };
    return {
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
      consensus: row.consensus,
      category: row.category,
      dataQuality: row.dataQuality,
      topBull: row.topBull ? summary(row.topBull) : null,
      topBear: row.topBear ? summary(row.topBear) : null,
      tension: row.tension,
      tensionSpread: row.tensionSpread,
      summaryScores: row.summaryScores.map(score),
      pe: row.pe,
      roe: row.roe,
      mktcap: row.mktcap,
      de: row.de,
      revcagr: row.revcagr,
      fcf: row.fcf,
    };
  });
}

/** Project to what the screener and chat picker render/filter. */
export function toScreenerRows(rows: SlimStockRow[]): ScreenerPickerRow[] {
  return rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    consensus: row.consensus,
    category: row.category,
    dataQuality: row.dataQuality,
    pe: row.pe,
    roe: row.roe,
    mktcap: row.mktcap,
    de: row.de,
    revcagr: row.revcagr,
  }));
}
