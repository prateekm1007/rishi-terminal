/**
 * Dashboard rankings (remediation T13).
 *
 * Pure, deterministic functions — no Date.now(), no Math.random(). The IST
 * date (for Stock of the Day) is an explicit parameter so tests can assert
 * stability. All ranks are computed from the single consensus engine via
 * lib/scoring/getStockScore over dataQuality==='OK' records only.
 */

import 'server-only';

import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/consensus/types";
import { getStockScore } from "./index";
import { calculateQvps } from "@/lib/scorers/rishiScoreV2";
import { shortFlagsFromMetrics } from "@/lib/scorers/shortFlags";
import type { StockMetrics } from "@/lib/scorers/types";
import { resolveStockMetrics } from "./index";

export interface RankedStock {
  symbol: string;
  name: string;
  sector: string;
  /** Consensus from the single engine (Rishi Merit System v1). */
  consensus: number;
  pe: number;
  roe: number;
  mktcap: number;
  rank: number;
}

/**
 * Top-N long candidates: highest consensus among dataQuality==='OK' stocks.
 * Deterministic tie-breaks: market cap (larger first), then symbol (A-Z).
 */
export function rankTopBuy(n = 6): RankedStock[] {
  return (Object.values(STOCKS) as Stock[])
    .map(s => ({ stock: s, report: getStockScore(s) }))
    .filter(({ report }) => report.dataQuality === "OK" && report.consensus !== null)
    .sort(
      (a, b) =>
        (b.report.consensus as number) - (a.report.consensus as number) ||
        b.stock.mktcap - a.stock.mktcap ||
        a.stock.symbol.localeCompare(b.stock.symbol),
    )
    .slice(0, n)
    .map(({ stock, report }, i) => ({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      consensus: report.consensus as number,
      pe: stock.pe,
      roe: stock.roe,
      mktcap: stock.mktcap,
      rank: i + 1,
    }));
}

export interface StockOfTheDay {
  symbol: string;
  name: string;
  sector: string;
  consensus: number;
  category: string;
  tag: string;
  rishi: string;
  /** Generated from the stock's actual lead-advocate data — never hardcoded. */
  why: string;
}

