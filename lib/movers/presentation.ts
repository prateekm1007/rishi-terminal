// lib/movers/presentation.ts — LIVE-TODAY (round 56): the ONE owner of
// the movers-row rendered face (Rule 14 — the component never interprets
// wording rules locally), mirroring lib/markets/sourcedRow.ts (FD-15)
// for the Today view's Top Winners / Top Losers panels.
//
// FD-15 gate, carried over verbatim in spirit: a row whose source is
// missing renders NO numbers — "no source yet" — because an unlabelled
// number supports no claim. A source that disclosed no observation time
// keeps its name with an em-dash as-of (Rule 3: missing renders as —,
// never a fabricated time).

import { STOCKS } from "@/data/stocks";
import {
  absChangeFromPercent,
  formatChangePair,
  formatIstStamp,
  sourceDisplayName,
} from "@/lib/pricePresentation";
import type { MoverRow } from "./types";

export interface MoverRowFace {
  /** The ticker as displayed (already sanitized upstream). */
  symbol: string;
  /** Registry name when tracked, else null (never a guessed name). */
  name: string | null;
  /** The stock-page link, or null for untracked symbols (no dead
   * links — the stock route 404s off-registry symbols). */
  href: string | null;
  /** "₹1,234.55" — or "—" when the source gate fails. */
  priceText: string;
  /** "▲ +4.31% (+12.20)" — or "—" when no change was disclosed. */
  changeText: string;
  /** "NSE (unofficial) · Tue 13 Oct, 15:45 IST" | "Source · —" |
   *  "no source yet". */
  attribution: string;
  /** Direction for colouring; null = neutral. */
  positive: boolean | null;
}

/** Pure: a movers row's full rendered face. */
export function moverRowFace(row: MoverRow): MoverRowFace {
  const tracked = STOCKS[row.symbol] !== undefined;
  const href = tracked ? `/stock/${encodeURIComponent(row.symbol)}` : null;

  // FD-15 gate: no source → no numbers, the founder's words.
  if (typeof row.source !== "string" || !row.source) {
    return {
      symbol: row.symbol,
      name: row.name,
      href,
      priceText: "—",
      changeText: "—",
      attribution: "no source yet",
      positive: null,
    };
  }

  const asOf =
    typeof row.observedAt === "string" && row.observedAt &&
    Number.isFinite(Date.parse(row.observedAt))
      ? formatIstStamp(new Date(Date.parse(row.observedAt)))
      : "—";
  const attribution = `${sourceDisplayName(row.source)} · ${asOf}`;

  if (!(row.price > 0) || !Number.isFinite(row.price)) {
    return { symbol: row.symbol, name: row.name, href, priceText: "—", changeText: "—", attribution, positive: null };
  }

  const priceText = "₹" + row.price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const pct = row.changePct;
  if (pct === null || !Number.isFinite(pct)) {
    return { symbol: row.symbol, name: row.name, href, priceText, changeText: "—", attribution, positive: null };
  }
  const pair = formatChangePair(pct, absChangeFromPercent(row.price, pct));
  return {
    symbol: row.symbol,
    name: row.name,
    href,
    priceText,
    changeText: `${pair.pctText} ${pair.absText}`,
    attribution,
    positive: pct >= 0,
  };
}

/** The panel-level derivation line — how the list was produced (Rule 3:
 * label data by what it is). Pure. */
export function moversDerivationLine(
  derivation: "nse" | "computed",
  universeObserved: number | null,
): string {
  if (derivation === "nse") {
    return "List: NSE live-analysis movers endpoint (unofficial).";
  }
  const n = typeof universeObserved === "number" ? universeObserved : null;
  return n === null
    ? "List: computed from the freshest cached observations (Yahoo Finance (unofficial) transport)."
    : `List: computed from this session's cached observations — ${n} tracked symbols observed (Yahoo Finance (unofficial) transport).`;
}

/** TODAY-MOVERS: the movers list's own derivation line — the list is
 *  ALWAYS the computed path (NSE's endpoint ranks only its own gainers
 *  and losers), so the disclosure says exactly that, with the observed
 *  count when the cache read produced one. Pure. */
export function moversListDerivationLine(
  moversUniverseObserved: number | null,
): string {
  const n = typeof moversUniverseObserved === "number" ? moversUniverseObserved : null;
  return n === null
    ? "Movers list: computed from the freshest cached observations (Yahoo Finance (unofficial) transport)."
    : `Movers list: computed from this session's cached observations — ${n} tracked symbols observed (Yahoo Finance (unofficial) transport).`;
}
