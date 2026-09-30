/**
 * Dashboard rankings (remediation T13).
 *
 * Pure, deterministic functions — no Date.now(), no Math.random(). The IST
 * date (for Stock of the Day) is an explicit parameter so tests can assert
 * stability. All ranks are computed from the single consensus engine via
 * lib/scoring/getStockScore over dataQuality==='OK' records only.
 */

import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/consensus/types";
import { getStockScore } from "./index";
import { calculateQvps } from "@/lib/scorers/rishiScoreV2";
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
  /** QVPS short-mode score — an unvalidated screening model, clearly labelled in the UI. */
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

function shortFlags(s: Stock): Flag[] {
  const flags: Flag[] = [];
  if (s.pe > 40) flags.push({ key: "overvalued", label: "Overvaluation", detail: `P/E ${s.pe.toFixed(1)}x above 40x` });
  if (s.revcagr < 0) flags.push({ key: "decay", label: "Revenue decay", detail: `revenue CAGR ${s.revcagr.toFixed(1)}%` });
  if (s.de > 2) flags.push({ key: "leverage", label: "High leverage", detail: `D/E ${s.de.toFixed(2)}x above 2x` });
  if (s.fcf < 0) flags.push({ key: "cash_burn", label: "Negative FCF", detail: "free cash flow is negative" });
  if (s.promo < 25) flags.push({ key: "governance", label: "Low promoter skin-in-game", detail: `promoter holding ${s.promo.toFixed(1)}%` });
  return flags;
}

/**
 * Short radar: stocks triggering >= 2 short-risk factors, ranked by the QVPS
 * short-mode score (unvalidated screening model — labelled as such in the
 * UI), with reasons generated from the actual triggering factors.
 * Tie-breaks: more flags first, larger market cap first, symbol A-Z.
 */
export function computeShortRadar(n = 3): ShortCandidate[] {
  const candidates: ShortCandidate[] = [];

  for (const s of Object.values(STOCKS) as Stock[]) {
    const report = getStockScore(s);
    if (report.dataQuality !== "OK") continue;

    const flags = shortFlags(s);
    if (flags.length < 2) continue;

    const resolved = resolveStockMetrics(s.symbol);
    if (!resolved) continue;
    const qvps = calculateQvps(resolved.metrics, "SHORT");

    candidates.push({
      symbol: s.symbol,
      name: s.name,
      shortScore: qvps.finalScore,
      reason: flags.map(f => `${f.label} (${f.detail})`).join("; "),
      flagCount: flags.length,
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