function istDateString(date: Date): string {
  // en-CA yields YYYY-MM-DD
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic daily selection (IST-date seed) from the top-ranked
 * qualified list. Same IST date -> same stock, everywhere.
 */
export function pickStockOfTheDay(now: Date = new Date(), poolSize = 10): StockOfTheDay {
  const ranked = rankTopBuy(poolSize);
  const fallback = ranked[0];
  if (!fallback) {
    throw new Error("No qualified stocks available for Stock of the Day");
  }
  const seed = istDateString(now);
  const pick = ranked[hashString(seed) % ranked.length];
  const stock = STOCKS[pick.symbol];
  const report = getStockScore(stock);

  return {
    symbol: pick.symbol,
    name: pick.name,
    sector: pick.sector,
    consensus: pick.consensus,
    category: report.category,
    tag: report.category,
    rishi: report.topBull.full,
    why: `${report.topBull.full} is today's lead advocate: "${report.topBull.insight}" ${report.topBull.name} scores it ${report.topBull.score}/100 on the ${report.topBull.label.toLowerCase()} framework. Panel consensus: ${pick.consensus}/100 (${report.category}) with ${report.tension.toLowerCase()} across the rishis.`,
  };
}

export interface ShortCandidate {
  symbol: string;
  name: string;
  /** QVPS short-mode score (qvps-short-v2) — validation status is rendered from the model-status contract (lib/modelStatus.ts). */
  shortScore: number;
  /** Reasons derived from the actual triggering factors, in a stable order. */
  reason: string;
  flagCount: number;
}

interface Flag {
  key: string;
  label: string;
  detail: string;
}

/**
 * Round 20: THE one Short Radar trigger-flag path (rule 14). Delegates to
 * lib/scorers/shortFlags (the single definition) with seed-record
 * semantics: in the seed dataset a 0 is a PLACEHOLDER for unknown (X6),
 * so zero-valued fields are passed as unknown and fire no flag — missing
 * data is never reinterpreted as a value (rules 3/16).
 */
export function shortFlags(s: Stock): Flag[] {
  return shortFlagsFromMetrics({
    pe: s.pe === 0 ? null : s.pe,
    revenueCAGR3Y: s.revcagr === 0 ? null : s.revcagr,
    debtToEquity: s.de === 0 ? null : s.de,
    fcfMargin: s.rev > 0 ? (s.fcf / s.rev) * 100 : null,
    promoterHolding: s.promo === 0 ? null : s.promo,
  });
}

/**
 * Registry field key -> StockMetrics key. resolveStockMetrics names its
 * provenance fields in registry vocabulary ("de", "promo", "revcagr")
 * while the QVPS metrics use model vocabulary — the mapping is explicit
 * so placeholder-nulling lands on the right metric key (round 20 v2-2).
 */
const FIELD_TO_METRIC: Record<string, keyof StockMetrics> = {
  pe: "pe",
  roe: "roe",
  roce: "roce",
  opm: "opm",
  de: "debtToEquity",
  promo: "promoterHolding",
  revcagr: "revenueCAGR3Y",
  epscagr: "epsCAGR3Y",
  mktcap: "marketCap",
  fcfMargin: "fcfMargin",
  pb: "pb",
};

/**
 * Round 20 (v2-2/v2-3): resolve a symbol through the single scoring
 * surface, null seed-placeholder zeros at the QVPS boundary (X6
 * semantics — the same rule getStockScore applies to the consensus), and
 * compute the trigger flags from those nulled metrics. The flags gate
 * candidacy AND generate the displayed rationale, so every displayed
 * warning maps to a feature that contributes to the ranking score.
 */
export function prepareShortCandidate(symbol: string): {
  symbol: string;
  name: string;
  sector: string;
  metrics: StockMetrics;
  flags: Flag[];
} | null {
  const resolved = resolveStockMetrics(symbol);
  if (!resolved) return null;

  const metrics: StockMetrics = { ...resolved.metrics };
  // A mutable view for placeholder-nulling: StockMetrics types most fields
  // as required `number`, but at the QVPS boundary a placeholder zero means
  // UNKNOWN — the scorer's null guards treat absent as no-signal.
  const mutable = metrics as unknown as Record<string, number | undefined>;
  for (const [key, field] of Object.entries(resolved.fields)) {
    const metricKey = FIELD_TO_METRIC[key];
    if (metricKey && field.source === "seed" && field.value === 0) {
      mutable[metricKey] = undefined;
    }
  }
  // pb is a mixed-source derivation (seed price / possibly-live BVPS): a
  // non-positive value means "cannot derive", never a real 0.
  if (!(metrics.pb > 0)) mutable.pb = undefined;

  return {
    symbol: resolved.symbol,
    name: resolved.name,
    sector: resolved.sector,
    metrics,
    flags: shortFlagsFromMetrics(metrics),
  };
}

/**
 * Short radar: stocks triggering >= 2 short-risk factors, ranked by the
 * QVPS short-mode score (qvps-short-v2 — the validation status is
 * rendered from lib/modelStatus.ts, never hardcoded), with reasons
 * generated from the actual triggering factors (v2-3 rationale contract).
 * Tie-breaks: more flags first, larger market cap first, symbol A-Z.
 */
export function computeShortRadar(n = 3): ShortCandidate[] {
  const candidates: ShortCandidate[] = [];

  for (const s of Object.values(STOCKS) as Stock[]) {
    const report = getStockScore(s);
    if (report.dataQuality !== "OK") continue;

    const prepared = prepareShortCandidate(s.symbol);
    if (!prepared) continue;
    if (prepared.flags.length < 2) continue;

    const qvps = calculateQvps(prepared.metrics, "SHORT");

    candidates.push({
      symbol: prepared.symbol,
      name: prepared.name,
      shortScore: qvps.finalScore,
      reason: prepared.flags.map(f => `${f.label} (${f.detail})`).join("; "),
      flagCount: prepared.flags.length,
    });
  }

  return candidates
    .sort(
      (a, b) =>
        b.shortScore - a.shortScore ||
        b.flagCount - a.flagCount ||
        (STOCKS[b.symbol]?.mktcap ?? 0) - (STOCKS[a.symbol]?.mktcap ?? 0) ||
        a.symbol.localeCompare(b.symbol),
    )
    .slice(0, n);
}
